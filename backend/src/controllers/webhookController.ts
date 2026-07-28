import { handleVoiceNoteIngestion, VoiceError } from "../services/groqSpeechService";
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
  parseCorrectionMessage,
  ParsedCorrection,
  detectEmergencyUrgency,
  detectParameterFromMessage,
} from "../utils/healthRecordParser";
import axios from "axios";
import fs from "fs";
import path from "path";
import { extractHealthData, generateHealthRecordSummary } from "../services/openaiService";
import { Request, Response } from "express";
import { findEnrolledPatientByWhatsApp } from "../utils/phoneHelper";
import { calculateDeterministicAnalytics } from "../utils/analyticsHelper";
import { buildDeterministicNarrativeSummary } from "../utils/fallbackHelper";
import { MOCK_RECORDS } from "./patientController";
import {
  getPendingClarification,
  setPendingClarification,
  clearPendingClarification,
  completePendingClarification,
  cancelPendingClarification,
  PendingClarification,
  detectQueryPattern,
  getRecentlyResolvedContext,
  setRecentlyResolvedContext,
} from "../services/pendingClarificationService";
import { PARAMETER_REGISTRY } from "../utils/parameterRegistry";
import { CandidateRecord, GlucoseContext, MessageIntent } from "../utils/intelligenceContract";
import { extractMedicalDocumentText, extractStructuredLabData } from "../services/documentService";
import { LabReport, LabObservation } from "../models/LabReport";
import { MOCK_LAB_REPORTS, MOCK_LAB_OBSERVATIONS } from "./patientController";
import {
  getLabProcessingSuccessMessage,
  getLabNoResultsMessage,
  getLabUnsupportedFileMessage,
  getLabFileTooLargeMessage,
  getLabProcessingFailureMessage,
  formatLatestLabObservation,
} from "../utils/whatsappResponses";

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
  getFriendlyName,
  formatCorrectionConfirmation,
  getAmbiguousCorrectionClarification,
  getCorrectionTargetNotFoundMessage,
  getEmergencyResponse,
  getImplausibleValueClarification,
  formatLatestReading,
  formatNoRecords,
  formatTodaysReadings,
  getVoiceNotUnderstoodMessage,
  getUnsupportedAudioMessage,
  getAudioTooLargeMessage,
  getTranscriptionFailureMessage,
  getEmptyVoiceTranscriptMessage,
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
  pendingToResolve?: any,
  isEmergency?: boolean
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
  let language = "unknown";
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
    language = fallbackResult.language || detectLanguageStyle(message);
    if (fallbackResult && fallbackResult.candidateRecords && fallbackResult.candidateRecords.length > 0) {
      console.log("🛠️ Falling back to deterministic local extraction:", JSON.stringify(fallbackResult, null, 2));
      action = fallbackResult.action;
      intent = fallbackResult.intent;
      missingFields = fallbackResult.missingFields;
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
  let unresolvedMeasurements = Array.from(new Set([...aiUnresolved, ...detUnresolved]));

  // Route promotion: If we have unresolved measurements and a detected parameter in the message
  // but no candidate record for that parameter, promote the unresolved measurement.
  const detectedParam = detectParameterFromMessage(message);
  if (detectedParam && unresolvedMeasurements.length > 0) {
    const hasParamRecord = candidateRecords.some(r => r.parameter === detectedParam);
    if (!hasParamRecord) {
      const valToPromote = unresolvedMeasurements[0];
      console.log(`[Parser] Promoting unresolved measurement ${valToPromote} to candidate record of detected parameter: ${detectedParam}`);

      const promotedCandidate: CandidateRecord = {
        parameter: detectedParam,
        value: valToPromote,
        unit: PARAMETER_REGISTRY[detectedParam]?.defaultUnit || "",
        confidence: 0.99,
        recordedAt: null,
      };

      candidateRecords.push(promotedCandidate);
      // Remove from unresolved measurements
      unresolvedMeasurements = unresolvedMeasurements.filter(v => v !== valToPromote);
    }
  }

  const completeCandidates: CandidateRecord[] = [];
  const incompleteCandidates: CandidateRecord[] = [];
  const implausibleCandidates: CandidateRecord[] = [];

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
        implausibleCandidates.push(item);
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
      timeContext: item.timeContext || undefined,
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

  if (newlySavedRecords.length > 0) {
    const resolvedRecords = newlySavedRecords.map(r => ({
      patientId: r.patientId,
      parameter: r.parameter,
      value: r.value,
      unit: r.unit,
      context: r.context,
      timeContext: r.timeContext,
      recordedAt: r.recordedAt,
      whatsappMessageId: r.whatsappMessageId,
    }));
    setRecentlyResolvedContext(patient.patientId, resolvedRecords);
  }

  // Check emergency flow
  if (isEmergency) {
    if (pendingToResolve) {
      completePendingClarification(patient.patientId);
      clearPendingClarification(patient.patientId);
    }
    const savedSummary = newlySavedRecords.length > 0
      ? newlySavedRecords.map(r => `${r.value} ${getFriendlyName(r.parameter, resolvedLang)}`).join(resolvedLang === "hindi" ? " और " : (resolvedLang === "hinglish" ? " aur " : " and "))
      : "";
    const emergencyMsg = getEmergencyResponse(resolvedLang, savedSummary || undefined);
    await sendWhatsAppMessage(from, emergencyMsg);
    console.log("⚠️ Emergency Warning Response sent (complete candidates saved if any).");
    return;
  }

  // Check implausible candidates flow
  if (implausibleCandidates.length > 0) {
    if (pendingToResolve) {
      completePendingClarification(patient.patientId);
      clearPendingClarification(patient.patientId);
    }
    const firstImplausible = implausibleCandidates[0];
    const implausibleVal = firstImplausible.parameter === "blood_pressure"
      ? `${firstImplausible.systolic}/${firstImplausible.diastolic}`
      : firstImplausible.value;
    const implausibleMsg = getImplausibleValueClarification(
      firstImplausible.parameter,
      implausibleVal,
      resolvedLang
    );
    await sendWhatsAppMessage(from, implausibleMsg);
    console.log("⚠️ Implausible Candidate Clarification response sent.");
    return;
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

async function getPatientRecords(patientId: string, hospitalId: string): Promise<any[]> {
  if (process.env.USE_MOCK_DATA === "true") {
    return [...(MOCK_RECORDS[patientId] || [])]
      .filter(r => r.hospitalId === hospitalId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  }
  return await HealthRecord.find({ patientId, hospitalId }).sort({ recordedAt: -1 });
}

async function resolveTargetRecord(
  patient: any,
  parsed: ParsedCorrection,
  records: any[]
): Promise<{ targets: any[] }> {
  let candidates = records;
  if (parsed.parameter) {
    candidates = candidates.filter(r => r.parameter === parsed.parameter);
  }

  // Filter by oldValue if we have it
  if (parsed.oldValue !== null && parsed.oldValue !== undefined) {
    const oldStr = String(parsed.oldValue).trim();
    candidates = candidates.filter(r => {
      const valStr = String(r.value).trim();
      // Exact match
      if (valStr === oldStr) return true;
      // Match parts of BP if oldValue is a number and r is blood_pressure
      if (r.parameter === "blood_pressure" && !isNaN(Number(oldStr))) {
        const parts = valStr.split("/");
        if (parts.includes(oldStr)) return true;
      }
      return false;
    });
  }

  // Filter by oldContext if specified
  if (parsed.oldContext) {
    candidates = candidates.filter(r => r.context === parsed.oldContext);
  }

  // Filter by oldTimeContext if specified
  if (parsed.oldTimeContext) {
    candidates = candidates.filter(r => r.timeContext === parsed.oldTimeContext);
  }

  return { targets: candidates };
}

async function saveCorrectedRecord(
  targetRecord: any,
  parsed: ParsedCorrection,
  whatsappMessageId: string,
  correctionMsgText: string,
  patientId: string
) {
  let finalNewValue = parsed.newValue ?? targetRecord.value;
  if (targetRecord.parameter === "body_temperature") {
    const valNum = Number(finalNewValue);
    if (valNum > 50) {
      finalNewValue = parseFloat(((valNum - 32) * 5 / 9).toFixed(1));
    }
  }

  if (targetRecord.parameter === "blood_pressure") {
    finalNewValue = String(finalNewValue).replace(/\s*[\/\\]\s*/g, "/");
  } else if (finalNewValue !== null && finalNewValue !== undefined) {
    const valNum = Number(finalNewValue);
    if (!isNaN(valNum)) {
      finalNewValue = valNum;
    }
  }

  const finalNewContext = parsed.newContext || targetRecord.context;
  const finalNewTimeContext = parsed.newTimeContext || targetRecord.timeContext;

  const auditObj = {
    originalValue: targetRecord.value,
    originalContext: targetRecord.context,
    originalTimeContext: targetRecord.timeContext,
    originalMessage: targetRecord.originalMessage,
    correctedAt: new Date(),
    source: "whatsapp",
    whatsappMessageId: whatsappMessageId,
  };

  if (process.env.USE_MOCK_DATA === "true") {
    const records = MOCK_RECORDS[patientId] || [];
    const idx = records.findIndex(r => r.whatsappMessageId === targetRecord.whatsappMessageId);
    if (idx !== -1) {
      const rec = records[idx];
      const alreadyCorrected = rec.corrections?.some((c: any) => c.whatsappMessageId === whatsappMessageId);
      if (alreadyCorrected) {
        return rec;
      }
      rec.corrections = rec.corrections || [];
      rec.corrections.push(auditObj);
      rec.value = finalNewValue;
      rec.context = finalNewContext;
      rec.timeContext = finalNewTimeContext;
      rec.originalMessage = correctionMsgText;
      return rec;
    }
    return targetRecord;
  } else {
    const rec = await HealthRecord.findById(targetRecord._id);
    if (rec) {
      const alreadyCorrected = rec.corrections?.some((c: any) => c.whatsappMessageId === whatsappMessageId);
      if (alreadyCorrected) {
        return rec;
      }
      rec.corrections = rec.corrections || [];
      rec.corrections.push(auditObj);
      rec.value = finalNewValue;
      rec.context = finalNewContext;
      rec.timeContext = finalNewTimeContext;
      rec.originalMessage = correctionMsgText;
      await rec.save();
      return rec;
    }
    return targetRecord;
  }
}

function matchFollowUpToTarget(reply: string, targets: any[]): any | null {
  const clean = reply.toLowerCase().trim();

  for (const t of targets) {
    const tc = String(t.timeContext || "").toLowerCase();
    const ctx = String(t.context || "").toLowerCase();

    if (tc && (clean.includes(tc) || (tc === "morning" && (clean.includes("subah") || clean.includes("सुबह"))))) {
      return t;
    }
    if (ctx && (clean.includes(ctx) || (ctx === "fasting" && (clean.includes("khali") || clean.includes("खाली"))))) {
      return t;
    }
  }

  const numbers = clean.match(/\b\d+\b/);
  if (numbers) {
    const idx = parseInt(numbers[0], 10) - 1;
    if (idx >= 0 && idx < targets.length) {
      return targets[idx];
    }
  }

  return null;
}

async function handleCorrectionFlow(
  message: string,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date
) {
  const resolvedLang = detectLanguageStyle(message);
  const parsed = parseCorrectionMessage(message);

  console.log("DEBUG handleCorrectionFlow:", { message, parsed });

  const records = await getPatientRecords(patient.patientId, patient.hospitalId);
  console.log("DEBUG patient records count:", records.length, records);

  const recentlyResolved = getRecentlyResolvedContext(patient.patientId);
  if (recentlyResolved && recentlyResolved.records.length > 0) {
    const lastResolved = recentlyResolved.records[0];
    if (!parsed.parameter) {
      if (lastResolved.parameter === "blood_sugar" && parseGlucoseContext(message)) {
        parsed.parameter = "blood_sugar";
      } else {
        parsed.parameter = lastResolved.parameter;
      }
    }
    if (parsed.oldValue === null || parsed.oldValue === undefined) {
      parsed.oldValue = lastResolved.value;
    }
    if (parsed.newValue === null || parsed.newValue === undefined) {
      parsed.newValue = lastResolved.value;
    }
  }

  const { targets } = await resolveTargetRecord(patient, parsed, records);
  console.log("DEBUG targets count:", targets.length, targets);

  if (targets.length === 1) {
    const target = targets[0];
    const oldValueBeforeUpdate = target.value;
    const updated = await saveCorrectedRecord(target, parsed, whatsappMessageId, message, patient.patientId);

    const unit = PARAMETER_REGISTRY[target.parameter]?.defaultUnit || "";
    const confirmationMsg = formatCorrectionConfirmation(
      target.parameter,
      oldValueBeforeUpdate,
      updated.value,
      unit,
      resolvedLang,
      updated.timeContext,
      updated.context
    );
    await sendWhatsAppMessage(from, confirmationMsg);
  } else if (targets.length > 1) {
    setPendingClarification(patient.patientId, {
      patientId: patient.patientId,
      hospitalId: patient.hospitalId,
      originalSourceText: message,
      originalWhatsappMessageId: whatsappMessageId,
      language: resolvedLang,
      candidateRecords: [],
      missingFields: [],
      clarificationReason: "ambiguous_correction",
      originalMessageDate: messageDate,
      isCorrection: true,
      oldValue: parsed.oldValue,
      newValue: parsed.newValue,
      parameter: parsed.parameter || targets[0].parameter,
      candidateTargets: targets.map(t => ({
        whatsappMessageId: t.whatsappMessageId,
        _id: t._id ? String(t._id) : undefined,
        parameter: t.parameter,
        value: t.value,
        context: t.context,
        timeContext: t.timeContext,
        recordedAt: t.recordedAt,
        originalMessage: t.originalMessage,
      })),
      proposedNewContext: parsed.newContext,
      proposedNewTimeContext: parsed.newTimeContext,
    });

    const clarifMsg = getAmbiguousCorrectionClarification(
      parsed.parameter || targets[0].parameter,
      parsed.oldValue || targets[0].value,
      targets,
      resolvedLang
    );
    await sendWhatsAppMessage(from, clarifMsg);
  } else {
    const notFoundMsg = getCorrectionTargetNotFoundMessage(parsed.parameter || "", parsed.oldValue ?? null, resolvedLang);
    await sendWhatsAppMessage(from, notFoundMsg);
  }
}

async function handlePendingCorrectionFollowUp(
  message: string,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date,
  pending: any
) {
  const resolvedPendingLang = (pending.language || "english") as LanguageStyle;
  const target = matchFollowUpToTarget(message, pending.candidateTargets || []);

  if (target) {
    const records = await getPatientRecords(patient.patientId, patient.hospitalId);
    const fullTarget = records.find(r => r.whatsappMessageId === target.whatsappMessageId);

    if (fullTarget) {
      const parsed: ParsedCorrection = {
        parameter: pending.parameter || null,
        oldValue: pending.oldValue || null,
        newValue: pending.newValue || null,
        oldContext: null,
        newContext: pending.proposedNewContext as any,
        newTimeContext: pending.proposedNewTimeContext as any,
      };

      const oldValueBeforeUpdate = fullTarget.value;
      const updated = await saveCorrectedRecord(fullTarget, parsed, whatsappMessageId, message, patient.patientId);

      completePendingClarification(patient.patientId);
      clearPendingClarification(patient.patientId);

      const unit = PARAMETER_REGISTRY[fullTarget.parameter]?.defaultUnit || "";
      const confirmationMsg = formatCorrectionConfirmation(
        fullTarget.parameter,
        oldValueBeforeUpdate,
        updated.value,
        unit,
        resolvedPendingLang,
        updated.timeContext,
        updated.context
      );
      await sendWhatsAppMessage(from, confirmationMsg);
    } else {
      clearPendingClarification(patient.patientId);
      await sendWhatsAppMessage(from, getCorrectionTargetNotFoundMessage(pending.parameter || "", pending.oldValue ?? null, resolvedPendingLang));
    }
  } else {
    const clarifMsg = getAmbiguousCorrectionClarification(
      pending.parameter || "",
      pending.oldValue || "",
      pending.candidateTargets || [],
      resolvedPendingLang
    );
    await sendWhatsAppMessage(from, clarifMsg);
  }
}

async function handleVoiceFailureResponse(err: any, from: string, patient: any) {
  const pending = getPendingClarification(patient.patientId);
  const lang = (pending?.language || "english") as LanguageStyle;

  let responseText = "";
  if (err instanceof VoiceError) {
    switch (err.code) {
      case "UNSUPPORTED_AUDIO":
        responseText = getUnsupportedAudioMessage(lang);
        break;
      case "AUDIO_TOO_LARGE":
        responseText = getAudioTooLargeMessage(lang);
        break;
      case "EMPTY_TRANSCRIPT":
        responseText = getEmptyVoiceTranscriptMessage(lang);
        break;
      case "CONFIG_MISSING":
      case "TRANSCRIPTION_FAILED":
        responseText = getTranscriptionFailureMessage(lang);
        break;
      case "DOWNLOAD_FAILED":
      default:
        responseText = getVoiceNotUnderstoodMessage(lang);
        break;
    }
  } else {
    responseText = getVoiceNotUnderstoodMessage(lang);
  }

  await sendWhatsAppMessage(from, responseText);
}

async function handleDocumentIngestion(
  incomingMessage: any,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date,
  resolvedLang: LanguageStyle
) {
  const messageType = incomingMessage.type;
  const mediaObj = messageType === "image" ? incomingMessage.image : incomingMessage.document;
  const mediaId = mediaObj?.id;
  const mimeType = mediaObj?.mime_type;

  // 1. Missing media ID
  if (!mediaId) {
    const errorMsg = getLabUnsupportedFileMessage(resolvedLang);
    await sendWhatsAppMessage(from, errorMsg);
    return;
  }

  // 2. Validate MIME type early
  const cleanMime = mimeType?.toLowerCase();
  const supportedMimes = ["image/jpeg", "image/png", "application/pdf"];
  if (!cleanMime || !supportedMimes.includes(cleanMime)) {
    const errorMsg = getLabUnsupportedFileMessage(resolvedLang);
    await sendWhatsAppMessage(from, errorMsg);
    return;
  }

  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    const errorMsg = getLabProcessingFailureMessage(resolvedLang);
    await sendWhatsAppMessage(from, errorMsg);
    return;
  }

  let filePath: string | null = null;

  try {
    // 3. Metadata retrieval with timeout (15s)
    let metadataResponse;
    try {
      metadataResponse = await axios.get(
        `https://graph.facebook.com/v23.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );
    } catch (metaErr) {
      console.error("❌ Document metadata retrieval failed:", metaErr);
      const errorMsg = getLabProcessingFailureMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    const {
      url: mediaUrl,
      file_size: metaFileSize,
    } = metadataResponse.data;

    // Validate size limit (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (metaFileSize && metaFileSize > MAX_FILE_SIZE) {
      const errorMsg = getLabFileTooLargeMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    // 4. Download media file
    let downloadResponse;
    try {
      downloadResponse = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
    } catch (dlErr) {
      console.error("❌ Document download failed:", dlErr);
      const errorMsg = getLabProcessingFailureMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    const buffer = downloadResponse.data;
    if (!buffer || buffer.byteLength === 0) {
      const errorMsg = getLabProcessingFailureMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    // Post-download size check
    if (buffer.byteLength > MAX_FILE_SIZE) {
      const errorMsg = getLabFileTooLargeMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    console.log(`🔍 [Stage Diagnostic] [MEDIA_DOWNLOADED] Succeeded. MimeType: ${cleanMime}, Size: ${buffer.byteLength} bytes`);

    // 5. Save temporarily
    const folder = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    const ext = cleanMime === "application/pdf" ? "pdf" : (cleanMime === "image/png" ? "png" : "jpg");
    filePath = path.join(folder, `lab_${whatsappMessageId}_${mediaId}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    // 6. OCR Text Extraction (timeout via service if needed, but handled or mocked)
    let ocrText = "";
    try {
      ocrText = await extractMedicalDocumentText(filePath, cleanMime);
    } catch (ocrErr) {
      console.error("❌ OCR failed:", ocrErr);
      const errorMsg = getLabProcessingFailureMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    if (!ocrText || !ocrText.trim()) {
      const errorMsg = getLabNoResultsMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    // 7. Structured Extraction
    let observations: any[] = [];
    try {
      observations = await extractStructuredLabData(ocrText);
    } catch (extErr) {
      console.error("❌ Structured lab extraction failed:", extErr);
      const errorMsg = getLabProcessingFailureMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    console.log(`🔍 [Stage Diagnostic] [LAB_STRUCTURED_EXTRACTION_RESULT] Count: ${observations.length}, Tests: ${observations.map(o => o.canonicalTestKey || o.testName).join(", ")}`);

    if (!observations || observations.length === 0) {
      const errorMsg = getLabNoResultsMessage(resolvedLang);
      await sendWhatsAppMessage(from, errorMsg);
      return;
    }

    // 8. Save LabReport and LabObservations
    const labReportData = {
      patientId: patient.patientId,
      hospitalId: patient.hospitalId,
      whatsappMessageId,
      mediaType: messageType,
      mimeType: cleanMime,
      reportDate: messageDate,
      laboratoryName: "Extracted Lab",
      status: "success",
      extractionMetadata: { ocrTextLength: ocrText.length }
    };

    let reportId: any = "mock-report-id";

    if (process.env.USE_MOCK_DATA === "true") {
      if (!MOCK_LAB_REPORTS[patient.patientId]) {
        MOCK_LAB_REPORTS[patient.patientId] = [];
      }
      MOCK_LAB_REPORTS[patient.patientId].push(labReportData);
    } else {
      const reportDoc = await LabReport.create(labReportData);
      reportId = reportDoc._id;
    }

    const savedObservations: any[] = [];
    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      const obsPayload = {
        patientId: patient.patientId,
        hospitalId: patient.hospitalId,
        labReportId: reportId,
        testName: obs.testName,
        canonicalTestKey: obs.canonicalTestKey || null,
        value: obs.value,
        unit: obs.unit || "",
        referenceRangeText: obs.referenceRangeText || "",
        flag: obs.flag || "",
        specimenDate: obs.specimenDate ? new Date(obs.specimenDate) : messageDate,
        source: messageType === "image" ? "whatsapp_image" as const : "whatsapp_document" as const,
        whatsappMessageId: `${whatsappMessageId}_obs${i}`,
      };

      if (process.env.USE_MOCK_DATA === "true") {
        if (!MOCK_LAB_OBSERVATIONS[patient.patientId]) {
          MOCK_LAB_OBSERVATIONS[patient.patientId] = [];
        }
        MOCK_LAB_OBSERVATIONS[patient.patientId].push(obsPayload);
      } else {
        await LabObservation.create(obsPayload);
      }
      savedObservations.push(obsPayload);
    }

    console.log(`🔍 [Stage Diagnostic] [LAB_PERSISTENCE_RESULT] Succeeded. Saved observations count: ${savedObservations.length}`);

    // Reply with localized success
    const successMsg = getLabProcessingSuccessMessage(savedObservations.length, resolvedLang);
    await sendWhatsAppMessage(from, successMsg);

  } catch (err: any) {
    console.error("❌ Exception during document ingestion:", err);
    const errorMsg = getLabProcessingFailureMessage(resolvedLang);
    await sendWhatsAppMessage(from, errorMsg);
  } finally {
    // 9. Privacy Cleanup: Short-lived temporary file cleanup on both success and failure
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 Privacy Cleanup: Successfully deleted temporary report file at ${filePath}`);
      } catch (cleanupErr: any) {
        console.error(`⚠️ Failed to delete temporary report file at ${filePath}:`, cleanupErr.message || cleanupErr);
      }
    }
  }
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

      // Synchronously and immediately mark as currently processing to avoid async race condition
      processingMessageIds.add(whatsappMessageId);

      let existsInDb = false;
      if (process.env.USE_MOCK_DATA === "true") {
        for (const pId in MOCK_RECORDS) {
          const match = MOCK_RECORDS[pId].find(
            (r: any) =>
              r.whatsappMessageId === whatsappMessageId ||
              r.whatsappMessageId.startsWith(whatsappMessageId + "_") ||
              r.corrections?.some((c: any) => c.whatsappMessageId === whatsappMessageId)
          );
          if (match) {
            existsInDb = true;
            break;
          }
        }
        if (!existsInDb) {
          for (const pId in MOCK_LAB_REPORTS) {
            const match = MOCK_LAB_REPORTS[pId].find(
              (r: any) => r.whatsappMessageId === whatsappMessageId
            );
            if (match) {
              existsInDb = true;
              break;
            }
          }
        }
      } else {
        const escapedId = whatsappMessageId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const record = await HealthRecord.findOne({
          $or: [
            { whatsappMessageId: { $regex: `^${escapedId}(_|$)` } },
            { "corrections.whatsappMessageId": whatsappMessageId }
          ]
        }, { _id: 1 });
        if (record) {
          existsInDb = true;
        } else {
          const report = await LabReport.findOne({ whatsappMessageId }, { _id: 1 });
          if (report) {
            existsInDb = true;
          }
        }
      }

      if (existsInDb) {
        console.log(`🔍 [Webhook Diagnostic] [Phase D: DB Duplicate Caught] Message ID: ${whatsappMessageId}`);
        markMessageAsProcessed(whatsappMessageId);
        processingMessageIds.delete(whatsappMessageId);
        return res.sendStatus(200);
      }
    }

    try {
      // Look up enrolled patient early to provide localized failure responses
      console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Lookup] Phone: ${from}`);
      const patient = await findEnrolledPatientByWhatsApp(from);
      if (!patient) {
        console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Lookup Failed] No patient linked to WhatsApp: ${from}`);
        return res.sendStatus(200);
      }
      console.log(`🔍 [Webhook Diagnostic] [Phase E: Patient Found] PatientId: ${patient.patientId}, Name: ${patient.fullName}`);

      // ==========================
      // Voice Message Ingestion
      // ==========================
      if (messageType === "audio" && audioId && from) {
        console.log("🎤 Voice Message Received");
        try {
          message = await handleVoiceNoteIngestion(audioId, incomingMessage?.audio?.mime_type);
          console.log(`📝 Transcript: "${message}"`);
        } catch (err: any) {
          console.error("❌ Voice Note Ingestion Failed:", err.message || err);
          await handleVoiceFailureResponse(err, from, patient);
          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }
      }

      // ==========================
      // Lab Report/Document Ingestion
      // ==========================
      if ((messageType === "image" || messageType === "document") && from) {
        console.log(`🖼️ Document/Image Message Received (type: ${messageType})`);
        const pending = getPendingClarification(patient.patientId);
        const resolvedLang = (pending?.language || "english") as LanguageStyle;
        await handleDocumentIngestion(incomingMessage, patient, from, whatsappMessageId, messageDate, resolvedLang);
        if (whatsappMessageId) {
          markMessageAsProcessed(whatsappMessageId);
        }
        return res.sendStatus(200);
      }

      // ==========================
      // Common Pipeline (Text + Voice)
      // ==========================
      if (message && from) {
        console.log("👤 User:", message);

        // Clinical Safety Early Emergency Warning Detection
        const isEmergency = detectEmergencyUrgency(message);
        if (isEmergency) {
          console.log("⚠️ Emergency message detected! Bypassing normal turn flow for safety.");
          await processMessageFlow(message, patient, from, whatsappMessageId, messageDate, undefined, true);
          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }

        // Correction Flow Integration
        if (isCorrectionMessage(message)) {
          console.log("⚠️ Correction/Edit message detected, executing correction workflow.");
          await handleCorrectionFlow(message, patient, from, whatsappMessageId, messageDate);
          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }

        const pending = getPendingClarification(patient.patientId);

        // Read-back query flow integration
        const queryPattern = detectQueryPattern(message);
        if (queryPattern.type !== null) {
          console.log("🔍 Read-back query detected:", queryPattern);
          const savedPending = pending;
          if (pending) {
            clearPendingClarification(patient.patientId);
          }
          await handleQueryFlow(message, patient, from, whatsappMessageId, messageDate, queryPattern as { type: "latest" | "today"; parameter?: string });
          if (savedPending) {
            setPendingClarification(patient.patientId, savedPending);
          }
          if (whatsappMessageId) {
            markMessageAsProcessed(whatsappMessageId);
          }
          return res.sendStatus(200);
        }

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

          if (isExplicitNewObservation(message, pending)) {
            console.log("⚠️ Explicit new observation bypass detected. Suspending active pending clarification.");
            const savedPending = pending;
            clearPendingClarification(patient.patientId);
            await processMessageFlow(message, patient, from, whatsappMessageId, messageDate);
            const newPending = getPendingClarification(patient.patientId);
            if (!newPending) {
              setPendingClarification(patient.patientId, savedPending);
            }
            if (whatsappMessageId) {
              markMessageAsProcessed(whatsappMessageId);
            }
            return res.sendStatus(200);
          }

          if (pending.isCorrection) {
            console.log("🔄 Processing follow-up for pending correction clarification.");
            await handlePendingCorrectionFollowUp(message, patient, from, whatsappMessageId, messageDate, pending);
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

function isExplicitNewObservation(message: string, pending: PendingClarification): boolean {
  const detected = detectParameterFromMessage(message);
  if (!detected) return false;

  // An explicit new observation MUST contain a numeric vital value
  const cleaned = stripNumbersBelongingToDatesAndTimes(message);
  const hasNumbers = /\b\d+\b/.test(cleaned);
  if (!hasNumbers) {
    return false;
  }

  const pendingParams = new Set(pending.candidateRecords.map(r => r.parameter));
  if (pending.unresolvedMeasurements && pending.unresolvedMeasurements.length > 0) {
    // If it mentions other numbers besides the pending unresolved ones, it's a new observation
    if (hasOtherNumbers(message, pending.unresolvedMeasurements)) {
      return true;
    }
    return false;
  }

  return true;
}

function stripNumbersBelongingToDatesAndTimes(msg: string): string {
  let cleaned = msg.toLowerCase();
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");
  cleaned = cleaned.replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/gi, "");
  cleaned = cleaned.replace(/\b\d+\s*(?:am|pm|hours|hrs|hr|minutes|mins|min|seconds|sec)\b/gi, "");
  return cleaned;
}

async function handleQueryFlow(
  message: string,
  patient: any,
  from: string,
  whatsappMessageId: string,
  messageDate: Date,
  queryPattern: { type: "latest" | "today" | "summary"; parameter?: string; days?: number }
) {
  const resolvedLang = detectLanguageStyle(message);

  let resultMsg = "";
  if (queryPattern.type === "summary") {
    const days = queryPattern.days || 30;
    let routineRecords: any[] = [];
    let labObservations: any[] = [];

    if (process.env.USE_MOCK_DATA === "true") {
      routineRecords = MOCK_RECORDS[patient.patientId] || [];
      labObservations = MOCK_LAB_OBSERVATIONS[patient.patientId] || [];
    } else {
      try {
        routineRecords = await HealthRecord.find({ patientId: patient.patientId }).sort({ recordedAt: -1 });
        labObservations = await LabObservation.find({ patientId: patient.patientId }).sort({ specimenDate: -1, createdAt: -1 });
      } catch (error) {
        console.error("Error fetching records for WhatsApp summary query:", error);
      }
    }

    const analytics = calculateDeterministicAnalytics(routineRecords, labObservations, days);
    try {
      resultMsg = await generateHealthRecordSummary(analytics);
      if (!resultMsg || resultMsg.trim().length === 0) {
        throw new Error("Empty AI narrative.");
      }
    } catch (err) {
      resultMsg = buildDeterministicNarrativeSummary(analytics);
    }
  } else if (queryPattern.type === "latest" && queryPattern.parameter) {
    const isVital = PARAMETER_REGISTRY[queryPattern.parameter] !== undefined;
    if (isVital) {
      const records = await getPatientRecords(patient.patientId, patient.hospitalId);
      const matched = records.find(r => r.parameter === queryPattern.parameter);
      if (matched) {
        const unit = matched.unit || PARAMETER_REGISTRY[matched.parameter]?.defaultUnit || "";
        resultMsg = formatLatestReading(matched.parameter, matched.value, unit, matched.context, resolvedLang, matched.timeContext);
      } else {
        resultMsg = formatNoRecords(resolvedLang, queryPattern.parameter);
      }
    } else {
      let matchedObservation = null;
      if (process.env.USE_MOCK_DATA === "true") {
        const list = MOCK_LAB_OBSERVATIONS[patient.patientId] || [];
        matchedObservation = list
          .filter(obs => obs.canonicalTestKey === queryPattern.parameter || obs.testName.toLowerCase().includes(queryPattern.parameter || ""))
          .sort((a, b) => new Date(b.specimenDate || b.createdAt || Date.now()).getTime() - new Date(a.specimenDate || a.createdAt || Date.now()).getTime())[0];
      } else {
        matchedObservation = await LabObservation.findOne({
          patientId: patient.patientId,
          $or: [
            { canonicalTestKey: queryPattern.parameter },
            { testName: { $regex: new RegExp(queryPattern.parameter || "", "i") } }
          ]
        }).sort({ specimenDate: -1, createdAt: -1 });
      }

      if (matchedObservation) {
        resultMsg = formatLatestLabObservation(
          matchedObservation.testName,
          matchedObservation.value,
          matchedObservation.unit || "",
          matchedObservation.referenceRangeText || undefined,
          matchedObservation.flag || undefined,
          resolvedLang
        );
      } else {
        resultMsg = formatNoRecords(resolvedLang, queryPattern.parameter);
      }
    }
  } else if (queryPattern.type === "today") {
    // Boundary of today based on IST (offset +330 min)
    const tzOffsetMinutes = process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES
      ? parseInt(process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES, 10)
      : 330;

    const localMsgTime = messageDate.getTime() + (tzOffsetMinutes * 60 * 1000);
    const localMsgDate = new Date(localMsgTime);
    const localYStr = localMsgDate.getUTCFullYear();
    const localMStr = localMsgDate.getUTCMonth();
    const localDStr = localMsgDate.getUTCDate();

    const records = await getPatientRecords(patient.patientId, patient.hospitalId);
    const todayRecords = records.filter(r => {
      const recLocalTime = new Date(r.recordedAt).getTime() + (tzOffsetMinutes * 60 * 1000);
      const recLocalDate = new Date(recLocalTime);
      return recLocalDate.getUTCFullYear() === localYStr &&
             recLocalDate.getUTCMonth() === localMStr &&
             recLocalDate.getUTCDate() === localDStr;
    });

    // Sort multiple same-day readings morning -> afternoon -> evening -> night
    const tcOrder = { morning: 1, afternoon: 2, evening: 3, night: 4, undefined: 5 };
    todayRecords.sort((a, b) => {
      const aTc = (a.timeContext || "undefined") as keyof typeof tcOrder;
      const bTc = (b.timeContext || "undefined") as keyof typeof tcOrder;
      const tcDiff = (tcOrder[aTc] || 5) - (tcOrder[bTc] || 5);
      if (tcDiff !== 0) return tcDiff;
      return new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
    });

    if (todayRecords.length > 0) {
      resultMsg = formatTodaysReadings(todayRecords, resolvedLang);
    } else {
      resultMsg = formatNoRecords(resolvedLang);
    }
  } else {
    // General "what did I send" gets all today's readings
    const tzOffsetMinutes = process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES
      ? parseInt(process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES, 10)
      : 330;

    const localMsgTime = messageDate.getTime() + (tzOffsetMinutes * 60 * 1000);
    const localMsgDate = new Date(localMsgTime);
    const localYStr = localMsgDate.getUTCFullYear();
    const localMStr = localMsgDate.getUTCMonth();
    const localDStr = localMsgDate.getUTCDate();

    const records = await getPatientRecords(patient.patientId, patient.hospitalId);
    const todayRecords = records.filter(r => {
      const recLocalTime = new Date(r.recordedAt).getTime() + (tzOffsetMinutes * 60 * 1000);
      const recLocalDate = new Date(recLocalTime);
      return recLocalDate.getUTCFullYear() === localYStr &&
             recLocalDate.getUTCMonth() === localMStr &&
             recLocalDate.getUTCDate() === localDStr;
    });

    if (todayRecords.length > 0) {
      resultMsg = formatTodaysReadings(todayRecords, resolvedLang);
    } else {
      resultMsg = formatNoRecords(resolvedLang);
    }
  }

  await sendWhatsAppMessage(from, resultMsg);
}

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
    timeContext: completedCandidate.timeContext || undefined,
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
      const resolvedRecords = savedRecords.map(r => ({
        patientId: r.patientId,
        parameter: r.parameter,
        value: r.value,
        unit: r.unit,
        context: r.context,
        timeContext: r.timeContext,
        recordedAt: r.recordedAt,
        whatsappMessageId: r.whatsappMessageId,
      }));
      setRecentlyResolvedContext(patient.patientId, resolvedRecords);

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
  const maxAttempts = 3;
  let attempt = 0;
  let success = false;
  let lastError: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    if (attempt === 1) {
      console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Attempt] To: ${to}`);
    } else {
      console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Retry Attempt ${attempt - 1}] To: ${to}`);
    }

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
      console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Succeeded] To: ${to} (Attempt ${attempt})`);
      success = true;
      break;
    } catch (err: any) {
      lastError = err;
      const status = err.response?.status;
      const isTimeout = err.code === "ECONNABORTED" || err.message?.includes("timeout");
      const isNetworkError = !err.response;
      const isRetryable5xx = status >= 500 && status <= 599;
      const isRateLimit = status === 429;

      const isTransient = isTimeout || isNetworkError || isRetryable5xx || isRateLimit;

      const safeErrorMessage = err.message || err;
      console.error(`Failed to send WhatsApp message (Attempt ${attempt}/${maxAttempts}):`, safeErrorMessage);

      if (!isTransient) {
        console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Failed Permanent] Status: ${status || "unknown"}. No retry.`);
        break;
      }

      if (attempt < maxAttempts) {
        const backoffMs = attempt * 500; // 500ms, then 1000ms
        console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Transient Failure] Status: ${status || "timeout/network"}. Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  if (success) {
    console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Final Success] To: ${to}`);
  } else {
    const status = lastError?.response?.status;
    const safeErrorMessage = lastError?.message || lastError;
    console.log(`🔍 [Webhook Diagnostic] [Phase H: Outbound WhatsApp Final Failure] To: ${to}, Error: ${safeErrorMessage}, Status: ${status || "unknown"}`);
  }
}

