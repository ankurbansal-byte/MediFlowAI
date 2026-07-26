import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { extractMedicalDocumentText, extractStructuredLabData, setMockExtractStructuredLabData, setMockExtractMedicalDocumentText } from "./services/documentService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS, MOCK_LAB_REPORTS, MOCK_LAB_OBSERVATIONS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  setPendingClarification,
} from "./services/pendingClarificationService";
import axios from "axios";
import OpenAI from "openai";
import fs from "fs";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";
process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";
process.env.PHONE_NUMBER_ID = "mock-phone-id";
process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES = "330"; // IST

// Configure standard environment models for the test
process.env.OPENROUTER_MODEL = "tencent/hy3";
process.env.OPENROUTER_VISION_MODEL = "google/gemini-2.5-flash";

let axiosPostCalls: Array<{ url: string; data: any }> = [];
let axiosGetCalls: Array<{ url: string; config?: any }> = [];

let mockMetadataResponse: any = {
  data: {
    url: "https://mock-meta-cdn.com/fbs-report.jpg",
    mime_type: "image/jpeg",
    file_size: 150000,
  }
};

let mockDownloadResponse: any = {
  data: Buffer.from("fake-jpeg-binary-data")
};

let axiosGetError: any = null;

(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
};

(axios as any).get = async (url: string, config?: any) => {
  axiosGetCalls.push({ url, config });
  if (axiosGetError) {
    throw axiosGetError;
  }
  if (url.includes("mock-meta-cdn.com")) {
    return mockDownloadResponse;
  }
  return mockMetadataResponse;
};

// Spy on FS write and delete to check cleanup
let writtenFiles = new Set<string>();
let deletedFiles = new Set<string>();

const origWriteFileSync = fs.writeFileSync;
const origUnlinkSync = fs.unlinkSync;

(fs as any).writeFileSync = (filePath: any, data: any, options: any) => {
  if (typeof filePath === "string" && filePath.includes("uploads")) {
    writtenFiles.add(filePath);
  }
  return origWriteFileSync(filePath, data, options);
};

(fs as any).unlinkSync = (filePath: any) => {
  if (typeof filePath === "string" && filePath.includes("uploads")) {
    deletedFiles.add(filePath);
  }
  return origUnlinkSync(filePath);
};

// Spy on diagnostic logs
let capturedLogs: string[] = [];
const origConsoleLog = console.log;
const origConsoleError = console.error;

console.log = (...args: any[]) => {
  const line = args.join(" ");
  capturedLogs.push(line);
  return origConsoleLog(...args);
};

console.error = (...args: any[]) => {
  const line = args.join(" ");
  capturedLogs.push(line);
  return origConsoleError(...args);
};

const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.sendStatus = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

const makeImagePayload = (
  from: string,
  mediaId: string,
  id: string,
  mimeType = "image/jpeg",
  timestamp?: string
): any => {
  return {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id,
                    from,
                    type: "image",
                    image: {
                      id: mediaId,
                      mime_type: mimeType,
                    },
                    timestamp: timestamp || "1784541600"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
};

const makeDocumentPayload = (
  from: string,
  mediaId: string,
  id: string,
  mimeType = "application/pdf",
  timestamp?: string
): any => {
  return {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id,
                    from,
                    type: "document",
                    document: {
                      id: mediaId,
                      mime_type: mimeType,
                    },
                    timestamp: timestamp || "1784541600"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
};

const makeTextPayload = (from: string, messageText: string, id: string, timestamp?: string): any => {
  return {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id,
                    from,
                    type: "text",
                    text: { body: messageText },
                    timestamp: timestamp || "1784541600"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
};

// Track OpenAI call parameters
let completionCalls: any[] = [];
let mockCompletionResponses: string[] = [];
let mockCompletionError: any = null;

(OpenAI.Chat.Completions.prototype as any).create = async function (params: any) {
  completionCalls.push(params);
  if (mockCompletionError) {
    throw mockCompletionError;
  }
  const nextResponse = mockCompletionResponses.shift() || "";
  return {
    choices: [
      {
        message: {
          content: nextResponse,
        },
      },
    ],
  };
};

function resetState() {
  clearWebhookDeduplicationCache();
  clearAllPendingClarifications();
  setMockExtractHealthData(async () => "");
  setMockExtractStructuredLabData(null);
  setMockExtractMedicalDocumentText(null);
  axiosPostCalls = [];
  axiosGetCalls = [];
  axiosGetError = null;
  writtenFiles.clear();
  deletedFiles.clear();
  capturedLogs = [];
  completionCalls = [];
  mockCompletionResponses = [];
  mockCompletionError = null;

  mockMetadataResponse = {
    data: {
      url: "https://mock-meta-cdn.com/fbs-report.jpg",
      mime_type: "image/jpeg",
      file_size: 150000,
    }
  };
  mockDownloadResponse = {
    data: Buffer.from("fake-jpeg-binary-data")
  };

  process.env.OPENROUTER_MODEL = "tencent/hy3";
  process.env.OPENROUTER_VISION_MODEL = "google/gemini-2.5-flash";

  // Seed Users
  dynamicMockUsers.length = 0;
  dynamicMockUsers.push({
    username: "PAT-110",
    role: "patient",
    patientId: "PAT-110",
    hospitalId: "HOSP-001",
    fullName: "Patient One Ten",
    mobileNumber: "+917618432290",
    status: "active",
  });
  dynamicMockUsers.push({
    username: "PAT-111",
    role: "patient",
    patientId: "PAT-111",
    hospitalId: "HOSP-002",
    fullName: "Patient One Eleven",
    mobileNumber: "+917618432291",
    status: "active",
  });

  MOCK_RECORDS["PAT-110"] = [] as any[];
  MOCK_LAB_REPORTS["PAT-110"] = [] as any[];
  MOCK_LAB_OBSERVATIONS["PAT-110"] = [] as any[];

  MOCK_RECORDS["PAT-111"] = [] as any[];
  MOCK_LAB_REPORTS["PAT-111"] = [] as any[];
  MOCK_LAB_OBSERVATIONS["PAT-111"] = [] as any[];
}

async function runTests() {
  console.log("⚙️ Running Sprint 44.3 Structured Lab Extraction Reliability Suite...");

  // =========================================================================
  // Test 1: valid JSON response from LLM
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) 77 mg/dl");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl", referenceRangeText: "60 to 110" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-fbs-jpg", "msg-jpg-1"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should have saved 1 observation");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.canonicalTestKey, "fbs", "Should be FBS");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.value, 77, "Value should be 77");
  console.log("✅ Test 1 Passed: Valid JSON response from LLM parsed correctly.");

  // =========================================================================
  // Test 2: markdown-fenced JSON from LLM
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) 77 mg/dl");
  mockCompletionResponses.push("```json\n" + JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl" }
    ]
  }) + "\n```");

  await receiveMessage(makeImagePayload("917618432290", "media-fbs-jpg-md", "msg-jpg-2"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should have saved 1 observation from markdown code fence");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.canonicalTestKey, "fbs");
  console.log("✅ Test 2 Passed: Markdown-fenced JSON stripped and parsed correctly.");

  // =========================================================================
  // Test 3: empty model response -> invokes deterministic fallback
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) 77 mg/dl");
  mockCompletionResponses.push(""); // empty response

  await receiveMessage(makeImagePayload("917618432290", "media-fbs-jpg-empty", "msg-jpg-3"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should fall back and save 1 observation from OCR text");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.canonicalTestKey, "fbs");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.value, 77);
  console.log("✅ Test 3 Passed: Empty model response falls back safely.");

  // =========================================================================
  // Test 4: truncated / malformed JSON from LLM -> invokes deterministic fallback
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) 77 mg/dl");
  mockCompletionResponses.push("{\"reportDate\": \"2026-07-20\", \"observations\": [{\"testName\": \"FBS\""); // malformed/truncated

  await receiveMessage(makeImagePayload("917618432290", "media-fbs-jpg-malformed", "msg-jpg-4"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should fall back and save 1 observation on malformed LLM response");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.canonicalTestKey, "fbs");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.value, 77);
  console.log("✅ Test 4 Passed: Truncated/malformed JSON falls back safely.");

  // =========================================================================
  // Test 5: deterministic fallback from readable OCR text
  // =========================================================================
  resetState();
  // We'll throw an error on the second completion call (structured extraction) to force fallback
  mockCompletionResponses.push("Fasting Blood Glucose / FBS: 105 mg/dL; Hemoglobin: 14.2 g/dL; Creatinine: 0.9 mg/dL; TSH: 2.1 uIU/mL");
  mockCompletionResponses.push(""); // Empty to trigger fallback

  await receiveMessage(makeImagePayload("917618432290", "media-multi-fallback", "msg-jpg-5"), mockResponse() as any);
  const obs = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(obs.length, 4, "Should extract 4 observations from OCR text");

  const fbs = obs.find(o => o.canonicalTestKey === "fbs");
  const hb = obs.find(o => o.canonicalTestKey === "hemoglobin");
  const creat = obs.find(o => o.canonicalTestKey === "creatinine");
  const tsh = obs.find(o => o.canonicalTestKey === "tsh");

  assert.strictEqual(fbs?.value, 105);
  assert.strictEqual(hb?.value, 14.2);
  assert.strictEqual(creat?.value, 0.9);
  assert.strictEqual(tsh?.value, 2.1);
  console.log("✅ Test 5 Passed: Deterministic fallback successfully extracts various standard lab tests.");

  // =========================================================================
  // Test 6: FBS and PPBS extracted separately
  // =========================================================================
  resetState();
  mockCompletionResponses.push("FBS 82 mg/dL \n PPBS 135 mg/dL");
  mockCompletionResponses.push(""); // Force deterministic fallback

  await receiveMessage(makeImagePayload("917618432290", "media-sugar-sep", "msg-jpg-6"), mockResponse() as any);
  const obsSugar = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(obsSugar.length, 2, "Should extract two separate sugar observations");
  const fbsRecord = obsSugar.find(o => o.canonicalTestKey === "fbs");
  const ppbsRecord = obsSugar.find(o => o.canonicalTestKey === "ppbs");
  assert.strictEqual(fbsRecord?.value, 82);
  assert.strictEqual(ppbsRecord?.value, 135);
  console.log("✅ Test 6 Passed: FBS and PPBS extracted separately without collapsing.");

  // =========================================================================
  // Test 7: HbA1c extraction
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Glycated Hemoglobin (HbA1c) 5.9 %");
  mockCompletionResponses.push(""); // Force deterministic fallback

  await receiveMessage(makeImagePayload("917618432290", "media-hba1c-fb", "msg-jpg-7"), mockResponse() as any);
  const obsHba1c = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(obsHba1c.length, 1, "Should extract HbA1c");
  assert.strictEqual(obsHba1c[0].canonicalTestKey, "hba1c");
  assert.strictEqual(obsHba1c[0].value, 5.9);
  assert.strictEqual(obsHba1c[0].unit, "%");
  console.log("✅ Test 7 Passed: HbA1c extracted correctly with unit.");

  // =========================================================================
  // Test 8: no fabrication when OCR text lacks a value
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) \n Hemoglobin value is missing");
  mockCompletionResponses.push(""); // Force deterministic fallback

  await receiveMessage(makeImagePayload("917618432290", "media-lack-val", "msg-jpg-8"), mockResponse() as any);
  const obsLack = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(obsLack.length, 0, "No observations should be saved if there are no corresponding numeric values next to the tests");
  console.log("✅ Test 8 Passed: No fabrication when OCR text lacks numerical values.");

  // =========================================================================
  // Test 9: duplicate prevention
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose 88 mg/dL");
  mockCompletionResponses.push(""); // Force deterministic fallback

  // Send first time
  await receiveMessage(makeImagePayload("917618432290", "media-dup-chk", "msg-jpg-9"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_REPORTS["PAT-110"]?.length, 1, "Should have 1 lab report saved");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should have 1 lab observation saved");

  // Send second time with same whatsappMessageId
  await receiveMessage(makeImagePayload("917618432290", "media-dup-chk", "msg-jpg-9"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_REPORTS["PAT-110"]?.length, 1, "Should still have 1 lab report (duplicate skipped)");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should still have 1 lab observation (duplicate skipped)");
  console.log("✅ Test 9 Passed: Duplicate prevention works perfectly.");

  // =========================================================================
  // Test 10: patient / tenant isolation
  // =========================================================================
  resetState();
  mockCompletionResponses.push("FBS 85 mg/dL");
  mockCompletionResponses.push(""); // Force deterministic fallback

  // Send for PAT-110 (HOSP-001)
  await receiveMessage(makeImagePayload("917618432290", "media-iso-1", "msg-iso-1"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "PAT-110 should have 1 observation");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-111"]?.length, 0, "PAT-111 should have 0 observations");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.hospitalId, "HOSP-001", "Tenant ID should be HOSP-001");

  mockCompletionResponses.push("FBS 90 mg/dL");
  mockCompletionResponses.push(""); // Force deterministic fallback

  // Send for PAT-111 (HOSP-002)
  await receiveMessage(makeImagePayload("917618432291", "media-iso-2", "msg-iso-2"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-111"]?.length, 1, "PAT-111 should have 1 observation now");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-111"]?.[0]?.hospitalId, "HOSP-002", "Tenant ID should be HOSP-002");
  console.log("✅ Test 10 Passed: Tenant/Patient isolation validated.");

  // =========================================================================
  // Test 11: existing Sprint 44.2 regression coverage
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose 77 mg/dl \n Postprandial Blood Glucose 120 mg/dl");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl", referenceRangeText: "60 to 110" },
      { testName: "PPBS", canonicalTestKey: "ppbs", value: 120, unit: "mg/dl", referenceRangeText: "80 to 140" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-glucose-jpg", "msg-jpg-11"), mockResponse() as any);

  assert.strictEqual(completionCalls.length, 2, "Should invoke OpenRouter exactly twice");

  // Assert that OCR step used the dedicated vision model
  const ocrCall = completionCalls[0];
  assert.strictEqual(ocrCall.model, "google/gemini-2.5-flash", "OCR call must use the configured OPENROUTER_VISION_MODEL");

  // Assert that structured parser step used the standard text model
  const structureCall = completionCalls[1];
  assert.strictEqual(structureCall.model, "tencent/hy3", "Structured parsing call must use standard OPENROUTER_MODEL");

  console.log("✅ Test 11 Passed: Sprint 44.2 regression coverage fully satisfied.");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 44.3 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
