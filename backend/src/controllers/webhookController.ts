import { speechToText } from "../services/groqSpeechService";
import HealthRecord from "../models/HealthRecord";
import {
  validateCandidateRecord,
  resolveRecordedAt,
  isValueSupportedByMessage,
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
import { CandidateRecord, GlucoseContext } from "../utils/intelligenceContract";

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

        // ==========================
        // 1. Run AI Extraction on the incoming message first
        // ==========================
        const extractedData = await extractHealthData(message);

        console.log("🧠 Extracted Health Record:");
        console.log(extractedData);

        if (!extractedData) {
          console.error(`❌ [Pipeline Error] AI extraction failed or returned an empty string for user message: "${message}"`);
        }

        // Parse candidates and properties
        let action = "RECORD";
        let missingFields: string[] = [];
        let language = "english";
        let candidateRecords: CandidateRecord[] = [];
        let reason = "";

        try {
          const parsedAI = JSON.parse(extractedData);
          if (parsedAI) {
            if (parsedAI.action) action = parsedAI.action;
            if (Array.isArray(parsedAI.missingFields)) missingFields = parsedAI.missingFields;
            if (parsedAI.language) language = parsedAI.language;
            if (Array.isArray(parsedAI.candidateRecords)) candidateRecords = parsedAI.candidateRecords;
            if (parsedAI.reason) reason = parsedAI.reason;
          }
        } catch (e) {
          // Handled gracefully
        }

        const completeCandidates: CandidateRecord[] = [];
        const incompleteCandidates: CandidateRecord[] = [];

        for (const item of candidateRecords) {
          // Identify if a candidate is incomplete
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
            // It's complete! Run deterministic validation
            if (validateCandidateRecord(item, message)) {
              completeCandidates.push(item);
            } else {
              console.log(`[Parser] Deterministic validation failed for candidate:`, item);
            }
          }
        }

        // Prepare complete records to save
        const recordsToSave: any[] = [];
        for (const item of completeCandidates) {
          const resolvedVal =
            item.parameter === "blood_pressure"
              ? `${item.systolic}/${item.diastolic}`
              : Number(item.value);

          recordsToSave.push({
            patientId: patient.patientId,
            parameter: item.parameter,
            value: resolvedVal,
            unit: item.unit ?? PARAMETER_REGISTRY[item.parameter]?.defaultUnit ?? "",
            recordedAt: resolveRecordedAt(message, item.recordedAt as string | null, messageDate),
            source: "text",
            confidence: item.confidence ?? 0.99,
            originalMessage: message,
            whatsappMessageId: `${whatsappMessageId}_${item.parameter}`,
            hospitalId: patient.hospitalId,
          });
        }

        // A. If the message contains at least one COMPLETE valid record,
        // we save it immediately, acknowledge, and bypass pending clarification checks.
        if (recordsToSave.length > 0) {
          let savedAny = false;
          for (const recordPayload of recordsToSave) {
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
              console.log("⚠️ Duplicate Record Skipped:", recordPayload.parameter);
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
            savedAny = true;
            console.log("✅ Saved complete candidate:", recordPayload.parameter);
          }

          if (incompleteCandidates.length > 0) {
            setPendingClarification(patient.patientId, {
              patientId: patient.patientId,
              hospitalId: patient.hospitalId,
              originalWhatsappMessageId: whatsappMessageId,
              originalSourceText: message,
              language,
              candidateRecords: incompleteCandidates,
              missingFields,
              clarificationReason: reason,
              originalMessageDate: messageDate,
            });

            const firstIncomplete = incompleteCandidates[0];
            const clarifMsg = getClarificationMessage(
              firstIncomplete.parameter,
              language,
              firstIncomplete.value
            );

            await sendWhatsAppMessage(from, clarifMsg);
            console.log(`❓ Clarification requested for incomplete candidate inside mixed message: ${firstIncomplete.parameter}`);
          } else if (savedAny) {
            await sendWhatsAppMessage(
              from,
              `✅ ${recordsToSave.length} health record(s) saved successfully.`
            );
            console.log("✅ All complete Health Records Saved");
          }

          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }

        // B. If no complete records were saved, check active pending clarification
        const pending = getPendingClarification(patient.patientId);
        let consumed = false;

        if (pending) {
          // B1. Verify the follow-up message is not talking about other parameter(s) entirely
          const pendingParams = new Set(pending.candidateRecords.map(r => r.parameter));
          const hasDifferentParam = candidateRecords.some(r => !pendingParams.has(r.parameter));

          if (!hasDifferentParam) {
            // B2. Intercept cancel command
            if (isCancelCommand(message)) {
              cancelPendingClarification(patient.patientId);
              clearPendingClarification(patient.patientId);
              await sendWhatsAppMessage(from, "❌ Clarification cancelled.");
              if (whatsappMessageId) {
                markMessageAsProcessed(whatsappMessageId);
              }
              return res.sendStatus(200);
            }

            // B3. Attempt to resolve pending fields
            const glucoseCandidate = pending.candidateRecords.find(r => r.parameter === "blood_sugar");
            const bpCandidate = pending.candidateRecords.find(r => r.parameter === "blood_pressure");
            const tempCandidate = pending.candidateRecords.find(r => r.parameter === "body_temperature");

            if (glucoseCandidate && pending.missingFields.includes("glucose_context")) {
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
            } else if (bpCandidate && pending.missingFields.includes("diastolic")) {
              const diastolic = extractDiastolicNumber(message);
              if (diastolic !== null) {
                consumed = true;
                bpCandidate.diastolic = diastolic;

                const records = parseMergedHealthRecords(pending, bpCandidate, "blood_pressure", message, whatsappMessageId, messageDate);
                await saveAndAcknowledgeRecords(records, patient, from, pending);
              }
            } else if (tempCandidate && pending.missingFields.includes("temperature_unit")) {
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
        }

        // C. If not consumed as clarification, process incomplete records or IGNORE
        if (!consumed) {
          if (incompleteCandidates.length > 0) {
            setPendingClarification(patient.patientId, {
              patientId: patient.patientId,
              hospitalId: patient.hospitalId,
              originalWhatsappMessageId: whatsappMessageId,
              originalSourceText: message,
              language,
              candidateRecords: incompleteCandidates,
              missingFields,
              clarificationReason: reason,
              originalMessageDate: messageDate,
            });

            const firstIncomplete = incompleteCandidates[0];
            const clarifMsg = getClarificationMessage(
              firstIncomplete.parameter,
              language,
              firstIncomplete.value
            );

            await sendWhatsAppMessage(from, clarifMsg);
            console.log(`❓ Clarification requested for incomplete candidate: ${firstIncomplete.parameter}`);
          } else {
            if (action === "IGNORE") {
              await sendWhatsAppMessage(
                from,
                "ℹ️ Message received. Conversational updates are not recorded as health entries."
              );
              console.log("ℹ️ Conversational message ignored for record persistence.");
            } else if (action === "CLARIFY") {
              await sendWhatsAppMessage(
                from,
                `❓ Please clarify: ${missingFields.join(", ")} is missing.`
              );
              console.log(`❓ Clarification requested: ${missingFields.join(", ")}`);
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

  if (parameter === "blood_sugar") {
    if (lang === "hindi") {
      return "Please clarify: glucose_context is missing. यह शुगर रीडिंग खाली पेट, खाने से पहले, खाने के बाद या रैंडम थी?";
    } else if (lang === "hinglish") {
      return "Please clarify: glucose_context is missing. Ye sugar reading fasting, khane se pehle, khane ke baad, ya random thi?";
    } else {
      return "Please clarify: glucose_context is missing. Was this glucose reading fasting, before a meal, after a meal, or random?";
    }
  }

  if (parameter === "blood_pressure") {
    if (lang === "hindi") {
      return "Please clarify: diastolic is missing. कृपया रक्तचाप का दूसरा (डायस्टोलिक) नंबर भी बताएं, जैसे 140/90।";
    } else if (lang === "hinglish") {
      return "Please clarify: diastolic is missing. BP ka doosra (diastolic) number bhi batayein, jaise 140/90.";
    } else {
      return "Please clarify: diastolic is missing. Please provide the second (diastolic) BP number, like 140/90.";
    }
  }

  if (parameter === "body_temperature") {
    const val = candidateValue !== undefined ? candidateValue : "38";
    if (lang === "hindi") {
      return `Please clarify: temperature_unit is missing. तापमान ${val} °C था या °F?`;
    } else if (lang === "hinglish") {
      return `Please clarify: temperature_unit is missing. Temperature ${val} °C tha ya °F?`;
    } else {
      return `Please clarify: temperature_unit is missing. Was the temperature ${val} °C or °F?`;
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

      console.log("✅ Saved merged record:", recordPayload.parameter);
    }

    completePendingClarification(patient.patientId);
    clearPendingClarification(patient.patientId);

    await sendWhatsAppMessage(
      from,
      `✅ ${records.length} health record(s) saved successfully.`
    );
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
