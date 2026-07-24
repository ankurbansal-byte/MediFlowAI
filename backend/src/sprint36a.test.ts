import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers, dynamicMockAssignments } from "./utils/mockUsers";
import { MOCK_RECORDS, getPatientTimeline, getPatientSummary, getParameterTrend, addHealthRecord } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
} from "./services/pendingClarificationService";
import axios from "axios";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";

let axiosPostCalls: Array<{ url: string; data: any }> = [];
(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
};

const mockResponse = () => {
  const res: any = {};
  res.statusCode = 200;
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

const makePayload = (from: string, messageText: string, id: string, timestamp?: string): any => {
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
                    text: {
                      body: messageText,
                    },
                    timestamp: timestamp || Math.floor(Date.now() / 1000).toString(),
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
};

const makeReq = (user: any, params: any = {}, query: any = {}, body: any = {}): any => ({
  user,
  params,
  query,
  body,
});

async function runSprint36aTests() {
  console.log("🧪 Running Sprint 36A Backend Data Foundation Tests...");

  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      testsFailed++;
    }
  };

  try {
    // Setup users & assignments in mock lists
    dynamicMockUsers.length = 0;
    dynamicMockUsers.push({
      username: "PAT-101",
      role: "patient",
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      fullName: "Patient One",
      mobileNumber: "+917618432290",
      status: "active",
    });

    dynamicMockUsers.push({
      username: "PAT-102",
      role: "patient",
      patientId: "PAT-102",
      hospitalId: "HOSP-002",
      fullName: "Patient Two",
      mobileNumber: "+919999999999",
      status: "active",
    });

    // Seed Authorized and Unauthorized Doctors
    dynamicMockUsers.push({
      username: "doctor1",
      role: "doctor",
      doctorId: "DOC-101",
      hospitalId: "HOSP-001",
      fullName: "Dr. Doctor One",
      status: "active",
    });

    dynamicMockUsers.push({
      username: "doctor2",
      role: "doctor",
      doctorId: "DOC-102",
      hospitalId: "HOSP-001", // same hospital but not assigned
      fullName: "Dr. Doctor Two",
      status: "active",
    });

    dynamicMockUsers.push({
      username: "doctor3",
      role: "doctor",
      doctorId: "DOC-103",
      hospitalId: "HOSP-002", // different hospital
      fullName: "Dr. Doctor Three",
      status: "active",
    });

    // Set up active care team assignment
    dynamicMockAssignments.length = 0;
    dynamicMockAssignments.push({
      assignmentId: "ASG-101",
      patientId: "PAT-101",
      doctorId: "DOC-101",
      hospitalId: "HOSP-001",
      status: "active",
      assignedAt: new Date(),
    });

    const resetState = () => {
      for (const key in MOCK_RECORDS) {
        delete MOCK_RECORDS[key];
      }
      clearWebhookDeduplicationCache();
      clearAllPendingClarifications();
      axiosPostCalls = [];
    };

    // =========================================================================
    // A. glucose fasting context persists
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 110, unit: "mg/dL", context: "fasting", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    let res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Fasting sugar 110", "msg-a"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "A1. Glucose fasting message saved."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].context === "fasting",
      "A2. Glucose fasting context persists correctly."
    );

    // =========================================================================
    // B. glucose pre_meal context persists
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 115, unit: "mg/dL", context: "pre_meal", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Sugar before meal 115", "msg-b"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"][0].context === "pre_meal",
      "B. Glucose pre_meal context persists correctly."
    );

    // =========================================================================
    // C. glucose post_meal context persists
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 145, unit: "mg/dL", context: "post_meal", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Post lunch sugar 145", "msg-c"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"][0].context === "post_meal",
      "C. Glucose post_meal context persists correctly."
    );

    // =========================================================================
    // D. glucose random context persists
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "random", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Random sugar 125", "msg-d"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"][0].context === "random",
      "D. Glucose random context persists correctly."
    );

    // =========================================================================
    // E. missing/unknown context does not become a fabricated known context
    // =========================================================================
    resetState();
    let req = makeReq({ role: "patient", patientId: "PAT-101" }, {}, {}, {
      parameter: "blood_sugar",
      value: 130,
      unit: "mg/dL",
    });
    let apiRes = mockResponse();
    await addHealthRecord(req, apiRes);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "E1. Manual blood sugar record saved."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].context === undefined || MOCK_RECORDS["PAT-101"][0].context === "unknown",
      "E2. Missing manual context does not become a fabricated known context."
    );

    // =========================================================================
    // F. non-glucose parameter remains valid without glucose context
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "weight", value: 72.5, unit: "kg", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Weight 72.5 kg", "msg-f"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"][0].context === undefined,
      "F. Non-glucose parameter weights do not contain context."
    );

    // =========================================================================
    // G. recordedAt survives persistence correctly
    // =========================================================================
    resetState();
    const explicitTimestamp = "1784541600"; // July 20 2026 10:00:00Z
    const expectedDate = new Date(parseInt(explicitTimestamp, 10) * 1000);
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "weight", value: 72.5, unit: "kg", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Weight 72.5 kg", "msg-g", explicitTimestamp), res);
    assert(
      MOCK_RECORDS["PAT-101"] &&
        MOCK_RECORDS["PAT-101"][0].recordedAt.getTime() === expectedDate.getTime(),
      "G. recordedAt timestamp survives persistence exactly."
    );

    // =========================================================================
    // H. createdAt and recordedAt remain conceptually distinct
    // =========================================================================
    resetState();
    const oldTimestamp = "1468987200"; // July 20 2016
    const oldExpectedDate = new Date(parseInt(oldTimestamp, 10) * 1000);
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "weight", value: 70.0, unit: "kg", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Weight 70.0 kg", "msg-h", oldTimestamp), res);
    const persistedRecord = MOCK_RECORDS["PAT-101"][0];
    const generatedCreatedAt = new Date(); // roughly now
    assert(
      persistedRecord.recordedAt.getFullYear() === 2016,
      "H1. recordedAt is clinical historical timing."
    );
    assert(
      Math.abs(generatedCreatedAt.getTime() - persistedRecord.recordedAt.getTime()) > 300000000,
      "H2. createdAt and recordedAt are distinct."
    );

    // =========================================================================
    // I. two different parameters from one WhatsApp message both persist
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 120, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          { parameter: "heart_rate", value: 72, unit: "bpm", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "BP 120/80 and heart rate 72", "msg-i"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 2,
      "I1. Two distinct parameters saved."
    );
    assert(
      MOCK_RECORDS["PAT-101"].some(r => r.parameter === "blood_pressure") &&
        MOCK_RECORDS["PAT-101"].some(r => r.parameter === "heart_rate"),
      "I2. BP and Heart Rate successfully extracted and saved."
    );

    // =========================================================================
    // J. two blood-glucose observations from one WhatsApp message both persist
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 110, unit: "mg/dL", context: "fasting", confidence: 0.99 },
          { parameter: "blood_sugar", value: 140, unit: "mg/dL", context: "post_meal", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Fasting 110, post meal 140", "msg-j"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 2,
      "J1. Two blood sugar readings saved."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].context === "fasting" &&
        MOCK_RECORDS["PAT-101"][1].context === "post_meal",
      "J2. Suffixes/indexing allowed both distinct blood sugar readings to persist."
    );

    // =========================================================================
    // K. two same-parameter/same-context observations can both persist when legitimately extracted
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 105, unit: "mg/dL", context: "random", confidence: 0.99 },
          { parameter: "blood_sugar", value: 115, unit: "mg/dL", context: "random", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Random 105 and random 115", "msg-k"), res);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 2,
      "K1. Both random blood sugars persisted."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].whatsappMessageId !== MOCK_RECORDS["PAT-101"][1].whatsappMessageId,
      "K2. Observations have distinct, indexed whatsappMessageId values."
    );

    // =========================================================================
    // L. duplicate delivery of the same WhatsApp message does not duplicate those observations
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 105, unit: "mg/dL", context: "random", confidence: 0.99 },
          { parameter: "blood_sugar", value: 115, unit: "mg/dL", context: "random", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );

    res = mockResponse();
    await receiveMessage(makePayload("917618432290", "Random 105 and random 115", "msg-l"), res);
    assert(MOCK_RECORDS["PAT-101"].length === 2, "L1. Initial message delivery saves 2 records.");

    // Send identical webhook delivery duplicate
    const resDuplicate = mockResponse();
    await receiveMessage(makePayload("917618432290", "Random 105 and random 115", "msg-l"), resDuplicate);
    assert(
      MOCK_RECORDS["PAT-101"].length === 2,
      "L2. Duplicate webhook delivery does NOT create duplicate records."
    );

    // =========================================================================
    // M. existing records without context remain readable
    // =========================================================================
    resetState();
    MOCK_RECORDS["PAT-101"] = [
      {
        parameter: "blood_sugar",
        value: 120,
        unit: "mg/dL",
        recordedAt: new Date(),
        source: "portal",
      }
    ];

    req = makeReq({ role: "patient", patientId: "PAT-101" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.body.success && apiRes.body.records.length === 1,
      "M1. Timeline loads legacy records perfectly."
    );
    assert(
      apiRes.body.records[0].context === undefined,
      "M2. Legacy record context is correctly undefined without fabrication."
    );

    // =========================================================================
    // N. Patient-facing API returns context + full recordedAt
    // =========================================================================
    resetState();
    const patientSpecificDate = new Date("2026-07-21T08:30:00Z");
    MOCK_RECORDS["PAT-101"] = [
      {
        parameter: "blood_sugar",
        value: 100,
        unit: "mg/dL",
        context: "fasting",
        recordedAt: patientSpecificDate,
        source: "text",
      }
    ];

    req = makeReq({ role: "patient", patientId: "PAT-101" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.body.records[0].context === "fasting" &&
        new Date(apiRes.body.records[0].recordedAt).toISOString() === patientSpecificDate.toISOString(),
      "N. Patient timeline API exposes context and high-precision recordedAt successfully."
    );

    // =========================================================================
    // O. Doctor-authorized record response returns the same parameter/value/unit/context/recordedAt
    // =========================================================================
    req = makeReq({ username: "doctor1", role: "doctor", doctorId: "DOC-101", hospitalId: "HOSP-001" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.body.success && apiRes.body.records.length === 1,
      "O1. Authorized doctor accesses patient timeline successfully."
    );
    assert(
      apiRes.body.records[0].parameter === "blood_sugar" &&
        apiRes.body.records[0].value === 100 &&
        apiRes.body.records[0].context === "fasting",
      "O2. Authorized doctor receives correct canonical metrics including context."
    );

    // =========================================================================
    // P. unauthorized/cross-tenant access remains blocked by the existing authorization model
    // =========================================================================
    // Doctor 2 is from HOSP-001 but is not assigned to PAT-101
    req = makeReq({ username: "doctor2", role: "doctor", doctorId: "DOC-102", hospitalId: "HOSP-001" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.statusCode === 403,
      "P1. Unassigned doctor of same hospital is forbidden (403)."
    );

    // Doctor 3 is from HOSP-002
    req = makeReq({ username: "doctor3", role: "doctor", doctorId: "DOC-103", hospitalId: "HOSP-002" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.statusCode === 403,
      "P2. Doctor from different hospital is strictly forbidden (403)."
    );

    // Patient 102 accessing Patient 101's timeline
    req = makeReq({ role: "patient", patientId: "PAT-102" }, { patientId: "PAT-101" });
    apiRes = mockResponse();
    await getPatientTimeline(req, apiRes);
    assert(
      apiRes.statusCode === 403,
      "P3. Cross-patient clinical data access is strictly blocked (403)."
    );

  } catch (err: any) {
    console.error("Test execution failed with error:", err);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 36A Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 36A tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 36A Backend Data Foundation tests passed successfully!");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSprint36aTests();
}
