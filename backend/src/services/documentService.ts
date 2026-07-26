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

  try {
    const modelName = process.env.OPENROUTER_MODEL || "tencent/hy3";
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const completion = await client.chat.completions.create({
      model: modelName,
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

    console.log(`🔍 [Stage Diagnostic] [DOCUMENT_TEXT_EXTRACTION_RESULT] Non-empty: ${!!ocrText.trim()}, Char count: ${ocrText.length}`);

    return ocrText;
  } catch (err: any) {
    console.error("❌ Document OCR service error:", err.message || err);
    throw new Error("OCR text extraction failed.");
  }
}

/**
 * Extracts structured lab observations from raw medical document text using OpenAI / OpenRouter
 */
export async function extractStructuredLabData(text: string): Promise<any[]> {
  if (mockExtractStructuredLabData) {
    return mockExtractStructuredLabData(text);
  }

  if (!text || !text.trim()) {
    return [];
  }

  try {
    const modelName = process.env.OPENROUTER_MODEL || "tencent/hy3";
    const completion = await client.chat.completions.create({
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

    const content = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(content);
    return parsed.observations || [];
  } catch (error: any) {
    console.error("❌ Lab extraction service error:", error?.message || error);
    return [];
  }
}
