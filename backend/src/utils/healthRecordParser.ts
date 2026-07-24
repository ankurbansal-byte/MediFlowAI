import { PARAMETER_REGISTRY } from "./parameterRegistry";
import { IntelligenceResult, CandidateRecord } from "./intelligenceContract";
import { HealthRecord } from "../services/healthRecordExtractor";

/**
 * Helper to strip numbers that are part of dates and times from the original message.
 * This prevents them from accidentally validating hallucinated measurement values.
 */
export function stripNumbersBelongingToDatesAndTimes(msg: string): string {
  let cleaned = msg.toLowerCase();

  // 1. Remove YYYY-MM-DD or standard ISO date parts (like 2026-07-11 or 2026-07-12)
  cleaned = cleaned.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");

  // 2. Remove DD Month YYYY or DD Month
  const monthsPattern = "(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)";
  const ddMonthYyyyRegex = new RegExp(`\\b\\d{1,2}\\s+${monthsPattern}\\s*(?:\\d{2,4})?\\b`, "gi");
  cleaned = cleaned.replace(ddMonthYyyyRegex, "");

  // 3. Remove dates with slashes like DD/MM/YYYY or DD/MM/YY
  cleaned = cleaned.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "");

  // 4. Remove short slash dates like "20/07" only if it matches day <= 31 and month <= 12
  cleaned = cleaned.replace(/\b(\d{1,2})\/(\d{1,2})\b/g, (match, p1, p2) => {
    const d = parseInt(p1, 10);
    const m = parseInt(p2, 10);
    if (d <= 31 && m <= 12) {
      return "";
    }
    return match;
  });

  // 5. Remove times with colons/dots like 12:30 or 12.30 followed/preceded by am/pm/hours/minutes
  cleaned = cleaned.replace(/\b\d{1,2}[:.]\d{2}\s*(?:am|pm)?\b/gi, "");

  // 6. Remove numeric quantities representing durations or times (e.g., "2 hours", "10 min", "5 pm", "10am")
  cleaned = cleaned.replace(/\b\d+\s*(?:am|pm|hours|hrs|hr|minutes|mins|min|seconds|sec)\b/gi, "");

  return cleaned;
}

/**
 * Deterministically resolves relative and historical dates from the original message.
 * - Relative terms such as "Aaj", "Today", "aaj", "today", "now", "abhi", "subah", "dopahar", "shaam", "raat", "morning", "evening", "afternoon", "night", "this morning" resolve to messageDate.
 * - Relative terms such as "Yesterday", "Kal", "kal", "yesterday", "last night", "kal raat", "yesterday morning" resolve to messageDate minus 1 day.
 * - Explicit historical dates (e.g. 15 July, 20/07/2026) are parsed and respected.
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

  // 1. If there is an extracted recordedAt absolute date, check it first to preserve precision!
  if (extractedRecordedAt) {
    const parsed = new Date(extractedRecordedAt);
    if (!isNaN(parsed.getTime())) {
      // Prevent LLM hallucination of hardcoded prompt examples (July 11/12)
      // unless those numbers/dates are explicitly in the user message
      const parsedIso = parsed.toISOString();
      const hallucinatedDates = ["2026-07-11", "2026-07-12"];
      const matchesHallucination = hallucinatedDates.some((hd) => parsedIso.startsWith(hd));
      let isHallucination = false;
      if (matchesHallucination) {
        const hasDateMention =
          msgLower.includes("11") ||
          msgLower.includes("12") ||
          msgLower.includes("july") ||
          msgLower.includes("jul");
        if (!hasDateMention) {
          isHallucination = true;
        }
      }
      if (!isHallucination) {
        return parsed;
      }
    }
  }

  // 2. If no extracted recordedAt or it was a hallucinated date, check for explicit absolute dates in the original message
  // Pattern: DD/MM/YYYY
  const slashDateMatch = originalMessage.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (slashDateMatch) {
    const day = parseInt(slashDateMatch[1], 10);
    const month = parseInt(slashDateMatch[2], 10) - 1; // 0-based
    const year = parseInt(slashDateMatch[3], 10);
    const d = new Date(year, month, day, 12, 0, 0); // use mid-day to avoid TZ issues
    if (!isNaN(d.getTime())) return d;
  }

  // Pattern: DD/MM (like 20/07)
  const shortSlashDateMatch = originalMessage.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (shortSlashDateMatch) {
    const first = parseInt(shortSlashDateMatch[1], 10);
    const second = parseInt(shortSlashDateMatch[2], 10);
    if (first <= 31 && second <= 12) {
      const year = messageDate.getFullYear();
      const d = new Date(year, second - 1, first, 12, 0, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Pattern: DD Month YYYY or DD Month (e.g., "20 July 2026" or "20 July")
  const monthsList = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
                      "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const monthRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthsList.join("|")})\\s*(\\d{4})?\\b`, "i");
  const monthMatch = originalMessage.match(monthRegex);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const monthStr = monthMatch[2].toLowerCase();
    let monthIdx = monthsList.indexOf(monthStr);
    if (monthIdx >= 12) monthIdx -= 12; // Handle shorthand months
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : messageDate.getFullYear();
    const d = new Date(year, monthIdx, day, 12, 0, 0);
    if (!isNaN(d.getTime())) return d;
  }

  // 3. Relative historical checks (yesterday, kal, last night, kal raat, yesterday morning)
  const isYesterday = msgLower.includes("yesterday") ||
                      msgLower.includes("kal") ||
                      msgLower.includes("कल") ||
                      msgLower.includes("last night") ||
                      msgLower.includes("kal raat") ||
                      msgLower.includes("कल रात") ||
                      msgLower.includes("yesterday morning");

  if (isYesterday) {
    const date = new Date(messageDate);
    date.setDate(date.getDate() - 1);
    return date;
  }

  // Relative current day checks
  const isToday = msgLower.includes("today") ||
                  msgLower.includes("aaj") ||
                  msgLower.includes("आज") ||
                  msgLower.includes("now") ||
                  msgLower.includes("abhi") ||
                  msgLower.includes("morning") ||
                  msgLower.includes("subah") ||
                  msgLower.includes("सुबह") ||
                  msgLower.includes("dopahar") ||
                  msgLower.includes("दोपहर") ||
                  msgLower.includes("shaam") ||
                  msgLower.includes("शाम") ||
                  msgLower.includes("raat") ||
                  msgLower.includes("रात") ||
                  msgLower.includes("this morning") ||
                  msgLower.includes("afternoon") ||
                  msgLower.includes("evening") ||
                  msgLower.includes("night");

  if (isToday) {
    return new Date(messageDate);
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

  const cleanedMessage = stripNumbersBelongingToDatesAndTimes(originalMessage);

  // Extract all numbers from cleaned message (integers and decimals)
  const numbersInMessage = cleanedMessage.match(/\d+(\.\d+)?/g) || [];
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

  // If parameter is weight and value is in kg, we might have had lbs in the message
  if (parameter === "weight") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      const matchFound = floatNumbers.some(n => {
        // Direct match with tolerance (e.g. 72.4 vs 72.4)
        if (Math.abs(n - valNum) < 0.2) return true;
        // lbs match (lbs to kg conversion: kg = lbs * 0.45359237)
        const expectedKg = n * 0.45359237;
        if (Math.abs(expectedKg - valNum) < 1.0) return true;
        return false;
      });
      if (matchFound) return true;
    }
  }

  // If parameter is height, can we support feet/inches conversions?
  if (parameter === "height") {
    const valNum = Number(value);
    if (!isNaN(valNum)) {
      // Direct match in cm first
      if (floatNumbers.some(n => Math.abs(n - valNum) < 0.2)) {
        return true;
      }
      // Check if feet and inches representation exists in message
      // E.g., if there are two numbers in the message like 5 and 8, they could represent feet and inches.
      for (let i = 0; i < floatNumbers.length; i++) {
        const ft = floatNumbers[i];
        if (ft >= 3 && ft <= 8) { // reasonable feet range
          // Check if there is an inch number
          for (let j = 0; j < floatNumbers.length; j++) {
            if (i === j) continue;
            const inch = floatNumbers[j];
            if (inch >= 0 && inch < 12) {
              const cm = (ft * 12 + inch) * 2.54;
              if (Math.abs(cm - valNum) < 3.0) return true;
            }
          }
          // Also check single feet measurement (e.g. "5 feet" -> 152.4 cm)
          const cmOnlyFt = ft * 12 * 2.54;
          if (Math.abs(cmOnlyFt - valNum) < 3.0) return true;
        }
      }
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
export function findUnresolvedPlausibleNumbers(
  originalMessage: string,
  candidateRecords: CandidateRecord[]
): number[] {
  let cleaned = stripNumbersBelongingToDatesAndTimes(originalMessage);

  // Also strip any words like OTP, ID, Order, PAT, etc. and their following numbers to prevent non-health numbers
  cleaned = cleaned.replace(/\b(?:otp|order|id|pat|msg|hosp|user|doctor|doc|visit|enc)\s*\d+/gi, "");
  // Also strip 4+ digit numbers (like 1256, 2026, etc. which are not home health measurements)
  cleaned = cleaned.replace(/\b\d{4,}\b/g, "");

  // Now find all numbers (including decimals)
  const numbersInMessage = cleaned.match(/\b\d+(?:\.\d+)?\b/g) || [];
  const floatNumbers = numbersInMessage.map(n => parseFloat(n));

  // Identify the numbers that are represented in candidateRecords
  const representedNumbers: number[] = [];
  for (const record of candidateRecords) {
    if (record.parameter === "blood_pressure") {
      if (record.systolic !== undefined) representedNumbers.push(record.systolic);
      if (record.diastolic !== undefined) representedNumbers.push(record.diastolic);
    } else if (record.value !== undefined && record.value !== null) {
      const val = Number(record.value);
      if (!isNaN(val)) {
        representedNumbers.push(val);
        if (record.parameter === "body_temperature") {
          representedNumbers.push(val * 1.8 + 32);
        }
        if (record.parameter === "weight") {
          representedNumbers.push(val / 0.45359237);
        }
      }
    }
  }

  const unresolved: number[] = [];
  for (const num of floatNumbers) {
    // Plausible measurements are usually between 30 and 500
    if (num < 30 || num > 500) {
      continue;
    }

    const isRepresented = representedNumbers.some(rn => Math.abs(rn - num) < 1.0);
    if (!isRepresented) {
      if (!unresolved.some(un => Math.abs(un - num) < 0.1)) {
        unresolved.push(num);
      }
    }
  }

  return unresolved;
}

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
  whatsappMessageId: string,
  messageDate?: Date
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
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt as string | null, messageDate),
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
          recordedAt: resolveRecordedAt(originalMessage, item.recordedAt, messageDate),
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
