import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key",
  baseURL: "https://openrouter.ai/api/v1",
});

// Testing / Mock support
let mockExtractHealthData: ((message: string) => Promise<string>) | null = null;

export function setMockExtractHealthData(
  fn: ((message: string) => Promise<string>) | null
) {
  mockExtractHealthData = fn;
}

// ================================
// Normal AI Reply
// ================================
export async function getAIReply(userMessage: string): Promise<string> {
  try {
    const modelName = process.env.OPENROUTER_MODEL || "tencent/hy3";
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: `
You are MediFlowAI.

You are a polite healthcare assistant.

Rules:
- Give short replies.
- Never claim to be a doctor.
- Suggest consulting a doctor when appropriate.
          `,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    return (
      completion.choices[0]?.message?.content ??
      "Sorry, I couldn't generate a response."
    );
  } catch (error: any) {
    console.error("OPENROUTER ERROR");
    console.error(error);

    return "AI service is temporarily unavailable.";
  }
}

// ================================
// Health Record Extraction
// ================================
export async function extractHealthData(
  message: string
): Promise<string> {
  if (mockExtractHealthData) {
    return mockExtractHealthData(message);
  }

  try {
    const modelName = process.env.OPENROUTER_MODEL || "tencent/hy3";
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: `
You are MediFlowAI Health Record Classification and Extraction Engine.

Your job is to analyze the patient's incoming WhatsApp message, detect language, determine the intent and action, and extract structured health parameters conforming exactly to the following JSON schema:

{
  "language": "hindi" | "hinglish" | "english" | "unknown",
  "action": "RECORD" | "CLARIFY" | "IGNORE",
  "intent": "health_measurement" | "conversational" | "ambiguous_health_message" | "unsupported" | "unknown",
  "candidateRecords": [
    {
      "parameter": "blood_sugar" | "blood_pressure" | "heart_rate" | "oxygen_saturation" | "body_temperature" | "weight" | "respiratory_rate" | "height",
      "value": number (or string for blood_pressure like "120/80"),
      "systolic": number (only for blood_pressure),
      "diastolic": number (only for blood_pressure),
      "unit": string,
      "context": "fasting" | "pre_meal" | "post_meal" | "random" | "unknown" (only for blood_sugar),
      "recordedAt": string | null,
      "confidence": number
    }
  ],
  "missingFields": string[],
  "reason": string
}

Rules for Classification:

1. action = "RECORD":
   - Use when enough factual information exists to create a valid health record.
   - Example: "Aaj fasting sugar 125 thi" -> action "RECORD", language "hinglish", parameter "blood_sugar", value 125, context "fasting".
   - Example: "BP 128/82 pulse 74" -> action "RECORD", multiple candidate records (blood_pressure and heart_rate).
   - Example: "Oxygen 97%" -> action "RECORD", parameter "oxygen_saturation", value 97.
   - Example: "Weight 72.4 kg" -> action "RECORD", parameter "weight", value 72.4.

2. action = "CLARIFY":
   - Use when the message appears to contain health information, but important fields required for safe/useful recording are missing or ambiguous.
   - Never invent/hallucinate the missing values.
   - Example: "Sugar 125" -> action "CLARIFY" because glucose context is unknown/missing. Set "missingFields": ["glucose_context"], "candidateRecords": [{"parameter": "blood_sugar", "value": 125, "unit": "mg/dL", "context": "unknown"}].
   - Example: "BP 140" -> action "CLARIFY" because diastolic value is missing. Set "missingFields": ["diastolic"], "candidateRecords": [{"parameter": "blood_pressure", "systolic": 140, "unit": "mmHg"}].

3. action = "IGNORE":
   - Use when the message does not contain any longitudinal physiological health records (e.g. "Thank you", "Hello", "Okay doctor").
   - Set "candidateRecords" to [] and "missingFields" to [].

4. Language Detection:
   - "hinglish" for Hindi written in Roman script (e.g., "Aaj fasting sugar 125 thi").
   - "hindi" for Hindi written in Devanagari script (e.g., "आज सुबह शुगर 125 थी").
   - "english" for English (e.g., "My fasting sugar was 125 this morning").
   - "unknown" if language cannot be determined.

5. Parameters & Units:
   - blood_sugar -> default unit: "mg/dL"
   - blood_pressure -> default unit: "mmHg" (also extract "systolic" and "diastolic")
   - heart_rate -> default unit: "bpm"
   - oxygen_saturation -> default unit: "%"
   - body_temperature -> default unit: "°C" (Convert Fahrenheit to Celsius if user inputs F, e.g. 98.6 F -> 37 °C)
   - weight -> default unit: "kg"
   - respiratory_rate -> default unit: "breaths/min"
   - height -> default unit: "cm"

6. Temporal Information:
   - If user mentions relative timing ("today", "yesterday", "kal", "aaj", "morning", "evening"), populate "recordedAt" with a relevant string or null. Do not use the current server time if not specified; let the parser handle it.

Return ONLY valid JSON. No markdown backticks, no explanations.
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error: any) {
    console.error("❌ [AI Service Error] Health data extraction failed via OpenRouter client.");
    console.error("📝 Error details:", error?.message || error);

    return "";
  }
}
