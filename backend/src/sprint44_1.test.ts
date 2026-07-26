import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS, MOCK_LAB_REPORTS, MOCK_LAB_OBSERVATIONS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
  setPendingClarification,
} from "./services/pendingClarificationService";
import axios from "axios";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";
process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";
process.env.PHONE_NUMBER_ID = "mock-phone-id";
process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES = "330"; // IST
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
console.log = (...args: any[]) => {
  const line = args.join(" ");
  capturedLogs.push(line);
  return origConsoleLog(...args);
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

// Mock OpenAI Chat Completions to simulate the real OpenAI multimodal/OpenRouter pipeline without network calls
let completionCallsCount = 0;
let mockCompletionResponses: string[] = [];
let mockCompletionError: any = null;

(OpenAI.Chat.Completions.prototype as any).create = async function (params: any) {
  completionCallsCount++;
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
  axiosPostCalls = [];
  axiosGetCalls = [];
  axiosGetError = null;
  writtenFiles.clear();
  deletedFiles.clear();
  capturedLogs = [];
  completionCallsCount = 0;
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

  MOCK_RECORDS["PAT-110"] = [] as any[];
  MOCK_LAB_REPORTS["PAT-110"] = [] as any[];
  MOCK_LAB_OBSERVATIONS["PAT-110"] = [] as any[];
}

async function runTests() {
  console.log("⚙️ Running Sprint 44.1 Multimodal Acceptances & Regression suite...");

  // =========================================================================
  // 1. real JPEG extraction path & FBS 77 / PPBS 120 separation & Urine glucose separate
  // =========================================================================
  resetState();

  // Vision Call 1: extract raw text verbatim (multimodal request)
  mockCompletionResponses.push(`
    Fasting Blood Glucose (FBS)    77    Ref 60 to 110    mg/dl
    Fasting Urine Glucose          80
    Postprandial Blood Glucose (PPBS) 120 Ref 80 to 140   mg/dl
    Postprandial Urine Glucose     130
  `);

  // Vision Call 2: structured JSON parser call from extractStructuredLabData
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Diagnostic Center",
    observations: [
      {
        testName: "Fasting Blood Glucose (FBS)",
        canonicalTestKey: "fbs",
        value: 77,
        unit: "mg/dl",
        referenceRangeText: "60 to 110",
        flag: "normal"
      },
      {
        testName: "Fasting Urine Glucose",
        canonicalTestKey: null,
        value: 80,
        unit: "",
        referenceRangeText: null,
        flag: null
      },
      {
        testName: "Postprandial Blood Glucose (PPBS)",
        canonicalTestKey: "ppbs",
        value: 120,
        unit: "mg/dl",
        referenceRangeText: "80 to 140",
        flag: "normal"
      },
      {
        testName: "Postprandial Urine Glucose",
        canonicalTestKey: null,
        value: 130,
        unit: "",
        referenceRangeText: null,
        flag: null
      }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-glucose-jpg", "msg-acceptance-1", "image/jpeg"), mockResponse() as any);

  // Assertion: Ensure both OpenRouter completion calls were made correctly
  assert.strictEqual(completionCallsCount, 2, "Should invoke OpenRouter exactly twice (OCR vision + Structured parse)");

  const observations = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(observations.length, 4, "Should extract exactly 4 observations");

  // FBS Verification
  const fbsObs = observations.find(o => o.canonicalTestKey === "fbs");
  assert(fbsObs, "Fasting Blood Glucose observation must exist");
  assert.strictEqual(fbsObs.value, 77, "FBS value must be 77");
  assert.strictEqual(fbsObs.unit, "mg/dl", "FBS unit must be mg/dl");
  assert.strictEqual(fbsObs.referenceRangeText, "60 to 110", "FBS reference range must match");

  // PPBS Verification
  const ppbsObs = observations.find(o => o.canonicalTestKey === "ppbs");
  assert(ppbsObs, "Postprandial Blood Glucose observation must exist");
  assert.strictEqual(ppbsObs.value, 120, "PPBS value must be 120");
  assert.strictEqual(ppbsObs.unit, "mg/dl", "PPBS unit must be mg/dl");
  assert.strictEqual(ppbsObs.referenceRangeText, "80 to 140", "PPBS reference range must match");

  // Separation Verification
  assert(fbsObs.testName !== ppbsObs.testName, "FBS and PPBS must remain separate");

  // Urine Glucose Mislabel Protection Verification
  const urineObs = observations.filter(o => o.testName.toLowerCase().includes("urine"));
  assert.strictEqual(urineObs.length, 2, "There should be exactly 2 urine glucose readings");
  for (const u of urineObs) {
    assert.notStrictEqual(u.canonicalTestKey, "fbs", "Urine glucose must not be mislabeled as Fasting Blood Sugar");
    assert.notStrictEqual(u.canonicalTestKey, "ppbs", "Urine glucose must not be mislabeled as PPBS");
    assert.notStrictEqual(u.canonicalTestKey, "blood_sugar", "Urine glucose must not be labeled as general blood sugar");
  }

  // Verification of success message
  const successMsg = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(successMsg.includes("4 lab results save"), "Hinglish success response confirms 4 lab results saved");

  console.log("✅ Assertion 1 (FBS 77, PPBS 120 separation & Urine glucose check) Passed");

  // =========================================================================
  // 2. PNG extraction path & Screenshot-style report
  // =========================================================================
  resetState();
  mockMetadataResponse.data.mime_type = "image/png";
  mockMetadataResponse.data.url = "https://mock-meta-cdn.com/screenshot-report.png";

  mockCompletionResponses.push("FBS 77 mg/dl PPBS 120 mg/dl surrounding browser chrome noise pdf viewer dark background");
  mockCompletionResponses.push(JSON.stringify({
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl", referenceRangeText: "60 to 110" },
      { testName: "PPBS", canonicalTestKey: "ppbs", value: 120, unit: "mg/dl", referenceRangeText: "80 to 140" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-screenshot-png", "msg-screenshot-2", "image/png"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 2, "Screenshot style PNG processed and observations extracted successfully");
  console.log("✅ Assertion 2 (PNG & Screenshot style) Passed");

  // =========================================================================
  // 3. Stage Diagnostics Presence
  // =========================================================================
  const allLogs = capturedLogs.join("\n");
  assert(allLogs.includes("[MEDIA_DOWNLOADED]"), "Must print MEDIA_DOWNLOADED diagnostic");
  assert(allLogs.includes("[DOCUMENT_TEXT_EXTRACTION_STARTED]"), "Must print DOCUMENT_TEXT_EXTRACTION_STARTED diagnostic");
  assert(allLogs.includes("[DOCUMENT_TEXT_EXTRACTION_RESULT]"), "Must print DOCUMENT_TEXT_EXTRACTION_RESULT diagnostic");
  assert(allLogs.includes("[LAB_STRUCTURED_EXTRACTION_RESULT]"), "Must print LAB_STRUCTURED_EXTRACTION_RESULT diagnostic");
  assert(allLogs.includes("[LAB_PERSISTENCE_RESULT]"), "Must print LAB_PERSISTENCE_RESULT diagnostic");

  // Strict privacy leak checks
  assert(!allLogs.includes("fake-jpeg-binary-data"), "Full OCR file data URL/raw content must not leak into diagnostic logs");
  console.log("✅ Assertion 3 (Stage Diagnostics & Privacy leak guards) Passed");

  // =========================================================================
  // 4. empty OCR handling
  // =========================================================================
  resetState();
  setPendingClarification("PAT-110", {
    patientId: "PAT-110",
    hospitalId: "HOSP-001",
    originalWhatsappMessageId: "orig-msg",
    originalSourceText: "fasting sugar",
    language: "hinglish",
    candidateRecords: [],
    missingFields: [],
    clarificationReason: "test",
    originalMessageDate: new Date()
  });
  mockCompletionResponses.push("      "); // empty vision OCR
  await receiveMessage(makeImagePayload("917618432290", "media-empty", "msg-empty-4"), mockResponse() as any);
  const out4 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out4.includes("Koi readable lab results nahi mile"), "Empty OCR returns localized no lab results message");
  console.log("✅ Assertion 4 Passed");

  // =========================================================================
  // 5. unreadable image handling
  // =========================================================================
  resetState();
  setPendingClarification("PAT-110", {
    patientId: "PAT-110",
    hospitalId: "HOSP-001",
    originalWhatsappMessageId: "orig-msg",
    originalSourceText: "fasting sugar",
    language: "hinglish",
    candidateRecords: [],
    missingFields: [],
    clarificationReason: "test",
    originalMessageDate: new Date()
  });
  mockCompletionResponses.push("This document contains [unreadable] blur image scan");
  mockCompletionResponses.push(JSON.stringify({ observations: [] })); // no structures parsed
  await receiveMessage(makeImagePayload("917618432290", "media-blur", "msg-blur-5"), mockResponse() as any);
  const out5 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out5.includes("Koi readable lab results nahi mile"), "Blur unreadable report outputs correct localized response");
  console.log("✅ Assertion 5 Passed");

  // =========================================================================
  // 6. OCR timeout/failure
  // =========================================================================
  resetState();
  mockCompletionError = new Error("Gateway Timeout (504)");
  await receiveMessage(makeImagePayload("917618432290", "media-timeout", "msg-timeout-6"), mockResponse() as any);
  const out6 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out6.includes("dikkat hui") || out6.includes("Failed to process"), "OpenRouter OCR timeout handled cleanly");
  console.log("✅ Assertion 6 Passed");

  // =========================================================================
  // 7. Cleanup on success and failure
  // =========================================================================
  resetState();
  mockCompletionResponses.push("FBS 77");
  mockCompletionResponses.push(JSON.stringify({ observations: [{ testName: "FBS", value: 77, unit: "mg/dl" }] }));
  await receiveMessage(makeImagePayload("917618432290", "media-success-cleanup", "msg-clean-7"), mockResponse() as any);
  const successFile = Array.from(writtenFiles)[0];
  assert(successFile && deletedFiles.has(successFile), "File must be deleted on successful completion");

  resetState();
  mockCompletionError = new Error("Any processing crash");
  await receiveMessage(makeImagePayload("917618432290", "media-fail-cleanup", "msg-clean-8"), mockResponse() as any);
  const failFile = Array.from(writtenFiles)[0];
  assert(failFile && deletedFiles.has(failFile), "File must be deleted on processing failure");
  console.log("✅ Assertion 7 (Cleanup success & failure) Passed");

  // =========================================================================
  // 8. duplicate WhatsApp delivery
  // =========================================================================
  resetState();
  mockCompletionResponses.push("FBS 77");
  mockCompletionResponses.push(JSON.stringify({ observations: [{ testName: "FBS", value: 77, unit: "mg/dl" }] }));
  await receiveMessage(makeImagePayload("917618432290", "media-dup", "msg-dup-9"), mockResponse() as any);
  assert(MOCK_LAB_REPORTS["PAT-110"]?.length === 1, "First upload saved report");

  await receiveMessage(makeImagePayload("917618432290", "media-dup", "msg-dup-9"), mockResponse() as any);
  assert(MOCK_LAB_REPORTS["PAT-110"]?.length === 1, "Duplicate upload deduplicated");
  console.log("✅ Assertion 8 (Idempotency) Passed");

  // =========================================================================
  // 9. Regression check (Sprint 44 HbA1c latest query)
  // =========================================================================
  resetState();
  MOCK_LAB_OBSERVATIONS["PAT-110"] = [
    { testName: "HbA1c", canonicalTestKey: "hba1c", value: 6.2, unit: "%", referenceRangeText: "4.0 - 5.6", flag: "high", specimenDate: new Date() }
  ];
  await receiveMessage(makeTextPayload("917618432290", "meri latest HbA1c kya hai?", "msg-text-query"), mockResponse() as any);
  const queryOut = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(queryOut.includes("HbA1c") && queryOut.includes("6.2"), "Query readback remains active and works correctly");
  console.log("✅ Assertion 9 (Regression check) Passed");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 44.1 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
