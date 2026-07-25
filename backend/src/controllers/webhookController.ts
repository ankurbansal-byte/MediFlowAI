import { speechToText } from "../services/groqSpeechService";
import HealthRecord from "../models/HealthRecord";
import {
  validateCandidateRecord,
  resolveRecordedAt,
  isValueSupportedByMessage,
  findUnresolvedPlausibleNumbers,
  deterministicExtract,
  parseGlucoseContext,
  detectLanguageStyle,
  isCorrectionMessage,
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

import {
  LanguageStyle,
  formatConfirmation,
  getGlucoseContextClarification,
  getBloodPressureClarification,
  getBodyTemperatureClarification,
  getUnresolvedMeasurementsClarification,
  getMissingDetailsClarification,
  getCancellationAcknowledgement,
  getGenericFailureMessage,
  getConversationalIgnoreMessage,
  getFriendlyName
} from "../utils/whatsappResponses";

// Resolve language style with fallback to detection, prioritizing pending state's language if available
export function resolveLanguageStyle(msg: string, aiLanguage?: string, pendingLanguage?: string): LanguageStyle {
  // If the user clearly uses a specific language structure in their current turn, respect that first (allows language switching)
  const currentTurnDetect = detectLanguageStyle(msg);
  if (currentTurnDetect === "hindi") {
    return "hindi";
  }

  // If we have a pending conversation style, preserve it
  if (pendingLanguage) {
    return pendingLanguage as LanguageStyle;
  }

  // Otherwise follow standard priority: AI detected, then deterministic detection
  if (aiLanguage && aiLanguage !== "unknown") {
    return aiLanguage as LanguageStyle;
  }
  return currentTurnDetect;
}

async function processMessageFlow(
  message: string,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date,
  pendingToResolve?: any
) {
  let extractedData = "";
  try {
    extractedData = await extractHealthData(message);
  } catch (err: any) {
    console.error("❌ AI extraction error caught in processMessageFlow pipeline:", err?.message || err);
  }

  console.log("🧠 Extracted Health Record:");
  console.log(extractedData);

  let action = "RECORD";
  let missingFields: string[] = [];
  let language = "english";
  let candidateRecords: CandidateRecord[] = [];
  let reason = "";
  let aiUnresolved: number[] = [];
  let intent: MessageIntent = "health_measurement";

  let parseSuccess = false;
  try {
    if (extractedData) {
      const parsedAI = JSON.parse(extractedData);
      if (parsedAI) {
        if (parsedAI.action) action = parsedAI.action;
        if (parsedAI.intent) intent = parsedAI.intent;
        if (Array.isArray(parsedAI.missingFields)) missingFields = parsedAI.missingFields;
        if (parsedAI.language) language = parsedAI.language;
        if (Array.isArray(parsedAI.candidateRecords)) candidateRecords = parsedAI.candidateRecords;
        if (parsedAI.reason) reason = parsedAI.reason;
        if (Array.isArray(parsedAI.unresolvedMeasurements)) aiUnresolved = parsedAI.unresolvedMeasurements;
        parseSuccess = true;
      }
    }
  } catch (e) {
    console.error("⚠️ AI JSON Parse Error, falling back to deterministic local extraction.");
  }

  // Fallback to local deterministic extraction if AI failed, errored, or returned empty/invalid response
  if (!parseSuccess) {
    const fallbackResult = deterministicExtract(message);
    if (fallbackResult && fallbackResult.candidateRecords && fallbackResult.candidateRecords.length > 0) {
      console.log("🛠️ Falling back to deterministic local extraction:", JSON.stringify(fallbackResult, null, 2));
      action = fallbackResult.action;
      intent = fallbackResult.intent;
      missingFields = fallbackResult.missingFields;
      language = fallbackResult.language;
      candidateRecords = fallbackResult.candidateRecords;
      reason = fallbackResult.reason;
      aiUnresolved = fallbackResult.unresolvedMeasurements;
    }
  } else {
    // If AI succeeded, also merge any additional deterministic candidates (same-parameter multi-observation support)
    const fallbackResult = deterministicExtract(message);
    if (fallbackResult && fallbackResult.candidateRecords && fallbackResult.candidateRecords.length > 0) {
      for (const fbRecord of fallbackResult.candidateRecords) {
        const exists = candidateRecords.some(cRecord => {
          if (cRecord.parameter !== fbRecord.parameter) return false;
          if (fbRecord.parameter === "blood_pressure") {
            return cRecord.systolic === fbRecord.systolic && cRecord.diastolic === fbRecord.diastolic;
          } else {
            return cRecord.value === fbRecord.value;
          }
        });
        if (!exists) {
          console.log(`[Parser] Merging missing deterministic candidate:`, fbRecord.parameter);
          candidateRecords.push(fbRecord);
          if (fbRecord.parameter === "blood_sugar" && fbRecord.context === "unknown" && !missingFields.includes("glucose_context")) {
            missingFields.push("glucose_context");
          }
          if (fbRecord.parameter === "blood_pressure" && fbRecord.diastolic === undefined && !missingFields.includes("diastolic")) {
            missingFields.push("diastolic");
          }
          if (fbRecord.parameter === "body_temperature" && fbRecord.unit === "unknown" && !missingFields.includes("temperature_unit")) {
            missingFields.push("temperature_unit");
          }
        }
      }
      missingFields = Array.from(new Set(missingFields));
      if (candidateRecords.length > 0 && action === "IGNORE") {
        action = missingFields.length > 0 ? "CLARIFY" : "RECORD";
        intent = "health_measurement";
      }
    }
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
  const resolvedLang = resolveLanguageStyle(message, language, pendingToResolve?.language);

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
            const name = getFriendlyName(r.parameter, resolvedLang);
            const connector = resolvedLang === "hindi" ? " और " : (resolvedLang === "hinglish" ? " aur " : " and ");
            return `${r.value} ${name}`;
          }).join(resolvedLang === "hindi" ? " और " : (resolvedLang === "hinglish" ? " aur " : " and "))
        : "";
      const clarifMsg = getUnresolvedMeasurementsClarification(unresolvedMeasurements, savedSummary, resolvedLang);
      await sendWhatsAppMessage(from, clarifMsg);
      console.log(`❓ Clarification requested for unresolved measurements: ${unresolvedMeasurements.join(", ")}`);
    } else {
      // Ask clarification for the first incomplete candidate
      const firstIncomplete = incompleteCandidates[0];
      const clarifMsg = getMissingDetailsClarification(
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
      const successMsg = formatConfirmation(newlySavedRecords, resolvedLang);
      await sendWhatsAppMessage(from, successMsg);
      console.log("✅ Confirmation sent:", successMsg);
    } else {
      // If nothing saved and no pending clarification, could be IGNORE
      if (action === "IGNORE" || intent === "conversational") {
        const ignoreMsg = getConversationalIgnoreMessage(resolvedLang);
        await sendWhatsAppMessage(from, ignoreMsg);
        console.log("ℹ️ Conversational message ignored for record persistence.");
      } else {
        const failMsg = getGenericFailureMessage(resolvedLang);
        await sendWhatsAppMessage(from, failMsg);
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

export function detectParameterFromMessage(msg: string): string | null {
  const clean = msg.toLowerCase().trim();
  const keywordsMap: Record<string, string[]> = {
    blood_sugar: ["sugar", "glucose", "sugar level", "shugar", "cheeni", "schugar", "शुगर", "सीनी", "चीनी"],
    blood_pressure: ["bp", "blood pressure", "pressure", "बीपी", "रक्तचाप"],
    heart_rate: ["pulse", "heart rate", "hr", "bpm", "dhadkan", "dil", "beat", "पल्स", "धड़कन"],
    oxygen_saturation: ["oxygen", "spo2", "o2", "saturation", "oxigen", "ऑक्सीजन"],
    body_temperature: ["temp", "temperature", "fever", "body temp", "bukhar", "bukhaar", "tapman", "तापमान", "बुखार"],
    weight: ["weight", "vajan", "wajan", "kg", "vazan", "वजन"],
    respiratory_rate: ["breath", "resp", "respiratory", "saans"],
    height: ["height", "lambai"]
  };

  for (const [param, keywords] of Object.entries(keywordsMap)) {
    for (const kw of keywords) {
      if (/[\u0900-\u097F]/.test(kw)) {
        if (clean.includes(kw)) {
          return param;
        }
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(clean)) {
          return param;
        }
      }
    }
  }

  return null;
}

export function hasOtherNumbers(msg: string, allowedNumbers: number[]): boolean {
  const numbers = msg.match(/\b\d+(?:\.\d+)?\b/g);
  if (!numbers) return false;
  for (const numStr of numbers) {
    const val = parseFloat(numStr);
    if (!allowedNumbers.includes(val)) {
      return true;
    }
  }
  return false;
}

// Receive WhatsApp Messages
export const receiveMessage = async (req: Request, res: Response) => {
  console.log(`🔍 [Webhook Diagnostic] [Phase A: Request Received] Path: ${req.originalUrl}, Method: ${req.method}`);
  console.log("📩 Incoming Webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    if (!value) {
      console.log("🔍 [Webhook Diagnostic] [Phase B: Empty Value] Request value payload missing.");
    }

    // A. Check if this is a WhatsApp status event (sent, delivered, read)
    const isStatusEvent = !!value?.statuses?.[0];
    if (isStatusEvent) {
      console.log("🔍 [Webhook Diagnostic] [Phase B: Status Event] WhatsApp status event received, skipping processing.");
      return res.sendStatus(200);
    }

    const incomingMessage = value?.messages?.[0];
    const whatsappMessageId = incomingMessage?.id;

    let message = incomingMessage?.text?.body;
    const from = incomingMessage?.from;

    const audioId = incomingMessage?.audio?.id;
    const messageType = incomingMessage?.type;

    console.log(`🔍 [Webhook Diagnostic] [Phase C: Message Identified] MsgId: ${whatsappMessageId || "none"}, From: ${from || "none"}, Type: ${messageType || "none"}`);

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
        console.log(`🔍 [Webhook Diagnostic] [Phase D: Concurrent Duplicate Caught] Message ID: ${whatsappMessageId}`);
        return res.sendStatus(200);
      }

      if (processedMessageIds.has(whatsappMessageId)) {
        console.log(`🔍 [Webhook Diagnostic] [Phase D: Cached Duplicate Caught] Message ID: ${whatsappMessageId}`);
        return res.sendStatus(200);
      }

      let existsInDb = false;
      if (process.env.USE_MOCK_DATA === "true") {
        for (const pId in MOCK_RECORDS) {
          const match = MOCK_RECORDS[pId].find(
            (r: any) =>
              r.whatsappMessageId === whatsappMessageId ||
              r.whatsappMessageId.startsWith(whatsappMessageId + "_")
          );
          if (match) {
            existsInDb = true;
            break;
          }
        }
      } else {
        const escapedId = whatsappMessageId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const record = await HealthRecord.findOne({
          whatsappMessageId: { $regex: `^${escapedId}(_|$)` }
        }, { _id: 1 });
        if (record) {
          existsInDb = true;
        }
      }

      if (existsInDb) {
        console.log(`🔍 [Webhook Diagnostic] [Phase D: DB Duplicate Caught] Message ID: ${whatsappMessageId}`);
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

        console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Lookup] Phone: ${from}`);
        // Resolve WhatsApp sender to an enrolled patient user (fail safely if not found or ambiguous)
        const patient = await findEnrolledPatientByWhatsApp(from);
        if (!patient) {
          console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Lookup Failed] No patient linked to WhatsApp: ${from}`);
          // Safe fail. Preserve normal webhook acknowledgement behavior (200 OK)
          return res.sendStatus(200);
        }

        console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Found] PatientId: ${patient.patientId}, Name: ${patient.fullName}`);

        // Temporary Correction Safeguard
        if (isCorrectionMessage(message)) {
          console.log("⚠️ Correction/Edit message detected, triggering safeguard.");
          const style = detectLanguageStyle(message);
          let replyMsg = "";
          if (style === "hindi") {
            replyMsg = "हेल्थ रिकॉर्ड को बदलना या सुधारना इस संस्करण में समर्थित नहीं है। कृपया एक नया सही संदेश भेजें।";
          } else if (style === "hinglish") {
            replyMsg = "Health records correct ya edit karna is version mein supported nahi hai. Kripya ek naya correct message bhejein.";
          } else {
            replyMsg = "Correction or editing of health records is not supported in this version. Please send a new, correct reading.";
          }
          await sendWhatsAppMessage(from, replyMsg);
          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }

        const pending = getPendingClarification(patient.patientId);

        if (pending) {
          const resolvedPendingLang = (pending.language || "english") as LanguageStyle;
          // Check for cancel command
          if (isCancelCommand(message)) {
            cancelPendingClarification(patient.patientId);
            clearPendingClarification(patient.patientId);
            await sendWhatsAppMessage(from, getCancellationAcknowledgement(resolvedPendingLang));
            if (whatsappMessageId) {
              markMessageAsProcessed(whatsappMessageId);
            }
            return res.sendStatus(200);
          }

          // Deterministic parameter resolution for pending unresolved measurements
          if (pending.unresolvedMeasurements && pending.unresolvedMeasurements.length > 0) {
            const detectedParam = detectParameterFromMessage(message);
            if (detectedParam) {
              if (!hasOtherNumbers(message, pending.unresolvedMeasurements)) {
                const val = pending.unresolvedMeasurements[0];
                const updatedUnresolved = pending.unresolvedMeasurements.slice(1);

                const paramDef = PARAMETER_REGISTRY[detectedParam];
                const defaultUnit = paramDef ? paramDef.defaultUnit : "";

                const newCandidate: CandidateRecord = {
                  parameter: detectedParam,
                  confidence: 0.99,
                  recordedAt: null,
                  unit: defaultUnit || "",
                };

                if (detectedParam === "blood_sugar") {
                  newCandidate.value = val;
                  newCandidate.unit = defaultUnit || "mg/dL";
                  newCandidate.context = "unknown";

                  const updatedMissingFields = Array.from(new Set([...(pending.missingFields || []), "glucose_context"]));
                  const updatedCandidates = [...(pending.candidateRecords || []), newCandidate];

                  setPendingClarification(patient.patientId, {
                    patientId: pending.patientId,
                    hospitalId: pending.hospitalId,
                    originalWhatsappMessageId: pending.originalWhatsappMessageId,
                    originalSourceText: pending.originalSourceText,
                    language: pending.language,
                    candidateRecords: updatedCandidates,
                    missingFields: updatedMissingFields,
                    unresolvedMeasurements: updatedUnresolved,
                    clarificationReason: pending.clarificationReason,
                    originalMessageDate: pending.originalMessageDate,
                  });

                  const clarifMsg = getMissingDetailsClarification("blood_sugar", resolvedPendingLang, val);
                  await sendWhatsAppMessage(from, clarifMsg);
                  console.log(`[Deterministic Parameter Resolution] Resolved unresolved ${val} as blood_sugar. Asking for glucose context.`);

                  if (whatsappMessageId) {
                    markMessageAsProcessed(whatsappMessageId);
                  }
                  return res.sendStatus(200);
                } else if (detectedParam === "body_temperature") {
                  newCandidate.value = val;
                  newCandidate.unit = "unknown";

                  const updatedMissingFields = Array.from(new Set([...(pending.missingFields || []), "temperature_unit"]));
                  const updatedCandidates = [...(pending.candidateRecords || []), newCandidate];

                  setPendingClarification(patient.patientId, {
                    patientId: pending.patientId,
                    hospitalId: pending.hospitalId,
                    originalWhatsappMessageId: pending.originalWhatsappMessageId,
                    originalSourceText: pending.originalSourceText,
                    language: pending.language,
                    candidateRecords: updatedCandidates,
                    missingFields: updatedMissingFields,
                    unresolvedMeasurements: updatedUnresolved,
                    clarificationReason: pending.clarificationReason,
                    originalMessageDate: pending.originalMessageDate,
                  });

                  const clarifMsg = getMissingDetailsClarification("body_temperature", resolvedPendingLang, val);
                  await sendWhatsAppMessage(from, clarifMsg);
                  console.log(`[Deterministic Parameter Resolution] Resolved unresolved ${val} as body_temperature. Asking for temperature unit.`);

                  if (whatsappMessageId) {
                    markMessageAsProcessed(whatsappMessageId);
                  }
                  return res.sendStatus(200);
                } else if (detectedParam === "blood_pressure") {
                  newCandidate.systolic = val;
                  newCandidate.unit = defaultUnit || "mmHg";

                  const updatedMissingFields = Array.from(new Set([...(pending.missingFields || []), "diastolic"]));
                  const updatedCandidates = [...(pending.candidateRecords || []), newCandidate];

                  setPendingClarification(patient.patientId, {
                    patientId: pending.patientId,
                    hospitalId: pending.hospitalId,
                    originalWhatsappMessageId: pending.originalWhatsappMessageId,
                    originalSourceText: pending.originalSourceText,
                    language: pending.language,
                    candidateRecords: updatedCandidates,
                    missingFields: updatedMissingFields,
                    unresolvedMeasurements: updatedUnresolved,
                    clarificationReason: pending.clarificationReason,
                    originalMessageDate: pending.originalMessageDate,
                  });

                  const clarifMsg = getMissingDetailsClarification("blood_pressure", resolvedPendingLang, val);
                  await sendWhatsAppMessage(from, clarifMsg);
                  console.log(`[Deterministic Parameter Resolution] Resolved unresolved ${val} as blood_pressure (systolic). Asking for diastolic.`);

                  if (whatsappMessageId) {
                    markMessageAsProcessed(whatsappMessageId);
                  }
                  return res.sendStatus(200);
                } else {
                  newCandidate.value = val;
                  newCandidate.unit = defaultUnit;

                  const records = parseMergedHealthRecords(pending, newCandidate, detectedParam, message, whatsappMessageId, messageDate);
                  await saveAndAcknowledgeRecords(records, patient, from, pending);

                  if (whatsappMessageId) {
                    markMessageAsProcessed(whatsappMessageId);
                  }
                  return res.sendStatus(200);
                }
              }
            }
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
            console.log(`🔍 [Webhook Diagnostic] [Phase F: Processing Hijacked Message as Fresh] MsgId: ${whatsappMessageId || "none"}`);
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
              console.log(`🔍 [Webhook Diagnostic] [Phase F: Consumed Deterministically] MsgId: ${whatsappMessageId || "none"}`);
              if (whatsappMessageId) {
                markMessageAsProcessed(whatsappMessageId);
              }
              return res.sendStatus(200);
            }

            // 3. Not resolved deterministically. Proceed to progressive / follow-up resolution: merge message with original source text
            const combinedMessage = `${pending.originalSourceText} ${message}`;
            console.log(`🔄 Processing combined clarification message: "${combinedMessage}"`);
            console.log(`🔍 [Webhook Diagnostic] [Phase F: Processing Combined Pending Message] MsgId: ${whatsappMessageId || "none"}`);
            await processMessageFlow(combinedMessage, patient, from, whatsappMessageId, messageDate, pending);
          }
        } else {
          // Fresh message flow
          console.log(`🔍 [Webhook Diagnostic] [Phase F: Fresh Message Flow] MsgId: ${whatsappMessageId || "none"}`);
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
        console.log(`🔍 [Webhook Diagnostic] [Phase G: Skip Duplicate Record] Parameter: ${recordPayload.parameter}`);
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
      console.log(`🔍 [Webhook Diagnostic] [Phase G: Record Saved Successfully] PatientId: ${recordPayload.patientId}, Parameter: ${recordPayload.parameter}`);
    }

    completePendingClarification(patient.patientId);
    clearPendingClarification(patient.patientId);

    if (savedRecords.length > 0) {
      const resolvedLang = (pending.language || "english") as LanguageStyle;
      const successMsg = formatConfirmation(savedRecords, resolvedLang);
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
  console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Attempt] To: ${to}`);
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
        timeout: 10000, // 10 seconds timeout
      }
    );
    console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Succeeded] To: ${to}`);
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err?.message || err);
    console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Failed] Error: ${err?.message || err}`);
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
      timeout: 15000, // 15 seconds timeout
    }
  );

  const mediaUrl = mediaResponse.data.url;

  // Step 2 - Download Audio
  const audioResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
    timeout: 15000, // 15 seconds timeout
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
