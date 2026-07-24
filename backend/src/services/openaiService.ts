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
  "unresolvedMeasurements": number[],
  "reason": string
}

Rules for Classification:

1. action = "RECORD":
   - Use when enough factual information exists to create a valid health record.
   - All extracted candidateRecords must be fully valid and non-ambiguous.
   - For blood_pressure, both systolic and diastolic must be present (e.g., "128/82" or "128 82" or "130 by 85").
   - For body_temperature, a clear unit (F, C, °F, °C) must be explicitly stated or safely established. If unit is absent, use action "CLARIFY".
   - For blood_sugar, a clear glucose context (fasting, pre_meal, post_meal, random) must be explicitly present. If glucose context is missing/unknown (e.g. "Sugar 125"), you MUST set action to "CLARIFY" with "missingFields": ["glucose_context"] - NEVER default to random or unknown for RECORD action.
   - Example: "Aaj fasting sugar 125 thi" -> action "RECORD", language "hinglish", parameter "blood_sugar", value 125, context "fasting".
   - Example: "BP 128/82 pulse 74" -> action "RECORD", multiple candidate records (blood_pressure and heart_rate).
   - Example: "Oxygen 97%" -> action "RECORD", parameter "oxygen_saturation", value 97, unit "%".
   - Example: "Weight 72.4 kg" -> action "RECORD", parameter "weight", value 72.4, unit "kg".

2. action = "CLARIFY":
   - Use when the message contains health parameter mentions, but important required fields for safe recording are missing/ambiguous, OR when there are unresolved plausible health measurements in the message.
   - Examples of missing/ambiguous fields:
     - "Sugar 125" -> missing glucose context. Action "CLARIFY", missingFields ["glucose_context"], candidateRecords: [{"parameter": "blood_sugar", "value": 125, "unit": "mg/dL", "context": "unknown"}]
     - "BP 140" -> missing diastolic value. Action "CLARIFY", missingFields ["diastolic"], candidateRecords: [{"parameter": "blood_pressure", "systolic": 140, "unit": "mmHg"}]
     - "Temperature 38" or "bukhar 101" -> missing unit. Action "CLARIFY", missingFields ["temperature_unit"], candidateRecords: [{"parameter": "body_temperature", "value": 38, "unit": "unknown"}]
     - "oxygen check ki" -> no value supplied. Action "CLARIFY", missingFields ["value"], candidateRecords: []
   - If there is a plausible numeric health measurement that cannot be assigned to any parameter (e.g., "140, 160/80" where 160/80 is recognized but 140 is unresolved/ambiguous; or "125, 72" where both are unresolved), you must put those numbers in "unresolvedMeasurements" array and set action to "CLARIFY" and intent to "ambiguous_health_message". Do NOT guess the parameter, and do NOT silently ignore them.
   - Never invent or fabricate missing values.

3. action = "IGNORE":
   - Use when the message does not contain any recordable physiological measurements (e.g., "Hello", "Thank you", "Okay doctor").
   - Also, symptom-only messages without any numeric values (e.g. "mujhe bukhar lag raha hai", "chakkar aa raha hai", "I feel weak", "saans phool rahi hai") must be action "IGNORE" or "CLARIFY" (if user wants to start a recording but gave no values), but must NOT create any health records. Set candidateRecords to [] and missingFields to [].

4. Language Detection:
   - "hindi" for predominantly Devanagari script (e.g. "आज सुबह शुगर 125 थी").
   - "hinglish" for Hindi/Indian conversational language written primarily in Latin/Roman script, including mixed English medical terms (e.g. "Aaj fasting sugar 125 thi", "mera bp 130 by 85 hai").
   - "english" for predominantly English sentence structure (e.g. "My fasting glucose was 125 this morning").
   - "unknown" if language cannot be determined.

5. Parameters & Default Units:
   - blood_sugar -> "mg/dL"
   - blood_pressure -> "mmHg" (requires both "systolic" and "diastolic")
   - heart_rate -> "bpm" (Pulse / dhadkan / pulse / heart rate)
   - oxygen_saturation -> "%" (Oxygen / oxygen level / SpO2 / ऑक्सीजन)
   - body_temperature -> "°C" (Convert Fahrenheit F to Celsius C: C = (F - 32) * 5/9, e.g. 98.6 F -> 37 °C)
   - weight -> "kg" (Weight / wajan / वजन / kilo)
   - respiratory_rate -> "breaths/min" (Respiratory rate / breathing rate / saans / सांस)
   - height -> "cm" (Height / meri height / कद / feet/inches safely converted to cm: 1 inch = 2.54 cm, 1 foot = 12 inches)

6. Glucose Context Mapping:
   - fasting: "fasting", "khali pet", "खाली पेट"
   - pre_meal: "before breakfast", "before lunch", "before dinner", "khane se pehle", "खाने से पहले", "pre-meal"
   - post_meal: "after breakfast", "after lunch", "after dinner", "khane ke baad", "खाने के बाद", "post-meal", "2 hours after meal"
   - random: "random", "kabhi bhi check ki" (ONLY when explicitly stated)
   - unknown: default when context cannot be safely mapped, but forces action to CLARIFY.

7. Temporal Expression Extraction:
   - Look for terms and extract them to "recordedAt":
     - relative: "today"/"aaj"/"आज" -> "today", "yesterday"/"kal"/"कल" -> "yesterday", "morning"/"subah"/"सुबह" -> "morning", "afternoon"/"dopahar"/"दोपहर" -> "afternoon", "evening"/"shaam"/"शाम" -> "evening", "night"/"raat"/"रात" -> "night", "last night"/"kal raat"/"कल रात" -> "last night", "yesterday morning" -> "yesterday morning", "this morning" -> "this morning".
     - explicit dates: "20 July", "20 July 2026", "20/07/2026" etc. -> extract as the absolute date string.

Return ONLY valid JSON. No markdown backticks (such as \`\`\`json), no extra text.
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
