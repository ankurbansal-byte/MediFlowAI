import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { extractMedicalDocumentText, extractStructuredLabData } from "./services/documentService";
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

  // Reset model config to correct values
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

  MOCK_RECORDS["PAT-110"] = [] as any[];
  MOCK_LAB_REPORTS["PAT-110"] = [] as any[];
  MOCK_LAB_OBSERVATIONS["PAT-110"] = [] as any[];
}

async function runTests() {
  console.log("⚙️ Running Sprint 44.2 Dedicated Vision Model Acceptance Suite...");

  // =========================================================================
  // Test 1: dedicated vision model config is used & ordinary text model is not accidentally used for image OCR
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose (FBS) 77 mg/dl \n Postprandial Blood Glucose (PPBS) 120 mg/dl");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl", referenceRangeText: "60 to 110" },
      { testName: "PPBS", canonicalTestKey: "ppbs", value: 120, unit: "mg/dl", referenceRangeText: "80 to 140" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-glucose-jpg", "msg-jpg-1"), mockResponse() as any);

  assert.strictEqual(completionCalls.length, 2, "Should invoke OpenRouter exactly twice");

  // Assert that OCR step used the dedicated vision model
  const ocrCall = completionCalls[0];
  assert.strictEqual(ocrCall.model, "google/gemini-2.5-flash", "OCR call must use the configured OPENROUTER_VISION_MODEL");

  // Assert that structured parser step used the standard text model
  const structureCall = completionCalls[1];
  assert.strictEqual(structureCall.model, "tencent/hy3", "Structured parsing call must use standard OPENROUTER_MODEL");

  console.log("✅ Test 1 Passed: Correct dedicated vision model used for OCR, normal model used for parsing.");

  // =========================================================================
  // Test 2: JPEG base64 image_url request with correct MIME preservation & text + image multimodal content
  // =========================================================================
  assert.strictEqual(ocrCall.messages[0].role, "user", "Message role must be user");
  const ocrContent = ocrCall.messages[0].content;
  assert(Array.isArray(ocrContent), "Multimodal messages content must be an array");
  assert.strictEqual(ocrContent[0].type, "text", "First content block must be text instruction");
  assert.strictEqual(ocrContent[1].type, "image_url", "Second content block must be image_url");
  assert(ocrContent[1].image_url.url.startsWith("data:image/jpeg;base64,"), "MIME type for JPEG must be preserved correctly in base64 URL");

  console.log("✅ Test 2 Passed: JPEG base64 image_url and multimodal request structure verified.");

  // =========================================================================
  // Test 3: PNG base64 image_url request with correct MIME preservation
  // =========================================================================
  resetState();
  mockMetadataResponse.data.mime_type = "image/png";
  mockCompletionResponses.push("Fasting Blood Glucose 77");
  mockCompletionResponses.push(JSON.stringify({ observations: [] }));

  await receiveMessage(makeImagePayload("917618432290", "media-glucose-png", "msg-png-1", "image/png"), mockResponse() as any);

  const pngOcrCall = completionCalls[0];
  assert(pngOcrCall.messages[0].content[1].image_url.url.startsWith("data:image/png;base64,"), "MIME type for PNG must be preserved correctly in base64 URL");

  console.log("✅ Test 3 Passed: PNG base64 image_url and MIME preservation verified.");

  // =========================================================================
  // Test 4: Missing vision model configuration
  // =========================================================================
  resetState();
  // Temporarily delete vision model configuration
  delete process.env.OPENROUTER_VISION_MODEL;

  await receiveMessage(makeImagePayload("917618432290", "media-missing-config", "msg-missing-cfg"), mockResponse() as any);

  // Assert that no OpenRouter calls were made
  assert.strictEqual(completionCalls.length, 0, "No OpenRouter calls should be made if configuration is missing");

  // Verify safe configuration error is logged
  const logsJoined = capturedLogs.join("\n");
  assert(logsJoined.includes("[Configuration Error] OPENROUTER_VISION_MODEL environment variable is missing."), "Must log missing config error");

  // Verify failure response is delivered
  const lastPostCall = axiosPostCalls[axiosPostCalls.length - 1];
  assert(lastPostCall.data.text.body.includes("dikkat hui") || lastPostCall.data.text.body.includes("Failed to process"), "Should notify user about failure");

  console.log("✅ Test 4 Passed: Missing configuration fails fast and safely, replying with localized error.");

  // =========================================================================
  // Test 5: Simulated 404 no image endpoint (VISION_MODEL_UNAVAILABLE)
  // =========================================================================
  resetState();
  // Simulate OpenRouter 404 No endpoints found that support image input
  mockCompletionError = new Error("No endpoints found that support image input");
  // Set fake HTTP status on error to 404
  mockCompletionError.status = 404;

  await receiveMessage(makeImagePayload("917618432290", "media-404-vision", "msg-404-vision"), mockResponse() as any);

  const logsAfter404 = capturedLogs.join("\n");
  assert(logsAfter404.includes("VISION_MODEL_UNAVAILABLE"), "Must log VISION_MODEL_UNAVAILABLE when OpenRouter returns 404 image endpoint error");

  // Verify cleanup happened (deleted files contains the downloaded file)
  const successFile = Array.from(writtenFiles)[0];
  assert(successFile && deletedFiles.has(successFile), "File must be deleted even if OpenRouter vision model is unavailable");

  // Verify no observations are saved
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 0, "No observations should be persisted on failure");

  console.log("✅ Test 5 Passed: Simulated 404 handled, logging VISION_MODEL_UNAVAILABLE, cleaned up, and no state corrupted.");

  // =========================================================================
  // Test 6: Privacy Guard - No full OCR text, base64, or API key in logs
  // =========================================================================
  const allLogsCombined = capturedLogs.join("\n");
  assert(!allLogsCombined.includes("data:image/"), "Must not log base64 image data url");
  assert(!allLogsCombined.includes("fake-jpeg-binary-data"), "Must not log raw download binary data");
  assert(!allLogsCombined.includes("mock-whatsapp-token"), "Must not log WhatsApp token");

  console.log("✅ Test 6 Passed: Privacy guard successfully validated.");

  // =========================================================================
  // Test 7: Sprint 44 / 44.1 regressions check (FBS 77 & PPBS 120 extraction)
  // =========================================================================
  resetState();
  mockCompletionResponses.push("FBS 77 mg/dl, PPBS 120 mg/dl");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Regression Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl", referenceRangeText: "70-100" },
      { testName: "PPBS", canonicalTestKey: "ppbs", value: 120, unit: "mg/dl", referenceRangeText: "70-140" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-regress-jpg", "msg-regress-1"), mockResponse() as any);

  const observations = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(observations.length, 2, "Should have 2 observations");
  const fbs = observations.find(o => o.canonicalTestKey === "fbs");
  const ppbs = observations.find(o => o.canonicalTestKey === "ppbs");
  assert.strictEqual(fbs?.value, 77);
  assert.strictEqual(ppbs?.value, 120);

  console.log("✅ Test 7 Passed: Sprint 44/44.1 regressions verified successfully.");

  console.log("\n=========================================");
  console.log("🏆 SPRINT 44.2 VISION MODEL TESTS PASSED!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
