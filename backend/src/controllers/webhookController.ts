import { speechToText } from "../services/groqSpeechService";
import HealthRecord from "../models/HealthRecord";
import {
  validateCandidateRecord,
  resolveRecordedAt,
  isValueSupportedByMessage,
  findUnresolvedPlausibleNumbers,
} from "../utils/healthRecordParser";
import axios from "axios";
import fs from "fs";
import path from "path";
import { extractHealthData } from "../services/openaiService";
import { Request, Response } from "express";
import { findEnrolledPatientByWhatsApp } from "../utils/phoneHelper";
import { MOCK_RECORDS } from "./patientController";
import {
  getPendingClarification,
  setPendingClarification,
  clearPendingClarification,
  completePendingClarification,
  cancelPendingClarification,
  PendingClarification,
} from "../services/pendingClarificationService";
import { PARAMETER_REGISTRY } from "../utils/parameterRegistry";
import { CandidateRecord, GlucoseContext, MessageIntent } from "../utils/intelligenceContract";

// Simple in-memory cache for processed/processing message IDs to prevent duplicate webhook delivery/processing.
const processingMessageIds = new Set<string>();
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 10000;

function markMessageAsProcessed(messageId: string) {
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const oldest = processedMessageIds.values().next().value;
    if (oldest !== undefined) {
      processedMessageIds.delete(oldest);
    }
  }
}

// Helper to clear deduplication cache (useful for automated testing)
export const clearWebhookDeduplicationCache = () => {
  processingMessageIds.clear();
  processedMessageIds.clear();
};

// Meta Webhook Verification
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("✅ Webhook Verified Successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

// Helper to detect user language style
export function detectLanguageStyle(text: string): "english" | "hindi" | "hinglish" {
  const clean = text.toLowerCase();
  if (/[\u0900-\u097F]/.test(text)) {
    return "hindi";
  }
  const hinglishWords = [
    "hai", "thi", "tha", "mer", "mera", "meri", "ko", "ki", "ka", "pehle", "baad", "aur", "hota", "bata", "bataiye", "liya", "diye", "gaya", "gayi", "ho", "aaj", "kal", "subah", "dopahar", "shaam", "raat", "chal", "kya", "sath", "se", "rehne", "do", "kabhi"
  ];
  const words = clean.split(/\s+/);
  const hasHinglish = words.some(w => hinglishWords.includes(w));
  if (hasHinglish) {
    return "hinglish";
  }
  return "english";
}

// Resolve language style with fallback to detection
export function resolveLanguageStyle(msg: string, aiLanguage?: string): string {
  if (aiLanguage && aiLanguage !== "unknown") {
    return aiLanguage;
  }
  return detectLanguageStyle(msg);
}

const FRIENDLY_NAMES: Record<string, { english: string; hindi: string; hinglish: string }> = {
  blood_sugar: { english: "Sugar", hindi: "शुगर", hinglish: "Sugar" },
  blood_pressure: { english: "BP", hindi: "बीपी", hinglish: "BP" },
  heart_rate: { english: "Pulse", hindi: "पल्स", hinglish: "Pulse" },
  oxygen_saturation: { english: "SpO2", hindi: "ऑक्सीजन", hinglish: "Oxygen" },
  body_temperature: { english: "Temperature", hindi: "तापमान", hinglish: "Temperature" },
  weight: { english: "Weight", hindi: "वजन", hinglish: "Weight" },
  respiratory_rate: { english: "Respiratory rate", hindi: "सांस की गति", hinglish: "Respiratory rate" },
  height: { english: "Height", hindi: "कद", hinglish: "Height" },
};

export function formatNaturalConfirmation(records: any[], lang: string): string {
  if (records.length === 0) return "Done 👍";

  const formattedItems = records.map(r => {
    const nameObj = FRIENDLY_NAMES[r.parameter] || { english: r.parameter, hindi: r.parameter, hinglish: r.parameter };
    const name = lang === "hindi" ? nameObj.hindi : (lang === "hinglish" ? nameObj.hinglish : nameObj.english);
    const unit = r.unit || PARAMETER_REGISTRY[r.parameter]?.defaultUnit || "";

    let contextStr = "";
    if (r.parameter === "blood_sugar" && r.context) {
      if (lang === "hindi") {
        const ctxMap: any = { fasting: "खाली पेट", pre_meal: "खाने से पहले", post_meal: "खाने के बाद", random: "कभी भी" };
        contextStr = ` (${ctxMap[r.context] || r.context})`;
      } else if (lang === "hinglish") {
        const ctxMap: any = { fasting: "Fasting", pre_meal: "Khane se pehle", post_meal: "Khane ke baad", random: "Random" };
        contextStr = ` (${ctxMap[r.context] || r.context})`;
      } else {
        const ctxMap: any = { fasting: "Fasting", pre_meal: "Before meal", post_meal: "After meal", random: "Random" };
        contextStr = ` (${ctxMap[r.context] || r.context})`;
      }
    }

    return `${name} ${r.value} ${unit}${contextStr}`;
  });

  if (lang === "hindi") {
    if (formattedItems.length === 1) {
      const suffix = records[0].parameter === "blood_sugar" ? "सेव हो गई।" : "सेव हो गया।";
      return `Done 👍 ${formattedItems[0]} ${suffix} (saved successfully.)`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} और ${last} सेव हो गए। (saved successfully.)`;
    }
  } else if (lang === "hinglish") {
    if (formattedItems.length === 1) {
      const suffix = records[0].parameter === "blood_sugar" ? "save ho gayi." : "save ho gaya.";
      return `Done 👍 ${formattedItems[0]} ${suffix} (saved successfully.)`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} aur ${last} save ho gaye. (saved successfully.)`;
    }
  } else {
    if (formattedItems.length === 1) {
      return `Done 👍 ${formattedItems[0]} saved successfully.`;
    } else {
      const last = formattedItems.pop();
      return `Done 👍 ${formattedItems.join(", ")} and ${last} saved successfully.`;
    }
  }
}

export function getUnresolvedClarificationMessage(
  unresolved: number[],
  savedSummary: string,
  lang: string
): string {
  const numStr = unresolved.join(", ");
  if (lang === "hindi") {
    const prefix = savedSummary ? `${savedSummary} नोट कर लिया 👍 ` : "";
    return `${prefix}${numStr} किसकी रीडिंग है — शुगर, पल्स या कुछ और?`;
  } else if (lang === "hinglish") {
    const prefix = savedSummary ? `${savedSummary} note kar liya 👍 ` : "";
    return `${prefix}${numStr} kiski reading hai — sugar, pulse ya kuch aur?`;
  } else {
    const prefix = savedSummary ? `${savedSummary} saved 👍 ` : "";
    return `${prefix}What does ${numStr} represent — sugar, pulse, or something else?`;
  }
}

async function processMessageFlow(
  message: string,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date,
  pendingToResolve?: any
) {
  const extractedData = await extractHealthData(message);
  console.log("🧠 Extracted Health Record:");
  console.log(extractedData);

  let action = "RECORD";
  let missingFields: string[] = [];
  let language = "english";
  let candidateRecords: CandidateRecord[] = [];
  let reason = "";
  let aiUnresolved: number[] = [];
  let intent: MessageIntent = "health_measurement";

  try {
    const parsedAI = JSON.parse(extractedData);
    if (parsedAI) {
      if (parsedAI.action) action = parsedAI.action;
      if (parsedAI.intent) intent = parsedAI.intent;
      if (Array.isArray(parsedAI.missingFields)) missingFields = parsedAI.missingFields;
      if (parsedAI.language) language = parsedAI.language;
      if (Array.isArray(parsedAI.candidateRecords)) candidateRecords = parsedAI.candidateRecords;
      if (parsedAI.reason) reason = parsedAI.reason;
      if (Array.isArray(parsedAI.unresolvedMeasurements)) aiUnresolved = parsedAI.unresolvedMeasurements;
    }
  } catch (e) {
    // Handled gracefully
  }

  // Find unresolved measurements using deterministic rules combined with AI
  const detUnresolved = findUnresolvedPlausibleNumbers(message, candidateRecords);
  const unresolvedMeasurements = Array.from(new Set([...aiUnresolved, ...detUnresolved]));

  const completeCandidates: CandidateRecord[] = [];
  const incompleteCandidates: CandidateRecord[] = [];

  for (const item of candidateRecords) {
    const isSugarIncomplete = item.parameter === "blood_sugar" && (
      missingFields.includes("glucose_context") ||
      item.context === "unknown" ||
      (action === "CLARIFY" && !item.context)
    );

    const isBpIncomplete = item.parameter === "blood_pressure" && (
      missingFields.includes("diastolic") ||
      missingFields.includes("systolic") ||
      (action === "CLARIFY" && (item.systolic === undefined || item.diastolic === undefined))
    );

    const isTempIncomplete = item.parameter === "body_temperature" && (
      missingFields.includes("temperature_unit") ||
      item.unit === "unknown" ||
      (action === "CLARIFY" && !item.unit)
    );

    if (isSugarIncomplete || isBpIncomplete || isTempIncomplete) {
      incompleteCandidates.push(item);
    } else {
      // Complete! Run deterministic validation
      if (validateCandidateRecord(item, message)) {
        completeCandidates.push(item);
      } else {
        console.log(`[Parser] Deterministic validation failed for candidate:`, item);
      }
    }
  }

  // Resolve active language
  const resolvedLang = resolveLanguageStyle(message, language);

  // Determine the correct WhatsApp Message ID and Message Date for saving
  const origMsgId = pendingToResolve ? pendingToResolve.originalWhatsappMessageId : whatsappMessageId;
  const origMsgDate = pendingToResolve ? pendingToResolve.originalMessageDate : messageDate;

  // Prepare records to save
  const recordsToSave: any[] = [];
  const paramCounts: Record<string, number> = {};

  for (const item of completeCandidates) {
    const resolvedVal =
      item.parameter === "blood_pressure"
        ? `${item.systolic}/${item.diastolic}`
        : Number(item.value);

    const param = item.parameter;
    const occurrence = paramCounts[param] || 0;
    paramCounts[param] = occurrence + 1;

    const suffix = occurrence === 0
      ? `${origMsgId}_${param}`
      : `${origMsgId}_${param}_idx${occurrence}`;

    recordsToSave.push({
      patientId: patient.patientId,
      parameter: item.parameter,
      value: resolvedVal,
      unit: item.unit ?? PARAMETER_REGISTRY[item.parameter]?.defaultUnit ?? "",
      context: item.context || undefined,
      recordedAt: resolveRecordedAt(message, item.recordedAt as string | null, origMsgDate),
      source: "text",
      confidence: item.confidence ?? 0.99,
      originalMessage: pendingToResolve ? pendingToResolve.originalSourceText : message,
      whatsappMessageId: suffix,
      hospitalId: patient.hospitalId,
    });
  }

  // Save complete records that aren't already saved
  const newlySavedRecords: any[] = [];
  for (const rPayload of recordsToSave) {
    let existingRecord = null;
    if (process.env.USE_MOCK_DATA === "true") {
      for (const pId in MOCK_RECORDS) {
        const match = MOCK_RECORDS[pId].find(
          (r: any) => r.whatsappMessageId === rPayload.whatsappMessageId
        );
        if (match) {
          existingRecord = match;
          break;
        }
      }
    } else {
      existingRecord = await HealthRecord.findOne({
        whatsappMessageId: rPayload.whatsappMessageId,
      });
    }

    if (existingRecord) {
      console.log("⚠️ Duplicate Record Skipped:", rPayload.parameter);
      continue;
    }

    if (process.env.USE_MOCK_DATA === "true") {
      if (!MOCK_RECORDS[rPayload.patientId]) {
        MOCK_RECORDS[rPayload.patientId] = [];
      }
      MOCK_RECORDS[rPayload.patientId].push(rPayload);
    } else {
      await HealthRecord.create(rPayload);
    }
    newlySavedRecords.push(rPayload);
    console.log("✅ Saved complete candidate:", rPayload.parameter);
  }

  // Determine what pending state should be
  if (incompleteCandidates.length > 0 || unresolvedMeasurements.length > 0) {
    // Save/update pending clarification
    setPendingClarification(patient.patientId, {
      patientId: patient.patientId,
      hospitalId: patient.hospitalId,
      originalWhatsappMessageId: origMsgId,
      originalSourceText: pendingToResolve ? pendingToResolve.originalSourceText : message,
      language: resolvedLang,
      candidateRecords: incompleteCandidates,
      missingFields,
      unresolvedMeasurements,
      clarificationReason: reason,
      originalMessageDate: origMsgDate,
    });

    // Send clarification message
    if (unresolvedMeasurements.length > 0) {
      // If there are unresolved numbers, ask about them
      const savedSummary = newlySavedRecords.length > 0
        ? newlySavedRecords.map(r => {
            const nameObj = FRIENDLY_NAMES[r.parameter] || { english: r.parameter, hindi: r.parameter, hinglish: r.parameter };
            const name = resolvedLang === "hindi" ? nameObj.hindi : (resolvedLang === "hinglish" ? nameObj.hinglish : nameObj.english);
            return `${r.value} ${name}`;
          }).join(" aur ")
        : "";
      const clarifMsg = getUnresolvedClarificationMessage(unresolvedMeasurements, savedSummary, resolvedLang);
      await sendWhatsAppMessage(from, clarifMsg);
      console.log(`❓ Clarification requested for unresolved measurements: ${unresolvedMeasurements.join(", ")}`);
    } else {
      // Ask clarification for the first incomplete candidate
      const firstIncomplete = incompleteCandidates[0];
      const clarifMsg = getClarificationMessage(
        firstIncomplete.parameter,
        resolvedLang,
        firstIncomplete.value
      );
      await sendWhatsAppMessage(from, clarifMsg);
      console.log(`❓ Clarification requested for incomplete candidate: ${firstIncomplete.parameter}`);
    }
  } else {
    // No incomplete or unresolved left!
    if (pendingToResolve) {
      completePendingClarification(patient.patientId);
      clearPendingClarification(patient.patientId);
    }

    if (newlySavedRecords.length > 0) {
      const successMsg = formatNaturalConfirmation(newlySavedRecords, resolvedLang);
      await sendWhatsAppMessage(from, successMsg);
      console.log("✅ Confirmation sent:", successMsg);
    } else {
      // If nothing saved and no pending clarification, could be IGNORE
      if (action === "IGNORE" || intent === "conversational") {
        await sendWhatsAppMessage(
          from,
          "ℹ️ Message received. Conversational updates are not recorded as health entries."
        );
        console.log("ℹ️ Conversational message ignored for record persistence.");
      } else {
        await sendWhatsAppMessage(
          from,
          "❌ Unable to understand your health record."
        );
        console.log("❌ Invalid Health Record");
      }
    }
  }
}

function hasUnrelatedParameterKeywords(msg: string, requestedParam: string): boolean {
  const clean = msg.toLowerCase();

  // Define keyword maps for other parameters
  const keywordsMap: Record<string, string[]> = {
    blood_sugar: ["sugar", "glucose", "sugar level", "shugar", "cheeni", "schugar"],
    blood_pressure: ["bp", "blood pressure", "pressure", "systolic", "diastolic"],
    heart_rate: ["pulse", "heart rate", "hr", "bpm", "dhadkan", "dil", "beat"],
    oxygen_saturation: ["oxygen", "spo2", "o2", "saturation", "oxigen"],
    body_temperature: ["temp", "temperature", "fever", "body temp", "bukhar", "bukhaar", "tapman"],
    weight: ["weight", "vajan", "wajan", "kg", "vazan"],
    respiratory_rate: ["breath", "resp", "respiratory", "saans"],
    height: ["height", "lambai"]
  };

  for (const param in keywordsMap) {
    if (param !== requestedParam) {
      const keywords = keywordsMap[param];
      if (keywords.some(kw => clean.includes(kw))) {
        return true;
      }
    }
  }
  return false;
}

function isGreetingMessage(msg: string): boolean {
  const clean = msg.toLowerCase().trim();
  const greetings = [
    "thank you", "thanks", "shukriya", "dhanyawad", "dhanyavaad",
    "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
    "namaste", "namaskar", "pranam", "bye", "goodbye", "rehne do", "cancel"
  ];
  return greetings.some(g => clean === g || clean.startsWith(g + " ") || clean.endsWith(" " + g));
}

// Receive WhatsApp Messages
export const receiveMessage = async (req: Request, res: Response) => {
  console.log("📩 Incoming Webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    // A. Check if this is a WhatsApp status event (sent, delivered, read)
    const isStatusEvent = !!value?.statuses?.[0];
    if (isStatusEvent) {
      console.log("ℹ️ WhatsApp Status Event received, skipping processing.");
      return res.sendStatus(200);
    }

    const incomingMessage = value?.messages?.[0];
    const whatsappMessageId = incomingMessage?.id;

    let message = incomingMessage?.text?.body;
    const from = incomingMessage?.from;

    const audioId = incomingMessage?.audio?.id;
    const messageType = incomingMessage?.type;

    // Extract timestamp from incomingMessage to preserve precision
    let messageDate = new Date();
    if (incomingMessage?.timestamp) {
      const tsSec = parseInt(incomingMessage.timestamp, 10);
      if (!isNaN(tsSec)) {
        // WhatsApp timestamp is in seconds, JavaScript Date needs milliseconds
        messageDate = new Date(tsSec * 1000);
      }
    }

    // B. Check for duplicate messages using whatsappMessageId
    if (whatsappMessageId) {
      if (processingMessageIds.has(whatsappMessageId)) {
        console.log(`⏳ Message is already being processed (concurrent duplicate): ${whatsappMessageId}`);
        return res.sendStatus(200);
      }

      if (processedMessageIds.has(whatsappMessageId)) {
        console.log(`⚠️ Message has already been processed (cached duplicate): ${whatsappMessageId}`);
        return res.sendStatus(200);
      }

      let existsInDb = false;
      if (process.env.USE_MOCK_DATA === "true") {
        for (const pId in MOCK_RECORDS) {
          const match = MOCK_RECORDS[pId].find(
            (r: any) => r.whatsappMessageId === whatsappMessageId
          );
          if (match) {
            existsInDb = true;
            break;
          }
        }
      } else {
        const record = await HealthRecord.findOne({ whatsappMessageId }, { _id: 1 });
        if (record) {
          existsInDb = true;
        }
      }

      if (existsInDb) {
        console.log(`⚠️ Message has already been processed (DB duplicate): ${whatsappMessageId}`);
        markMessageAsProcessed(whatsappMessageId);
        return res.sendStatus(200);
      }

      // Mark as currently processing
      processingMessageIds.add(whatsappMessageId);
    }

    try {
      // ==========================
      // Voice Message
      // ==========================
      if (messageType === "audio" && audioId && from) {
        console.log("🎤 Voice Message Received");

        const filePath = await downloadWhatsAppAudio(audioId);

        console.log("📁 Audio Saved:", filePath);

        message = await speechToText(filePath);

        console.log("📝 Transcript:");
        console.log(message);
      }

      // ==========================
      // Common Pipeline (Text + Voice)
      // ==========================
      if (message && from) {
        console.log("👤 User:", message);

        // Resolve WhatsApp sender to an enrolled patient user (fail safely if not found or ambiguous)
        const patient = await findEnrolledPatientByWhatsApp(from);
        if (!patient) {
          // Safe fail. Preserve normal webhook acknowledgement behavior (200 OK)
          return res.sendStatus(200);
        }

        const pending = getPendingClarification(patient.patientId);

        if (pending) {
          // Check for cancel command
          if (isCancelCommand(message)) {
            cancelPendingClarification(patient.patientId);
            clearPendingClarification(patient.patientId);
            await sendWhatsAppMessage(from, "❌ Clarification cancelled.");
            if (whatsappMessageId) {
              markMessageAsProcessed(whatsappMessageId);
            }
            return res.sendStatus(200);
          }

          // 1. Run AI extraction on the follow-up message first to check for context hijack or conversational bypass
          const incomingData = await extractHealthData(message);
          let incomingAI: any = {};
          try { incomingAI = JSON.parse(incomingData); } catch (e) {}

          const pendingParams = new Set([
            ...pending.candidateRecords.map(r => r.parameter),
            ...(pending.unresolvedMeasurements && pending.unresolvedMeasurements.length > 0
              ? ["blood_sugar", "blood_pressure", "heart_rate", "oxygen_saturation", "body_temperature", "weight", "respiratory_rate", "height"]
              : [])
          ]);

          console.log("DEBUG hijack check:", {
            incomingAI,
            pendingParams: Array.from(pendingParams)
          });
          const isConversationalBypass = (incomingAI.action === "IGNORE" || incomingAI.intent === "conversational") && isGreetingMessage(message);
          const hijack = incomingAI.candidateRecords?.some((r: any) => {
            return !pendingParams.has(r.parameter);
          }) || isConversationalBypass;
          console.log("DEBUG hijack check result:", hijack);

          if (hijack) {
            console.log("⚠️ Context hijack / conversational bypass detected. Clearing pending clarification bypassed to preserve old pending state.");
            // Process the follow-up message as a fresh message
            await processMessageFlow(message, patient, from, whatsappMessageId, messageDate);
          } else {
            // 2. No hijack detected. Attempt deterministic field resolution (highest priority context resolution)
            let consumed = false;
            const glucoseCandidate = pending.candidateRecords.find(r => r.parameter === "blood_sugar");
            const bpCandidate = pending.candidateRecords.find(r => r.parameter === "blood_pressure");
            const tempCandidate = pending.candidateRecords.find(r => r.parameter === "body_temperature");

            if (glucoseCandidate && pending.missingFields.includes("glucose_context")) {
              if (!hasUnrelatedParameterKeywords(message, "blood_sugar")) {
                const context = parseGlucoseContext(message);
                if (context) {
                  consumed = true;
                  const newValue = extractGlucoseNumber(message);
                  if (newValue !== null) {
                    glucoseCandidate.value = newValue;
                  }
                  glucoseCandidate.context = context;

                  const records = parseMergedHealthRecords(pending, glucoseCandidate, "blood_sugar", message, whatsappMessageId, messageDate);
                  await saveAndAcknowledgeRecords(records, patient, from, pending);
                }
              }
            } else if (bpCandidate && pending.missingFields.includes("diastolic")) {
              if (!hasUnrelatedParameterKeywords(message, "blood_pressure")) {
                const diastolic = extractDiastolicNumber(message);
                if (diastolic !== null) {
                  consumed = true;
                  bpCandidate.diastolic = diastolic;

                  const records = parseMergedHealthRecords(pending, bpCandidate, "blood_pressure", message, whatsappMessageId, messageDate);
                  await saveAndAcknowledgeRecords(records, patient, from, pending);
                }
              }
            } else if (tempCandidate && pending.missingFields.includes("temperature_unit")) {
              if (!hasUnrelatedParameterKeywords(message, "body_temperature")) {
                const unit = parseTemperatureUnit(message);
                if (unit) {
                  consumed = true;
                  tempCandidate.unit = unit;

                  const newValue = extractTemperatureNumber(message);
                  if (newValue !== null) {
                    tempCandidate.value = newValue;
                  }

                  // Handle conversion from Fahrenheit to Celsius if unit is °F
                  if (unit === "°F" && tempCandidate.value !== undefined) {
                    const valNum = Number(tempCandidate.value);
                    if (valNum > 50) {
                      tempCandidate.value = parseFloat(((valNum - 32) * 5 / 9).toFixed(1));
                      tempCandidate.unit = "°C";
                    }
                  }

                  const records = parseMergedHealthRecords(pending, tempCandidate, "body_temperature", message, whatsappMessageId, messageDate);
                  await saveAndAcknowledgeRecords(records, patient, from, pending);
                }
              }
            }

            if (consumed) {
              if (whatsappMessageId) {
                markMessageAsProcessed(whatsappMessageId);
              }
              return res.sendStatus(200);
            }

            // 3. Not resolved deterministically. Proceed to progressive / follow-up resolution: merge message with original source text
            const combinedMessage = `${pending.originalSourceText} ${message}`;
            console.log(`🔄 Processing combined clarification message: "${combinedMessage}"`);
            await processMessageFlow(combinedMessage, patient, from, whatsappMessageId, messageDate, pending);
          }
        } else {
          // Fresh message flow
          await processMessageFlow(message, patient, from, whatsappMessageId, messageDate);
        }
      }

      if (whatsappMessageId) {
        markMessageAsProcessed(whatsappMessageId);
      }
    } finally {
      if (whatsappMessageId) {
        processingMessageIds.delete(whatsappMessageId);
      }
    }
  } catch (err) {
    console.error(err);
  }

  res.sendStatus(200);
};

// ==========================
// Helpers
// ==========================

export function isCancelCommand(msg: string): boolean {
  const clean = msg.trim().toLowerCase();
  const cancelPhrases = [
    "cancel",
    "ignore",
    "rehne do",
    "छोड़ दो",
    "rehne-do",
    "rehnedo",
    "chhodo",
    "chhod do",
  ];
  return cancelPhrases.includes(clean);
}

export function parseGlucoseContext(msg: string): GlucoseContext | null {
  const clean = msg.toLowerCase().trim();

  // Fasting
  if (
    clean.includes("fasting") ||
    clean.includes("khali pet") ||
    clean.includes("खाली पेट") ||
    clean === "fast" ||
    clean === "fating" ||
    clean === "fastg"
  ) {
    return "fasting";
  }

  // Pre-meal
  if (
    clean.includes("before food") ||
    clean.includes("before breakfast") ||
    clean.includes("before lunch") ||
    clean.includes("before dinner") ||
    clean.includes("before meal") ||
    clean.includes("pre-meal") ||
    clean.includes("pre_meal") ||
    clean.includes("premeal") ||
    clean.includes("khane se pehle") ||
    clean.includes("खाने से पहले")
  ) {
    return "pre_meal";
  }

  // Post-meal
  if (
    clean.includes("after food") ||
    clean.includes("after breakfast") ||
    clean.includes("after lunch") ||
    clean.includes("after dinner") ||
    clean.includes("after meal") ||
    clean.includes("post-meal") ||
    clean.includes("post_meal") ||
    clean.includes("postmeal") ||
    clean.includes("khane ke baad") ||
    clean.includes("खाने के बाद") ||
    clean.includes("2 hours after meal")
  ) {
    return "post_meal";
  }

  // Random
  if (
    clean.includes("random") ||
    clean.includes("random tha") ||
    clean.includes("रैंडम")
  ) {
    return "random";
  }

  return null;
}

export function extractDiastolicNumber(msg: string): number | null {
  const numbers = msg.match(/\b\d+\b/g);
  if (numbers && numbers.length > 0) {
    for (const numStr of numbers) {
      const val = parseInt(numStr, 10);
      if (val >= 30 && val <= 150) {
        return val;
      }
    }
  }
  return null;
}

export function parseTemperatureUnit(msg: string): "°C" | "°F" | null {
  const clean = msg.toLowerCase().trim();
  if (
    clean === "c" ||
    clean === "celsius" ||
    clean === "celcius" ||
    clean.includes("°c")
  ) {
    return "°C";
  }
  if (
    clean === "f" ||
    clean === "fahrenheit" ||
    clean === "farenheit" ||
    clean.includes("°f")
  ) {
    return "°F";
  }
  return null;
}

export function extractGlucoseNumber(msg: string): number | null {
  const numbers = msg.match(/\b\d+\b/g);
  if (numbers && numbers.length > 0) {
    for (const numStr of numbers) {
      const val = parseInt(numStr, 10);
      if (val >= 40 && val <= 500) {
        return val;
      }
    }
  }
  return null;
}

export function extractTemperatureNumber(msg: string): number | null {
  const numbers = msg.match(/\b\d+(?:\.\d+)?\b/g);
  if (numbers && numbers.length > 0) {
    for (const numStr of numbers) {
      const val = parseFloat(numStr);
      if (val >= 30 && val <= 110) {
        return val;
      }
    }
  }
  return null;
}

export function getClarificationMessage(
  parameter: string,
  language: string,
  candidateValue?: any
): string {
  const lang = (language || "english").toLowerCase();
  const val = candidateValue !== undefined ? candidateValue : "";

  if (parameter === "blood_sugar") {
    const displayVal = val ? `${val} ` : "";
    if (lang === "hindi") {
      return `${displayVal}sugar note kar loon 👍 बस बताइए — यह शुगर रीडिंग खाली पेट, खाने से पहले, खाने के बाद या रैंडम थी?`;
    } else if (lang === "hinglish") {
      return `${displayVal}sugar note kar loon 👍 Bas bata dijiye — Ye sugar reading fasting, khane se pehle, khane ke baad, ya random thi?`;
    } else {
      return `Got it — sugar is ${val || "noted"}. Was this glucose reading fasting, before a meal, after a meal, or random?`;
    }
  }

  if (parameter === "blood_pressure") {
    if (lang === "hindi") {
      return `बीपी ${val ? val + " " : ""}नोट कर लिया 👍 दूसरा (डायस्टोलिक) नंबर क्या है? कृपया रक्तचाप का दूसरा (डायस्टोलिक) नंबर भी बताएं, जैसे 140/90।`;
    } else if (lang === "hinglish") {
      return `BP ${val ? val + " " : ""}note kar liya 👍 Doosra (diastolic) number kya hai? BP ka doosra (diastolic) number bhi batayein, jaise 140/90.`;
    } else {
      return `Got it — BP systolic is ${val || "noted"}. Please provide the second (diastolic) BP number, like 140/90.`;
    }
  }

  if (parameter === "body_temperature") {
    const tVal = val || "38";
    if (lang === "hindi") {
      return `तापमान ${tVal} नोट कर लूँ 👍 बस बताइए — °C है या °F? क्या तापमान ${tVal} °C था या °F?`;
    } else if (lang === "hinglish") {
      return `Temperature ${tVal} note kar loon 👍 Bas bata dijiye — °C hai ya °F? Temperature ${tVal} °C tha ya °F?`;
    } else {
      return `Got it — temperature is ${tVal}. Was the temperature ${tVal} °C or °F?`;
    }
  }

  return "Please clarify: missing details.";
}

function parseMergedHealthRecords(
  pending: PendingClarification,
  completedCandidate: CandidateRecord,
  parameter: string,
  followUpMessage: string,
  whatsappMessageId: string,
  messageDate?: Date
): any[] {
  const combinedMessage = `${pending.originalSourceText} ${followUpMessage}`;

  const isValid = validateCandidateRecord(completedCandidate, combinedMessage);
  if (!isValid) {
    console.warn(`[Validation Error] Deterministic validation failed for merged candidate.`);
    return [];
  }

  const originalRecordedAt = resolveRecordedAt(
    pending.originalSourceText,
    completedCandidate.recordedAt as string | null | undefined,
    pending.originalMessageDate
  );

  const resolvedVal =
    parameter === "blood_pressure"
      ? `${completedCandidate.systolic}/${completedCandidate.diastolic}`
      : Number(completedCandidate.value);

  const record: any = {
    patientId: pending.patientId,
    parameter,
    value: resolvedVal,
    unit: completedCandidate.unit ?? PARAMETER_REGISTRY[parameter]?.defaultUnit ?? "",
    context: completedCandidate.context || undefined,
    recordedAt: originalRecordedAt,
    source: "text",
    confidence: completedCandidate.confidence ?? 0.99,
    originalMessage: pending.originalSourceText,
    whatsappMessageId: `${pending.originalWhatsappMessageId}_${parameter}`,
  };

  return [record];
}

async function saveAndAcknowledgeRecords(
  records: any[],
  patient: any,
  from: string,
  pending: PendingClarification
) {
  if (records.length > 0) {
    const savedRecords: any[] = [];
    for (const record of records) {
      const recordPayload: any = {
        ...record,
        hospitalId: patient.hospitalId,
      };

      // Duplicate Check
      let existingRecord = null;
      if (process.env.USE_MOCK_DATA === "true") {
        for (const pId in MOCK_RECORDS) {
          const match = MOCK_RECORDS[pId].find(
            (r: any) => r.whatsappMessageId === recordPayload.whatsappMessageId
          );
          if (match) {
            existingRecord = match;
            break;
          }
        }
      } else {
        existingRecord = await HealthRecord.findOne({
          whatsappMessageId: recordPayload.whatsappMessageId,
        });
      }

      if (existingRecord) {
        console.log("⚠️ Duplicate Record Skipped in merge save:", recordPayload.parameter);
        continue;
      }

      if (process.env.USE_MOCK_DATA === "true") {
        if (!MOCK_RECORDS[recordPayload.patientId]) {
          MOCK_RECORDS[recordPayload.patientId] = [];
        }
        MOCK_RECORDS[recordPayload.patientId].push(recordPayload);
      } else {
        await HealthRecord.create(recordPayload);
      }
      savedRecords.push(recordPayload);
      console.log("✅ Saved merged record:", recordPayload.parameter);
    }

    completePendingClarification(patient.patientId);
    clearPendingClarification(patient.patientId);

    if (savedRecords.length > 0) {
      const resolvedLang = pending.language || "english";
      const successMsg = formatNaturalConfirmation(savedRecords, resolvedLang);
      await sendWhatsAppMessage(from, successMsg);
      console.log("✅ Confirmation sent:", successMsg);
    }
  } else {
    // If validation fails (e.g. AI hallucinated value rejected), clear state & let user know
    clearPendingClarification(patient.patientId);
    await sendWhatsAppMessage(
      from,
      "❌ Unable to save. The validated health reading was invalid or not supported by text."
    );
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err?.message || err);
  }
}

// =========================
// Download WhatsApp Audio
// =========================
async function downloadWhatsAppAudio(mediaId: string) {
  console.log("📥 Downloading Media ID:", mediaId);
  // Step 1 - Get Media URL
  const mediaResponse = await axios.get(
    `https://graph.facebook.com/v23.0/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    }
  );

  const mediaUrl = mediaResponse.data.url;

  // Step 2 - Download Audio
  const audioResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
  });

  // Step 3 - Create uploads folder if not exists
  const folder = path.join(process.cwd(), "uploads");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  // Step 4 - Save Audio
  const filePath = path.join(folder, `${mediaId}.ogg`);

  fs.writeFileSync(filePath, audioResponse.data);

  console.log("🎤 Voice Downloaded:", filePath);

  return filePath;
}
