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

export function parseHealthRecord(
  aiResponse: string,
  patientId: string,
  source: "text" | "voice",
  originalMessage: string,
  whatsappMessageId: string
): HealthRecord[] {
  try {
    const data = JSON.parse(aiResponse);

    if (!Array.isArray(data)) {
      return [];
    }

    const records: HealthRecord[] = [];

    for (const item of data) {
      if (!item.parameter) continue;

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

        whatsappMessageId,
      });
    }

    return records;
  } catch (error: any) {
    console.error("❌ [JSON Parse Error] Failed to parse AI response as JSON:", error?.message || error);
    console.error("📄 Raw response content that failed parsing was:", JSON.stringify(aiResponse));
    return [];
  }
}
