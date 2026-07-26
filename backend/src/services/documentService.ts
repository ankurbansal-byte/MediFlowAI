import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key",
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 15000, // 15 seconds timeout
});

// Testing / Mock support
let mockExtractMedicalDocumentText: ((filePath: string, mimeType: string) => Promise<string>) | null = null;
let mockExtractStructuredLabData: ((text: string) => Promise<any[]>) | null = null;

export function setMockExtractMedicalDocumentText(
  fn: ((filePath: string, mimeType: string) => Promise<string>) | null
) {
  mockExtractMedicalDocumentText = fn;
}

export function setMockExtractStructuredLabData(
  fn: ((text: string) => Promise<any[]>) | null
) {
  mockExtractStructuredLabData = fn;
}

/**
 * Extracts text from a document or image file using configured providers (mocked in testing)
 */
export async function extractMedicalDocumentText(
  filePath: string,
  mimeType: string
): Promise<string> {
  if (mockExtractMedicalDocumentText) {
    return mockExtractMedicalDocumentText(filePath, mimeType);
  }

  console.log(`🔍 [Stage Diagnostic] [DOCUMENT_TEXT_EXTRACTION_STARTED] MimeType: ${mimeType}`);

  const visionModel = process.env.OPENROUTER_VISION_MODEL;
  if (!visionModel || !visionModel.trim()) {
    console.error("❌ [Configuration Error] OPENROUTER_VISION_MODEL environment variable is missing.");
    throw new Error("OPENROUTER_VISION_MODEL is missing.");
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const completion = await client.chat.completions.create({
      model: visionModel,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "You are an advanced medical document OCR system. Extract all text from this laboratory report image verbatim. Include all test names, numeric values, units, reference ranges, and abnormal flags. Maintain the column and tabular structures as much as possible so that test names and values are clearly associated. Do not summarize, diagnose, or synthesize. If some text is unreadable, output '[unreadable]'.",
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        } as any,
      ],
    });

    const ocrText = completion.choices[0]?.message?.content || "";

    console.log(`🔍 [Stage Diagnostic] [DOCUMENT_TEXT_EXTRACTION_RESULT] Success: true, Model: ${visionModel}, Non-empty: ${!!ocrText.trim()}, Char count: ${ocrText.length}`);

    return ocrText;
  } catch (err: any) {
    const errMsg = err.message || String(err);
    console.error(`🔍 [Stage Diagnostic] [DOCUMENT_TEXT_EXTRACTION_RESULT] Success: false, Model: ${visionModel}`);

    if (errMsg.includes("No endpoints found that support image input") || err.status === 404 || err.statusCode === 404 || errMsg.includes("404")) {
      console.error("❌ [Vision Model Unavailable] VISION_MODEL_UNAVAILABLE: OpenRouter vision endpoint is unavailable or does not support image input.");
    }

    console.error("❌ Document OCR service error:", errMsg);
    throw new Error("OCR text extraction failed.");
  }
}

/**
 * Strips markdown code fences if returned by LLM.
 */
export function cleanJsonString(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
    cleaned = cleaned.replace(/\n?```$/, "");
  }
  return cleaned.trim();
}

/**
 * Deterministic fallback parser for clearly readable common lab rows in OCR text.
 * Only extracts values explicitly present in OCR text.
 * Never infers diagnosis, normality, or missing/fabricated values.
 */
export function deterministicFallbackParse(text: string): any[] {
  if (!text || !text.trim()) {
    return [];
  }

  const lines = text.split(/[\n;]+/);
  const observations: any[] = [];
  const seenKeys = new Set<string>();

  const TEST_PATTERNS = [
    {
      key: "hba1c",
      name: "HbA1c",
      regex: /\b(hba1c|glycated\s+hemoglobin|glycated\s+haemoglobin)\b/i,
      defaultUnit: "%"
    },
    {
      key: "hemoglobin",
      name: "Hemoglobin",
      regex: /\b(hemoglobin|haemoglobin|\bhb\b)(?!\s*a1c)\b/i,
      defaultUnit: "g/dL"
    },
    {
      key: "ppbs",
      name: "Postprandial Blood Glucose",
      regex: /\b(ppbs|postprandial\s+blood\s+glucose|postprandial\s+blood\s+sugar|postprandial\s+glucose|post\s+prandial\s+blood\s+sugar|post\s+prandial\s+blood\s+glucose|post-prandial\s+blood\s+glucose|post-prandial\s+blood\s+sugar)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "fbs",
      name: "Fasting Blood Glucose",
      regex: /\b(fbs|fasting\s+blood\s+glucose|fasting\s+blood\s+sugar|fasting\s+glucose|fasting\s+sugar)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "creatinine",
      name: "Creatinine",
      regex: /\b(creatinine|serum\s+creatinine)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "tsh",
      name: "TSH",
      regex: /\b(tsh|thyroid\s+stimulating\s+hormone)\b/i,
      defaultUnit: "µIU/mL"
    },
    {
      key: "hdl",
      name: "HDL Cholesterol",
      regex: /\b(hdl|hdl\s+cholesterol|hdl-cholesterol)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "ldl",
      name: "LDL Cholesterol",
      regex: /\b(ldl|ldl\s+cholesterol|ldl-cholesterol)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "triglycerides",
      name: "Triglycerides",
      regex: /\b(triglycerides|tg)\b/i,
      defaultUnit: "mg/dL"
    },
    {
      key: "cholesterol",
      name: "Total Cholesterol",
      regex: /\b(total\s+cholesterol|cholesterol)\b/i,
      defaultUnit: "mg/dL"
    }
  ];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    for (const pattern of TEST_PATTERNS) {
      if (seenKeys.has(pattern.key)) {
        continue;
      }

      if (pattern.key === "cholesterol") {
        const containsHdlOrLdl = /\b(hdl|ldl)\b/i.test(trimmedLine);
        const containsTotalExplicit = /\btotal\s+cholesterol\b/i.test(trimmedLine);
        if (containsHdlOrLdl && !containsTotalExplicit) {
          continue;
        }
      }

      const match = trimmedLine.match(pattern.regex);
      if (match) {
        const keywordIndex = match.index || 0;
        const matchedText = match[0];
        const substringAfter = trimmedLine.slice(keywordIndex + matchedText.length);

        const numMatch = substringAfter.match(/\b\d+(?:\.\d+)?\b/);
        if (numMatch) {
          const valueStr = numMatch[0];
          const valueNum = parseFloat(valueStr);

          let matchedUnit = pattern.defaultUnit;
          const unitMatch = substringAfter.match(/\b(%|mg\/dl|g\/dl|µiu\/ml|uiu\/ml|uIU\/mL)\b/i);
          if (unitMatch) {
            matchedUnit = unitMatch[1];
          }

          observations.push({
            testName: pattern.name,
            canonicalTestKey: pattern.key,
            value: valueNum,
            unit: matchedUnit,
            referenceRangeText: null,
            flag: null
          });

          seenKeys.add(pattern.key);
          break;
        }
      }
    }
  }

  return observations;
}

/**
 * Extracts structured lab observations from raw medical document text using OpenAI / OpenRouter
 */
export async function extractStructuredLabData(text: string): Promise<any[]> {
  if (mockExtractStructuredLabData) {
    return mockExtractStructuredLabData(text);
  }

  if (!text || !text.trim()) {
    console.log(`🔍 [Stage Diagnostic] [LAB_STRUCTURED_EXTRACTION_RESULT] Success: false (Empty OCR text), Count: 0`);
    return [];
  }

  let modelName = process.env.OPENROUTER_MODEL || "tencent/hy3";
  let llmSuccess = false;
  let llmParsedSucceeded = false;
  let fallbackUsed = false;
  let observations: any[] = [];

  try {
    let completion;
    try {
      completion = await client.chat.completions.create({
        model: modelName,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `
You are the MediFlowAI Structured Lab Report Extractor.
Analyze the provided raw OCR text from a laboratory report and extract structured test observations.

Conform exactly to the following JSON format:
{
  "reportDate": "YYYY-MM-DD" or null,
  "laboratoryName": "Name of lab" or null,
  "observations": [
    {
      "testName": "e.g. Hemoglobin / Hb",
      "canonicalTestKey": "hemoglobin" | "hba1c" | "fbs" | "ppbs" | "rbs" | "creatinine" | "urea" | "tsh" | "t3" | "t4" | "vitamin_d" | "vitamin_b12" | "rbc" | "wbc" | "platelets" | "cholesterol" | "hdl" | "ldl" | "triglycerides" | null,
      "value": number or string,
      "unit": "e.g. g/dL, %, mg/dL, µIU/mL, etc." or null,
      "referenceRangeText": "e.g. 13.5 - 17.5" or null,
      "flag": "high" | "low" | "normal" | null
    }
  ]
}

Strict Rules:
1. Preserve the original report terminology for "testName".
2. Keep the extracted value and unit tightly coupled. DO NOT convert units or fabricate them.
3. Only extract reference ranges if explicitly present in the text. DO NOT fabricate reference ranges under any circumstances.
4. "flag" can be set to "high" or "low" ONLY if the report explicitly states so (e.g., 'H', 'L', 'High', 'Low', 'abnormal') or if the reference range comparison makes it mathematically certain and the units are fully compatible. Otherwise, set it to "normal" or null.
5. DO NOT perform any diagnostics. Do not output fields containing diagnosis claims like "You have diabetes".
6. Extract unknown legitimate test names instead of discarding them.
`,
          },
          {
            role: "user",
            content: text,
          },
        ],
      });
    } catch (err: any) {
      const errMsg = err?.message || "";
      if (errMsg.includes("response_format") || errMsg.includes("format") || errMsg.includes("JSON")) {
        console.log(`⚠️ response_format: { type: "json_object" } not supported, retrying without response_format...`);
        completion = await client.chat.completions.create({
          model: modelName,
          max_tokens: 1000,
          messages: [
            {
              role: "system",
              content: `
You are the MediFlowAI Structured Lab Report Extractor.
Analyze the provided raw OCR text from a laboratory report and extract structured test observations.

Conform exactly to the following JSON format:
{
  "reportDate": "YYYY-MM-DD" or null,
  "laboratoryName": "Name of lab" or null,
  "observations": [
    {
      "testName": "e.g. Hemoglobin / Hb",
      "canonicalTestKey": "hemoglobin" | "hba1c" | "fbs" | "ppbs" | "rbs" | "creatinine" | "urea" | "tsh" | "t3" | "t4" | "vitamin_d" | "vitamin_b12" | "rbc" | "wbc" | "platelets" | "cholesterol" | "hdl" | "ldl" | "triglycerides" | null,
      "value": number or string,
      "unit": "e.g. g/dL, %, mg/dL, µIU/mL, etc." or null,
      "referenceRangeText": "e.g. 13.5 - 17.5" or null,
      "flag": "high" | "low" | "normal" | null
    }
  ]
}

Strict Rules:
1. Preserve the original report terminology for "testName".
2. Keep the extracted value and unit tightly coupled. DO NOT convert units or fabricate them.
3. Only extract reference ranges if explicitly present in the text. DO NOT fabricate reference ranges under any circumstances.
4. "flag" can be set to "high" or "low" ONLY if the report explicitly states so (e.g., 'H', 'L', 'High', 'Low', 'abnormal') or if the reference range comparison makes it mathematically certain and the units are fully compatible. Otherwise, set it to "normal" or null.
5. DO NOT perform any diagnostics. Do not output fields containing diagnosis claims like "You have diabetes".
6. Extract unknown legitimate test names instead of discarding them.
`,
            },
            {
              role: "user",
              content: text,
            },
          ],
        });
      } else {
        throw err;
      }
    }

    llmSuccess = true;
    const content = completion.choices[0]?.message?.content || "";

    if (content.trim()) {
      try {
        const cleanedContent = cleanJsonString(content);
        const parsed = JSON.parse(cleanedContent);
        if (parsed && Array.isArray(parsed.observations)) {
          observations = parsed.observations;
          llmParsedSucceeded = true;
        }
      } catch (parseError: any) {
        console.error("⚠️ LLM JSON Parse failed, will attempt deterministic fallback:", parseError.message);
      }
    }
  } catch (error: any) {
    console.error("❌ Lab structured extraction LLM call failed:", error?.message || error);
  }

  // Fallback to deterministic parser if LLM structured parsing did not succeed or returned empty results
  if (!llmParsedSucceeded || observations.length === 0) {
    fallbackUsed = true;
    observations = deterministicFallbackParse(text);
  }

  const finalCount = observations.length;
  const testNames = observations.map(o => o.canonicalTestKey || o.testName).join(", ");

  console.log(`🔍 [Stage Diagnostic] [LAB_STRUCTURED_EXTRACTION_RESULT] Success: ${llmSuccess}, Model: ${modelName}, LLM Parse Succeeded: ${llmParsedSucceeded}, Deterministic Fallback Used: ${fallbackUsed}, Count: ${finalCount}, Tests: ${testNames}`);

  return observations;
}
