import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { extractMedicalDocumentText, extractStructuredLabData, setMockExtractStructuredLabData, setMockExtractMedicalDocumentText, deterministicFallbackParse } from "./services/documentService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS, MOCK_LAB_REPORTS, MOCK_LAB_OBSERVATIONS, getLabObservations } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
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
  res.statusCode = 200;
  res.body = null;
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
  console.log("⚙️ Running Sprint 44.5 Lab Results API Read-Back & Frontend Visibility Integration Suite...");

  // =========================================================================
  // Test 1: In-memory/mock and DB dual persistence source verification
  // =========================================================================
  resetState();
  process.env.USE_MOCK_DATA = "true";

  // Populate MOCK_LAB_OBSERVATIONS for PAT-110
  MOCK_LAB_OBSERVATIONS["PAT-110"] = [
    {
      patientId: "PAT-110",
      hospitalId: "HOSP-001",
      testName: "Fasting Blood Glucose",
      canonicalTestKey: "fbs",
      value: 105,
      unit: "mg/dL",
      referenceRangeText: "70-100",
      flag: "high",
      specimenDate: new Date("2026-07-26T08:00:00.000Z"),
      source: "whatsapp_image",
      whatsappMessageId: "msg_fbs_001_obs0",
    },
    {
      patientId: "PAT-110",
      hospitalId: "HOSP-001",
      testName: "Postprandial Blood Glucose",
      canonicalTestKey: "ppbs",
      value: 135,
      unit: "mg/dL",
      referenceRangeText: "80-140",
      flag: "normal",
      specimenDate: new Date("2026-07-26T12:00:00.000Z"),
      source: "whatsapp_image",
      whatsappMessageId: "msg_ppbs_001_obs1",
    }
  ];

  // Try to retrieve PAT-110 observations using simulated request
  const reqOwn: any = {
    params: { patientId: "PAT-110" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resOwn = mockResponse();
  await getLabObservations(reqOwn, resOwn);

  assert.strictEqual(resOwn.statusCode, 200, "Should succeed with 200");
  assert.strictEqual(resOwn.body?.success, true, "Should return success true");
  assert.strictEqual(resOwn.body?.totalObservations, 2, "Should return 2 observations");

  // Verify fbs and ppbs remain separate and correct fields are returned (serialization correctness)
  const obs = resOwn.body.observations;
  const fbs = obs.find((o: any) => o.canonicalTestKey === "fbs");
  const ppbs = obs.find((o: any) => o.canonicalTestKey === "ppbs");

  assert.ok(fbs, "FBS observation must exist and be separate");
  assert.ok(ppbs, "PPBS observation must exist and be separate");
  assert.strictEqual(fbs.value, 105, "FBS value must be 105");
  assert.strictEqual(fbs.unit, "mg/dL", "FBS unit must be mg/dL");
  assert.strictEqual(fbs.referenceRangeText, "70-100", "FBS referenceRangeText must be 70-100");
  assert.strictEqual(fbs.flag, "high", "FBS flag must be high");
  assert.strictEqual(ppbs.value, 135, "PPBS value must be 135");

  console.log("✅ Test 1 Passed: retrieve own observations and serialization correctness validated.");

  // =========================================================================
  // Test 2: Cross-patient access is denied
  // =========================================================================
  const reqCrossPatient: any = {
    params: { patientId: "PAT-111" },
    user: { username: "PAT-110", role: "patient", patientId: "PAT-110" }
  };
  const resCrossPatient = mockResponse();
  await getLabObservations(reqCrossPatient, resCrossPatient);

  assert.strictEqual(resCrossPatient.statusCode, 403, "Must return 403 Forbidden for cross-patient access");
  assert.strictEqual(resCrossPatient.body?.success, false, "Success must be false on denial");
  console.log("✅ Test 2 Passed: cross-patient access successfully blocked.");

  // =========================================================================
  // Test 3: Cross-tenant access is denied (HOSP-001 vs HOSP-002)
  // =========================================================================
  // Let's create an admin of HOSP-001 trying to access HOSP-002's patient observations
  // Wait, let's see how canAccessPatient determines patient's hospital for Admin.
  // Administrative check checks user's hospitalId and matches with target's hospitalId.
  dynamicMockUsers.push({
    username: "admin1",
    role: "admin",
    hospitalId: "HOSP-001",
    fullName: "Hospital 1 Admin",
  });

  const reqCrossTenant: any = {
    params: { patientId: "PAT-111" }, // PAT-111 belongs to HOSP-002
    user: { username: "admin1", role: "admin", hospitalId: "HOSP-001" }
  };
  const resCrossTenant = mockResponse();
  await getLabObservations(reqCrossTenant, resCrossTenant);

  assert.strictEqual(resCrossTenant.statusCode, 403, "Must return 403 Forbidden for cross-tenant access");
  console.log("✅ Test 3 Passed: cross-tenant access successfully blocked.");

  // =========================================================================
  // Test 4: Verify no fabricated values
  // =========================================================================
  assert.strictEqual(fbs.testName, "Fasting Blood Glucose", "testName matches exact stored name");
  assert.strictEqual(fbs.flag, "high", "abnormal flag/status matches exact stored flag");
  console.log("✅ Test 4 Passed: no fabricated values detected.");

  // =========================================================================
  // Test 5: Verify existing Sprint 44.4 extraction behavior remains intact
  // =========================================================================
  const ocrTable = `
TEST NAME      RESULT   UNIT    REFERENCE
Fasting Blood Sugar  110      mg/dL   70-100
Postprandial Blood Sugar  140      mg/dL   80-140
  `;
  const obsTable = deterministicFallbackParse(ocrTable);
  assert.strictEqual(obsTable.length, 2, "Should extract both FBS and PPBS from table layout");
  const fbsTable = obsTable.find(o => o.canonicalTestKey === "fbs");
  const ppbsTable = obsTable.find(o => o.canonicalTestKey === "ppbs");
  assert.strictEqual(fbsTable?.value, 110);
  assert.strictEqual(ppbsTable?.value, 140);
  console.log("✅ Test 5 Passed: existing Sprint 44.4 extraction behavior remains intact.");

  console.log("\n=========================================");
  console.log("🏆 ALL SPRINT 44.5 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
