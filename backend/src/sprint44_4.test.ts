import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { extractMedicalDocumentText, extractStructuredLabData, setMockExtractStructuredLabData, setMockExtractMedicalDocumentText, deterministicFallbackParse } from "./services/documentService";
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
  process.env.OPENROUTER_LAB_MODEL = undefined; // clear explicitly
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
  console.log("⚙️ Running Sprint 44.4 Lab OCR-to-Observation Finalization Suite...");

  // =========================================================================
  // Test 1: Test/value/unit on one line
  // =========================================================================
  resetState();
  const ocrOneLine = "Fasting Blood Glucose 110 mg/dL Normal range: 70-100";
  const obsOneLine = deterministicFallbackParse(ocrOneLine);
  assert.strictEqual(obsOneLine.length, 1, "Should parse exactly 1 observation");
  assert.strictEqual(obsOneLine[0].canonicalTestKey, "fbs");
  assert.strictEqual(obsOneLine[0].value, 110);
  assert.strictEqual(obsOneLine[0].unit, "mg/dL");
  console.log("✅ Test 1 Passed: test/value/unit on one line parsed perfectly.");

  // =========================================================================
  // Test 2: Value on next line
  // =========================================================================
  resetState();
  const ocrNextLine = "Fasting Blood Glucose\n110\nmg/dL\nNormal Range 70-100";
  const obsNextLine = deterministicFallbackParse(ocrNextLine);
  assert.strictEqual(obsNextLine.length, 1, "Should parse exactly 1 observation with value on next line");
  assert.strictEqual(obsNextLine[0].canonicalTestKey, "fbs");
  assert.strictEqual(obsNextLine[0].value, 110);
  assert.strictEqual(obsNextLine[0].unit, "mg/dL");
  console.log("✅ Test 2 Passed: value on next line parsed perfectly.");

  // =========================================================================
  // Test 3: Irregular whitespace / multiple spaces/tabs
  // =========================================================================
  resetState();
  const ocrWhitespace = "Postprandial Blood Glucose \t   140   \t\t mg/dl";
  const obsWhitespace = deterministicFallbackParse(ocrWhitespace);
  assert.strictEqual(obsWhitespace.length, 1);
  assert.strictEqual(obsWhitespace[0].canonicalTestKey, "ppbs");
  assert.strictEqual(obsWhitespace[0].value, 140);
  assert.strictEqual(obsWhitespace[0].unit, "mg/dl");
  console.log("✅ Test 3 Passed: irregular whitespace parsed perfectly.");

  // =========================================================================
  // Test 4: Table column extraction
  // =========================================================================
  resetState();
  const ocrTable = `
TEST NAME      RESULT   UNIT    REFERENCE
Fasting Blood Sugar  110      mg/dL   70-100
Postprandial Blood Sugar  140      mg/dL   80-140
  `;
  const obsTable = deterministicFallbackParse(ocrTable);
  assert.strictEqual(obsTable.length, 2, "Should extract both FBS and PPBS from table layout");
  const fbsTable = obsTable.find(o => o.canonicalTestKey === "fbs");
  const ppbsTable = obsTable.find(o => o.canonicalTestKey === "ppbs");
  assert.ok(fbsTable, "FBS should exist");
  assert.ok(ppbsTable, "PPBS should exist");
  assert.strictEqual(fbsTable.value, 110);
  assert.strictEqual(ppbsTable.value, 140);
  console.log("✅ Test 4 Passed: table column layout parsed perfectly.");

  // =========================================================================
  // Test 5: FBS and PPBS kept distinct
  // =========================================================================
  resetState();
  const ocrDistinct = `
Fasting Blood Glucose (FBS)
75
mg/dL
Postprandial Blood Glucose (PPBS)
135
mg/dL
  `;
  const obsDistinct = deterministicFallbackParse(ocrDistinct);
  assert.strictEqual(obsDistinct.length, 2);
  const fbsDistinct = obsDistinct.find(o => o.canonicalTestKey === "fbs");
  const ppbsDistinct = obsDistinct.find(o => o.canonicalTestKey === "ppbs");
  assert.strictEqual(fbsDistinct?.value, 75);
  assert.strictEqual(ppbsDistinct?.value, 135);
  console.log("✅ Test 5 Passed: FBS and PPBS kept completely distinct.");

  // =========================================================================
  // Test 6: No value present => no observation
  // =========================================================================
  resetState();
  const ocrNoVal = "Fasting Blood Glucose\nReference Range: 70-110 mg/dL";
  const obsNoVal = deterministicFallbackParse(ocrNoVal);
  assert.strictEqual(obsNoVal.length, 0, "Should extract absolutely no observations when value is missing");
  console.log("✅ Test 6 Passed: no-value safety enforced successfully.");

  // =========================================================================
  // Test 7: Unrelated numbers/reference ranges must not become results
  // =========================================================================
  resetState();
  const ocrUnrelated = "Fasting Blood Glucose 110 mg/dL Normal range: 70-100";
  const obsUnrelated = deterministicFallbackParse(ocrUnrelated);
  assert.strictEqual(obsUnrelated.length, 1);
  assert.strictEqual(obsUnrelated[0].value, 110, "Value should be 110, not any range number");
  console.log("✅ Test 7 Passed: unrelated numbers/ranges safely ignored.");

  // =========================================================================
  // Test 8: Duplicate prevention within same OCR string
  // =========================================================================
  resetState();
  const ocrDup = "Fasting Blood Glucose 110 mg/dL \n Fasting Blood Glucose 110 mg/dL";
  const obsDup = deterministicFallbackParse(ocrDup);
  assert.strictEqual(obsDup.length, 1, "Should not duplicate identical test observations");
  console.log("✅ Test 8 Passed: duplicate prevention within OCR text successfully verified.");

  // =========================================================================
  // Test 9: Malformed LLM response with successful deterministic extraction
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose 88 mg/dL"); // OCR text
  mockCompletionResponses.push("INVALID JSON CONTENT {{{"); // malformed LLM structured response

  await receiveMessage(makeImagePayload("917618432290", "media-malformed-llm", "msg-malformed-llm"), mockResponse() as any);
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.length, 1, "Should fall back and save 1 observation from OCR text");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.canonicalTestKey, "fbs");
  assert.strictEqual(MOCK_LAB_OBSERVATIONS["PAT-110"]?.[0]?.value, 88);
  console.log("✅ Test 9 Passed: fallback on malformed LLM response parsed perfectly.");

  // =========================================================================
  // Test 10: Patient/tenant isolation regressions
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
  // Test 11: Dedicated OPENROUTER_LAB_MODEL model configuration
  // =========================================================================
  resetState();
  process.env.OPENROUTER_LAB_MODEL = "google/gemini-2.5-flash"; // Dedicated lab model
  process.env.OPENROUTER_MODEL = "tencent/hy3";

  mockCompletionResponses.push("Fasting Blood Glucose 77 mg/dl");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dl" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-model-chk", "msg-model-chk"), mockResponse() as any);
  assert.strictEqual(completionCalls.length, 2, "Should invoke OpenRouter exactly twice");
  assert.strictEqual(completionCalls[0].model, "google/gemini-2.5-flash", "OCR call must use standard vision model");
  assert.strictEqual(completionCalls[1].model, "google/gemini-2.5-flash", "Structured parsing must use configured OPENROUTER_LAB_MODEL");
  console.log("✅ Test 11 Passed: Dedicated OPENROUTER_LAB_MODEL configuration successfully utilized.");

  // =========================================================================
  // Test 12: Deterministic preference / Merging logic (LLM should not overwrite)
  // =========================================================================
  resetState();
  mockCompletionResponses.push("Fasting Blood Glucose 110 mg/dL; TSH 2.1 uIU/mL");
  mockCompletionResponses.push(JSON.stringify({
    reportDate: "2026-07-20",
    laboratoryName: "Acceptance Lab",
    observations: [
      // LLM returns a hallucinated/different value for fbs (77 instead of 110)
      { testName: "FBS", canonicalTestKey: "fbs", value: 77, unit: "mg/dL" },
      // LLM successfully extracts TSH which was not matched (or was matched)
      { testName: "TSH", canonicalTestKey: "tsh", value: 2.1, unit: "uIU/mL" }
    ]
  }));

  await receiveMessage(makeImagePayload("917618432290", "media-merge-chk", "msg-merge-chk"), mockResponse() as any);
  const mergedObs = MOCK_LAB_OBSERVATIONS["PAT-110"] || [];
  assert.strictEqual(mergedObs.length, 2, "Should have 2 observations");
  const fbsMerged = mergedObs.find(o => o.canonicalTestKey === "fbs");
  const tshMerged = mergedObs.find(o => o.canonicalTestKey === "tsh");
  assert.strictEqual(fbsMerged?.value, 110, "Fasting glucose value MUST be the deterministic fallback value (110), not overwritten by LLM value (77)");
  assert.strictEqual(tshMerged?.value, 2.1, "TSH value is merged successfully");
  console.log("✅ Test 12 Passed: Deterministic preference and safe merging verified.");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 44.4 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
