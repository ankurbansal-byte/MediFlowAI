import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

// ================================
// Normal AI Reply
// ================================
export async function getAIReply(userMessage: string): Promise<string> {
  try {
    const completion = await client.chat.completions.create({
      model: "tencent/hy3:free",
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
  try {
    const completion = await client.chat.completions.create({
      model: "tencent/hy3:free",
      messages: [
        {
          role: "system",
          content: `
You are MediFlowAI Health Record Extraction Engine.

Your ONLY job is to extract structured health measurements from the patient's message.

Return ONLY valid JSON.

Always return a JSON ARRAY.

If only one health record is found, still return an array with one object.

If nothing is found, return:

[]

Never explain.
Never add markdown.
Never add \`\`\`.

If no health measurement exists, return:

{
  "parameter": null
}

Supported Parameters:

Also extract when the measurement was actually taken.

Return a new field:

"recordedAt"

Rules:

- If the patient mentions today, yesterday, morning, afternoon, evening, night, return an ISO datetime.
- If the patient gives an exact date and/or time, use it.
- If the patient does not mention any time, return null.

Never use the current server time.
Infer the measurement time only from the patient's message.

1. blood_sugar
2. blood_pressure
3. heart_rate
4. oxygen_saturation
5. body_temperature
6. weight
7. height
8. bmi
9. hba1c
10. cholesterol_total
11. cholesterol_ldl
12. cholesterol_hdl
13. triglycerides
14. hemoglobin
15. creatinine
16. uric_acid
17. respiratory_rate

Use these units:

blood_sugar -> mg/dL
blood_pressure -> mmHg
heart_rate -> bpm
oxygen_saturation -> %
body_temperature -> °C
weight -> kg
height -> cm
bmi -> kg/m²
hba1c -> %
cholesterol_total -> mg/dL
cholesterol_ldl -> mg/dL
cholesterol_hdl -> mg/dL
triglycerides -> mg/dL
hemoglobin -> g/dL
creatinine -> mg/dL
uric_acid -> mg/dL
respiratory_rate -> breaths/min

Examples:

User:
My sugar is 145

Return:
[
  {
    "parameter":"blood_sugar",
    "value":145,
    "unit":"mg/dL"
  }
]

User:
BP is 120/80

Return:
[
  {
    "parameter":"blood_pressure",
    "systolic":120,
    "diastolic":80,
    "unit":"mmHg"
  }
]

User:
Pulse is 84

Return:
{
 "parameter":"heart_rate",
 "value":84,
 "unit":"bpm"
}

User:
SpO2 is 97

Return:
{
 "parameter":"oxygen_saturation",
 "value":97,
 "unit":"%"
}

User:
Weight 74 kg

Return:
{
 "parameter":"weight",
 "value":74,
 "unit":"kg"
}

User:
Height 172 cm

Return:
{
 "parameter":"height",
 "value":172,
 "unit":"cm"
}

User:
Temperature 101 F

Convert Fahrenheit to Celsius.

Return:
{
 "parameter":"body_temperature",
 "value":38.3,
 "unit":"°C"
}

User:
HbA1c 7.2

Return:
{
 "parameter":"hba1c",
 "value":7.2,
 "unit":"%"
}

...
User:
Creatinine 1.1

Return:
[
 {
  "parameter":"creatinine",
  "value":1.1,
  "unit":"mg/dL"
 }
]

User:

Morning sugar 145.
Afternoon sugar 168.
BP 120/80.
Pulse 82.

Return:

[
  {
    "parameter":"blood_sugar",
    "value":145,
    "unit":"mg/dL"
  },
  {
    "parameter":"blood_sugar",
    "value":168,
    "unit":"mg/dL"
  },
  {
    "parameter":"blood_pressure",
    "systolic":120,
    "diastolic":80,
    "unit":"mmHg"
  },
  {
    "parameter":"heart_rate",
    "value":82,
    "unit":"bpm"
  }
]
User:

Today morning my sugar was 145.

Return:

[
  {
    "parameter":"blood_sugar",
    "value":145,
    "unit":"mg/dL",
    "recordedAt":"2026-07-12T08:00:00"
  }
]
  User:

Yesterday night BP was 150/95.

Return:

[
  {
    "parameter":"blood_pressure",
    "systolic":150,
    "diastolic":95,
    "unit":"mmHg",
    "recordedAt":"2026-07-11T21:00:00"
  }
]
  User:

Sugar 145.

Return:

[
  {
    "parameter":"blood_sugar",
    "value":145,
    "unit":"mg/dL",
    "recordedAt":null
  }
]

Always return valid JSON only.
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
    console.error("HEALTH DATA EXTRACTION ERROR");
    console.error(error);

    return "";
  }
}