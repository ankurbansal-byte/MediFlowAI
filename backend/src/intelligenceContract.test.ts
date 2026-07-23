import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { parseHealthRecord, validateCandidateRecord } from "./utils/healthRecordParser";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import axios from "axios";

process.env.USE_MOCK_DATA = "true";

// Track mock responses and WhatsApp posts
let axiosPostCalls: Array<{ url: string; data: any }> = [];
(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
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

const makePayload = (from: string, messageText: string, id: string = "msg-999"): any => {
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

async function runTests() {
  console.log("🧪 Running backend Message Intelligence Contract & Validation Safety Tests...");

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
    // Seed test users
    dynamicMockUsers.length = 0;
    dynamicMockUsers.push({
      username: "PAT-101",
      role: "patient",
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      fullName: "Enrolled Patient One",
      mobileNumber: "+917618432290",
      status: "active",
    });

    dynamicMockUsers.push({
      username: "PAT-102",
      role: "patient",
      patientId: "PAT-102",
      hospitalId: "HOSP-002",
      fullName: "Enrolled Patient Two",
      mobileNumber: "+919999999999",
      status: "active",
    });

    // Reset records
    for (const key in MOCK_RECORDS) {
      delete MOCK_RECORDS[key];
    }
    clearWebhookDeduplicationCache();
    axiosPostCalls = [];

    // -------------------------------------------------------------------------
    // TEST 1: “Aaj fasting sugar 125 thi” -> RECORD, Hinglish, Fasting context
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 125,
            unit: "mg/dL",
            context: "fasting",
            recordedAt: "today",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res1 = mockResponse();
    await receiveMessage(makePayload("917618432290", "Aaj fasting sugar 125 thi", "msg-t1") as any, res1);

    assert(MOCK_RECORDS["PAT-101"] !== undefined && MOCK_RECORDS["PAT-101"].length === 1, "T1: Record saved for PAT-101.");
    assert(MOCK_RECORDS["PAT-101"][0].parameter === "blood_sugar", "T1: Parameter is blood_sugar.");
    assert(MOCK_RECORDS["PAT-101"][0].value === 125, "T1: Value is 125.");
    assert(axiosPostCalls[0].data.text.body.includes("1 health record(s) saved successfully"), "T1: Correct user reply.");

    // -------------------------------------------------------------------------
    // TEST 2: “Sugar 125” -> CLARIFY, missing glucose_context, NO persistence
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 125,
            unit: "mg/dL",
            context: "unknown",
            recordedAt: null,
            confidence: 0.99
          }
        ],
        missingFields: ["glucose_context"],
        reason: "Context of glucose measurement is missing."
      });
    });

    const res2 = mockResponse();
    const countBefore2 = MOCK_RECORDS["PAT-101"]?.length || 0;
    const acksBefore2 = axiosPostCalls.length;
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-t2") as any, res2);

    const countAfter2 = MOCK_RECORDS["PAT-101"]?.length || 0;
    assert(countAfter2 === countBefore2, "T2: CLARIFY action did NOT persist a health record.");
    assert(axiosPostCalls.length === acksBefore2 + 1, "T2: Acknowledgment sent.");
    assert(axiosPostCalls[axiosPostCalls.length - 1].data.text.body.includes("Please clarify: glucose_context is missing"), "T2: Clarification request sent back to user.");

    // -------------------------------------------------------------------------
    // TEST 3: “आज सुबह शुगर 125 थी” -> Hindi, valid glucose candidate
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "hindi",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 125,
            unit: "mg/dL",
            context: "fasting",
            recordedAt: "morning",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res3 = mockResponse();
    await receiveMessage(makePayload("917618432290", "आज सुबह शुगर 125 थी", "msg-t3") as any, res3);
    assert(MOCK_RECORDS["PAT-101"].length === 2, "T3: Hindi record persisted successfully (total count = 2).");

    // -------------------------------------------------------------------------
    // TEST 4: “My fasting sugar was 125 this morning” -> English, valid candidate
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 125,
            unit: "mg/dL",
            context: "fasting",
            recordedAt: "morning",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res4 = mockResponse();
    await receiveMessage(makePayload("917618432290", "My fasting sugar was 125 this morning", "msg-t4") as any, res4);
    assert(MOCK_RECORDS["PAT-101"].length === 3, "T4: English record persisted successfully (total count = 3).");

    // -------------------------------------------------------------------------
    // TEST 5: “BP 128/82 pulse 74” -> RECORD, multiple candidates (BP + pulse)
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_pressure",
            systolic: 128,
            diastolic: 82,
            unit: "mmHg",
            confidence: 0.99
          },
          {
            parameter: "heart_rate",
            value: 74,
            unit: "bpm",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res5 = mockResponse();
    await receiveMessage(makePayload("917618432290", "BP 128/82 pulse 74", "msg-t5") as any, res5);
    assert(MOCK_RECORDS["PAT-101"].length === 5, "T5: Two health records persisted from one message (total count = 5).");
    const bpRec = MOCK_RECORDS["PAT-101"].find(r => r.parameter === "blood_pressure" && r.value === "128/82");
    const hrRec = MOCK_RECORDS["PAT-101"].find(r => r.parameter === "heart_rate" && r.value === 74);
    assert(!!bpRec, "T5: Blood pressure 128/82 persisted.");
    assert(!!hrRec, "T5: Heart rate 74 persisted.");

    // -------------------------------------------------------------------------
    // TEST 6: “BP 140” -> CLARIFY, missing diastolic, NO persistence
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          {
            parameter: "blood_pressure",
            systolic: 140,
            unit: "mmHg",
            confidence: 0.99
          }
        ],
        missingFields: ["diastolic"],
        reason: "Diastolic value is missing."
      });
    });

    const res6 = mockResponse();
    const countBefore6 = MOCK_RECORDS["PAT-101"].length;
    await receiveMessage(makePayload("917618432290", "BP 140", "msg-t6") as any, res6);
    assert(MOCK_RECORDS["PAT-101"].length === countBefore6, "T6: Incomplete blood pressure was NOT persisted.");

    // -------------------------------------------------------------------------
    // TEST 7: “Oxygen 97%” -> RECORD, SpO2
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "oxygen_saturation",
            value: 97,
            unit: "%",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res7 = mockResponse();
    await receiveMessage(makePayload("917618432290", "Oxygen 97%", "msg-t7") as any, res7);
    const o2Rec = MOCK_RECORDS["PAT-101"].find(r => r.parameter === "oxygen_saturation");
    assert(!!o2Rec && o2Rec.value === 97, "T7: Oxygen saturation 97% persisted successfully.");

    // -------------------------------------------------------------------------
    // TEST 8: “Weight 72.4 kg” -> RECORD, Weight
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "weight",
            value: 72.4,
            unit: "kg",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res8 = mockResponse();
    await receiveMessage(makePayload("917618432290", "Weight 72.4 kg", "msg-t8") as any, res8);
    const wtRec = MOCK_RECORDS["PAT-101"].find(r => r.parameter === "weight");
    assert(!!wtRec && wtRec.value === 72.4, "T8: Weight 72.4 kg persisted successfully.");

    // -------------------------------------------------------------------------
    // TEST 9: “Temperature 98.6 F” -> RECORD, conversion to 37 °C
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "body_temperature",
            value: 37,
            unit: "°C",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res9 = mockResponse();
    await receiveMessage(makePayload("917618432290", "Temperature 98.6 F", "msg-t9") as any, res9);
    const tempRec = MOCK_RECORDS["PAT-101"].find(r => r.parameter === "body_temperature");
    assert(!!tempRec && tempRec.value === 37, "T9: Temperature converted and saved as 37 °C successfully.");

    // -------------------------------------------------------------------------
    // TEST 10: “Thank you doctor” & “Hello” -> IGNORE, zero HealthRecords persisted
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "Polite greeting/greetings only."
      });
    });

    const res10a = mockResponse();
    const countBefore10 = MOCK_RECORDS["PAT-101"].length;
    await receiveMessage(makePayload("917618432290", "Thank you doctor", "msg-t10a") as any, res10a);

    const res10b = mockResponse();
    await receiveMessage(makePayload("917618432290", "Hello", "msg-t10b") as any, res10b);

    assert(MOCK_RECORDS["PAT-101"].length === countBefore10, "T10: IGNORE action messages did NOT create any HealthRecord entries.");
    assert(axiosPostCalls[axiosPostCalls.length - 1].data.text.body.includes("Conversational updates are not recorded"), "T10: Friendly IGNORE prompt returned.");

    // -------------------------------------------------------------------------
    // TEST 11: AI output attempting to introduce a value NOT present in source (Fabricated)
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 125, // 125 is fabricated! The user said "sugar was normal"
            unit: "mg/dL",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res11 = mockResponse();
    const countBefore11 = MOCK_RECORDS["PAT-101"].length;
    await receiveMessage(makePayload("917618432290", "sugar was normal", "msg-t11") as any, res11);
    assert(MOCK_RECORDS["PAT-101"].length === countBefore11, "T11: Fabricated numeric value was successfully REJECTED by deterministic validation.");

    // -------------------------------------------------------------------------
    // TEST 12: Multi-tenant safety
    // -------------------------------------------------------------------------
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          {
            parameter: "blood_sugar",
            value: 144,
            unit: "mg/dL",
            confidence: 0.99
          }
        ],
        missingFields: [],
        reason: ""
      });
    });

    const res12 = mockResponse();
    // User from different phone number matches PAT-102 in HOSP-002
    await receiveMessage(makePayload("919999999999", "My sugar is 144", "msg-t12") as any, res12);
    assert(MOCK_RECORDS["PAT-102"] !== undefined && MOCK_RECORDS["PAT-102"].length === 1, "T12: Record created for PAT-102.");
    assert(MOCK_RECORDS["PAT-102"][0].hospitalId === "HOSP-002", "T12: Tenant isolation verified - record assigned to HOSP-002.");
    assert(MOCK_RECORDS["PAT-101"].every(r => r.hospitalId === "HOSP-001"), "T12: HOSP-001 records completely unaffected and isolated.");

    // Reset mock extractor
    setMockExtractHealthData(null);

  } catch (error) {
    console.error("💥 Unexpected test execution error:", error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Contract Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("🏆 All Intelligence Contract & Safety Validation tests passed successfully!");
    process.exit(0);
  }
}

runTests();
