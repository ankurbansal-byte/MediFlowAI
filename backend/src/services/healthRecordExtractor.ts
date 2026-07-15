export interface HealthRecord {
  patientId: string;

  parameter: string;

  value: string | number;

  unit: string;

  recordedAt: Date;

  source: "text" | "voice";

  confidence: number;

  originalMessage: string;

  whatsappMessageId: string;
}

export async function extractHealthRecord(
  message: string,
  patientId: string
): Promise<HealthRecord | null> {

  // AI अगले Step में यहाँ JSON बनाएगा

  return null;
}