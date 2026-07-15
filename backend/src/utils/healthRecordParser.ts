import { HealthRecord } from "../services/healthRecordExtractor";


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

  recordedAt: item.recordedAt
    ? new Date(item.recordedAt)
    : new Date(),

  source,

  confidence: 0.99,

  originalMessage,

  whatsappMessageId,
});
    }

    return records;
  } catch (error) {
    console.error("❌ Invalid JSON");
    return [];
  }
}