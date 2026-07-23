import { PARAMETER_REGISTRY } from "./parameterRegistry";
import { IntelligenceResult, CandidateRecord } from "./intelligenceContract";
import { HealthRecord } from "../services/healthRecordExtractor";

/**
 * Deterministically resolves relative and historical dates from the original message.
 * - Relative terms such as "Aaj", "Today", "aaj", "today", "now", "abhi" resolve to messageDate.
 * - Relative terms such as "Yesterday", "Kal", "kal", "yesterday" resolve to messageDate minus 1 day.
 * - Explicit historical dates (e.g. 15 July) are parsed and respected.
 * - LLM hallucinations of the prompt examples (2026-07-11 or 2026-07-12) are discarded unless explicitly mentioned.
 */
export function resolveRecordedAt(
  originalMessage: string,
  extractedRecordedAt: string | null | undefined,
  messageDate: Date = new Date()
): Date {
  if (!originalMessage) {
    return extractedRecordedAt ? new Date(extractedRecordedAt) : messageDate;
  }

  const msgLower = originalMessage.toLowerCase();

  // Check for explicit relative terms in the message
  const isToday = msgLower.includes("today") || msgLower.includes("aaj") || msgLower.includes("now") || msgLower.includes("abhi");
  const isYesterday = msgLower.includes("yesterday") || msgLower.includes("kal");

  if (isYesterday) {
    const date = new Date(messageDate);
    date.setDate(date.getDate() - 1);
    return date;
  }

  if (isToday) {
    return new Date(messageDate);
  }

  // If there is an extracted recordedAt absolute date
  if (extractedRecordedAt) {
    const parsed = new Date(extractedRecordedAt);
    if (!isNaN(parsed.getTime())) {
      // Prevent LLM hallucination of hardcoded prompt examples (July 11/12)
      // unless those numbers/dates are explicitly in the user message
      const parsedIso = parsed.toISOString();
      const hallucinatedDates = ["2026-07-11", "2026-07-12"];
      const matchesHallucination = hallucinatedDates.some((hd) => parsedIso.startsWith(hd));
      if (matchesHallucination) {
        const hasDateMention =
          msgLower.includes("11") ||
          msgLower.includes("12") ||
          msgLower.includes("july") ||
          msgLower.includes("jul");
        if (!hasDateMention) {
          return new Date(messageDate);
        }
      }
      return parsed;
    }
  }

  // Default to messageDate
  return new Date(messageDate);
}

/**
 * Deterministically checks if a numeric value is supported by the original user message text.
 * This blocks the AI from hallucinating or fabricating values that the user never typed.
 */
export function isValueSupportedByMessage(
  originalMessage: string,
  value: any,
  parameter: string
): boolean {
  if (value === undefined || value === null) return false;

  const msgLower = originalMessage.toLowerCase();

  // Extract all numbers from original message (integers and decimals)
  const numbersInMessage = originalMessage.match(/\d+(\.\d+)?/g) || [];
  const floatNumbers = numbersInMessage.map(n => parseFloat(n));

  // If parameter is body_temperature and value is in C, we might have had Fahrenheit in the message
  if (parameter === "body_temperature") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      // Check if Celsius or Fahrenheit representation exists in message
      // Fahrenheit-to-Celsius conversion: C = (F - 32) * 5/9, so F = C * 1.8 + 32
      const expectedF = valNum * 1.8 + 32;

      const matchFound = floatNumbers.some(n => {
        // Direct match with tolerance (e.g. 37 vs 37)
        if (Math.abs(n - valNum) < 0.2) return true;
        // Fahrenheit match with tolerance (e.g. 98.6 vs 98.6)
        if (Math.abs(n - expectedF) < 1.0) return true;
        return false;
      });
      if (matchFound) return true;
    }
  }

  // If parameter is blood_pressure, the value is e.g. "120/80"
  if (parameter === "blood_pressure") {
    const bpStr = String(value);
    const parts = bpStr.split("/");
    if (parts.length === 2) {
      const systolic = parseFloat(parts[0]);
      const diastolic = parseFloat(parts[1]);
      if (isNaN(systolic) || isNaN(diastolic)) return false;

      const sysMatch = floatNumbers.some(n => Math.abs(n - systolic) < 0.1);
      const diaMatch = floatNumbers.some(n => Math.abs(n - diastolic) < 0.1);
      return sysMatch && diaMatch;
    }
    return false;
  }

  // General check: is the numeric value close to any number in the message?
  const numericVal = parseFloat(value);
  if (!isNaN(numericVal)) {
    return floatNumbers.some(n => Math.abs(n - numericVal) < 0.1);
  }

  return false;
}

/**
 * Deterministically validates a candidate record against safety guidelines,
 * ensuring no fabricated values, correct unit parameters, positive values, and full BP pairs.
 */
export function validateCandidateRecord(
  record: CandidateRecord,
  originalMessage: string
): boolean {
  // 1. Parameter is supported
  const paramDef = PARAMETER_REGISTRY[record.parameter];
  if (!paramDef) {
    console.warn(`[Validation Error] Unsupported parameter: ${record.parameter}`);
    return false;
  }

  // 2. Unit handling is valid (must be empty or one of supported units)
  if (record.unit) {
    const cleanUnit = record.unit.trim();
    const isUnitSupported = paramDef.supportedUnits.some(
      u => u.toLowerCase() === cleanUnit.toLowerCase()
    );
    if (!isUnitSupported) {
      console.warn(`[Validation Error] Unsupported unit: ${record.unit} for parameter ${record.parameter}`);
      return false;
    }
  }

  // 3. Values exist and are supported/not fabricated
  if (record.parameter === "blood_pressure") {
    if (record.systolic === undefined || record.diastolic === undefined) {
      console.warn(`[Validation Error] Incomplete blood pressure: systolic or diastolic is missing.`);
      return false;
    }
    if (record.systolic <= 0 || record.diastolic <= 0) {
      console.warn(`[Validation Error] Blood pressure values must be positive.`);
      return false;
    }
    // Check fabricated values
    const bpValStr = `${record.systolic}/${record.diastolic}`;
    if (!isValueSupportedByMessage(originalMessage, bpValStr, record.parameter)) {
      console.warn(`[Validation Error] Fabricated blood pressure values rejected.`);
      return false;
    }
  } else {
    if (record.value === undefined || record.value === null) {
      console.warn(`[Validation Error] Value is missing for parameter ${record.parameter}.`);
      return false;
    }
    const numVal = Number(record.value);
    if (isNaN(numVal) || numVal <= 0) {
      console.warn(`[Validation Error] Numeric value for ${record.parameter} must be a positive number.`);
      return false;
    }
    // Check fabricated value
    if (!isValueSupportedByMessage(originalMessage, record.value, record.parameter)) {
      console.warn(`[Validation Error] Fabricated value rejected for ${record.parameter}: ${record.value}`);
      return false;
    }
  }

  return true;
}

export function parseHealthRecord(
  aiResponse: string,
  patientId: string,
  source: "text" | "voice",
  originalMessage: string,
  whatsappMessageId: string
): HealthRecord[] {
  try {
    const parsed = JSON.parse(aiResponse);

    // 1. Is it the new IntelligenceResult format?
    if (parsed && typeof parsed === "object" && "action" in parsed) {
      const result = parsed as IntelligenceResult;

      // If action is CLARIFY or IGNORE, we do NOT save health records
      if (result.action === "CLARIFY" || result.action === "IGNORE") {
        console.log(`[Parser] Action is ${result.action}, skipping HealthRecord creation.`);
        return [];
      }

      if (!Array.isArray(result.candidateRecords)) {
        return [];
      }

      const records: HealthRecord[] = [];
      for (const item of result.candidateRecords) {
        if (!item.parameter) continue;

        // Perform deterministic validation before adding
        if (!validateCandidateRecord(item, originalMessage)) {
          console.log(`[Parser] Deterministic validation failed for candidate record:`, item);
          continue;
        }

        const resolvedVal =
          item.parameter === "blood_pressure"
            ? `${item.systolic}/${item.diastolic}`
            : Number(item.value);

        records.push({
          patientId,
          parameter: item.parameter,
          value: resolvedVal,
          unit: item.unit ?? PARAMETER_REGISTRY[item.parameter]?.defaultUnit ?? "",
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt as string | null, new Date()),
          source,
          confidence: item.confidence ?? 0.99,
          originalMessage,
          whatsappMessageId: `${whatsappMessageId}_${item.parameter}`,
        });
      }
      return records;
    }

    // 2. Is it the legacy format (array of objects)?
    if (Array.isArray(parsed)) {
      const records: HealthRecord[] = [];

      for (const item of parsed) {
        if (!item.parameter) continue;

        // Create a temporary CandidateRecord to run through the validation engine
        const tempCandidate: CandidateRecord = {
          parameter: item.parameter,
          value: item.parameter === "blood_pressure" ? undefined : item.value,
          systolic: item.parameter === "blood_pressure" ? item.systolic : undefined,
          diastolic: item.parameter === "blood_pressure" ? item.diastolic : undefined,
          unit: item.unit ?? "",
          confidence: item.confidence ?? 0.99,
          recordedAt: item.recordedAt,
        };

        if (!validateCandidateRecord(tempCandidate, originalMessage)) {
          console.log(`[Parser] Legacy item failed deterministic validation:`, item);
          continue;
        }

        records.push({
          patientId,
          parameter: item.parameter,
          value:
            item.parameter === "blood_pressure"
              ? `${item.systolic}/${item.diastolic}`
              : Number(item.value),
          unit: item.unit ?? "",
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt, new Date()),
          source,
          confidence: 0.99,
          originalMessage,
          whatsappMessageId: `${whatsappMessageId}_${item.parameter}`,
        });
      }

      return records;
    }

    return [];
  } catch (error: any) {
    console.error("❌ [JSON Parse Error] Failed to parse AI response as JSON:", error?.message || error);
    console.error("📄 Raw response content that failed parsing was:", JSON.stringify(aiResponse));
    return [];
  }
}
