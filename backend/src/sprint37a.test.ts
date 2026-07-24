import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
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

const smartMock = (msg: string, fullJSON: any) => {
  const clean = msg.toLowerCase().trim();
  const isRawFollowUp = clean === "fasting" || clean === "sugar" || clean === "खाली पेट" || clean === "post lunch" || clean === "before breakfast";
  if (isRawFollowUp) {
    return JSON.stringify({
      language: fullJSON.language || "hinglish",
      action: "IGNORE",
      intent: "conversational",
      candidateRecords: [],
      missingFields: [],
      unresolvedMeasurements: [],
    });
  }
  return JSON.stringify(fullJSON);
};

async function runSprint37aTests() {
  console.log("🧪 Running Sprint 37A Real Webhook Pending-Follow-up Deduplication Hotfix Tests...");

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
    // -------------------------------------------------------------------------
    // Setup and Seed Users
    // -------------------------------------------------------------------------
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

    const resetState = () => {
      for (const key in MOCK_RECORDS) {
        delete MOCK_RECORDS[key];
      }
      clearWebhookDeduplicationCache();
      clearAllPendingClarifications();
      axiosPostCalls = [];
    };

    const referenceTimestamp = "1784541600"; // 2026-07-20T10:00:00Z
    const refDate = new Date(parseInt(referenceTimestamp, 10) * 1000);

    // =========================================================================
    // A. Same WhatsApp Message ID delivered concurrently
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      // Simulate artificial async processing delay of 50ms to allow concurrent delivery testing
      await new Promise(resolve => setTimeout(resolve, 50));
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 98, unit: "%", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    const resA1 = mockResponse();
    const resA2 = mockResponse();

    const p1 = receiveMessage(makePayload("917618432290", "Oxygen 98%", "msg-concurrent-01", referenceTimestamp), resA1 as any);
    const p2 = receiveMessage(makePayload("917618432290", "Oxygen 98%", "msg-concurrent-01", referenceTimestamp), resA2 as any);

    await Promise.all([p1, p2]);

    assert(resA1.statusCode === 200, "A. First concurrent request returns 200");
    assert(resA2.statusCode === 200, "A. Second concurrent request returns 200");
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "A. Exactly 1 record saved");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation", "A. Parameter is oxygen_saturation");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 98, "A. Value is 98");

    // =========================================================================
    // B. Same WhatsApp Message ID redelivered later
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 75.5, unit: "kg", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "Weight 75.5 kg", "msg-redelivered-01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "B. Record saved on first delivery");

    // Redelivery
    await receiveMessage(makePayload("917618432290", "Weight 75.5 kg", "msg-redelivered-01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "B. No duplicate record saved on later redelivery of same ID");

    // =========================================================================
    // C. Different WhatsApp Message IDs for same patient (not classified as duplicates)
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Oxygen")) {
        return JSON.stringify({
          language: "english",
          action: "RECORD",
          intent: "health_measurement",
          candidateRecords: [{ parameter: "oxygen_saturation", value: 99, unit: "%", confidence: 0.99 }],
          missingFields: [],
        });
      } else {
        return JSON.stringify({
          language: "english",
          action: "RECORD",
          intent: "health_measurement",
          candidateRecords: [{ parameter: "weight", value: 72, unit: "kg", confidence: 0.99 }],
          missingFields: [],
        });
      }
    });

    await receiveMessage(makePayload("917618432290", "Oxygen 99%", "msg-diff-01", referenceTimestamp), mockResponse() as any);
    await receiveMessage(makePayload("917618432290", "Weight 72 kg", "msg-diff-02", referenceTimestamp), mockResponse() as any);

    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "C. Both distinct message IDs are successfully processed");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation", "C. First is oxygen_saturation");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "weight", "C. Second is weight");

    // =========================================================================
    // D & E & F & G & H. Complete 140, 160/80 -> sugar -> fasting multi-turn flow
    // =========================================================================
    resetState();

    // Turn 1: 140, 160/80
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 160, diastolic: 80, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
        unresolvedMeasurements: [140],
        reason: "Unresolved 140",
      });
    });

    await receiveMessage(makePayload("917618432290", "140, 160/80", "flow-id-01", referenceTimestamp), mockResponse() as any);

    // Verify BP was saved immediately (F)
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "E. BP saved immediately on Turn 1");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "E. BP parameter correct");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "160/80", "E. BP value is 160/80");

    // Turn 2: "sugar" (legitimate different message ID) (D)
    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 160, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          { parameter: "blood_sugar", value: 140, unit: "mg/dL", context: "unknown", confidence: 0.99 }
        ],
        missingFields: ["glucose_context"],
        unresolvedMeasurements: [],
        reason: "Missing context",
      });
    });

    await receiveMessage(makePayload("917618432290", "sugar", "flow-id-02", referenceTimestamp), mockResponse() as any);

    // BP must not be duplicated (F)
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "F. BP is not duplicated on Turn 2");

    // Turn 3: "fasting" (legitimate different message ID)
    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 160, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          { parameter: "blood_sugar", value: 140, unit: "mg/dL", context: "fasting", confidence: 0.99 }
        ],
        missingFields: [],
        unresolvedMeasurements: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "flow-id-03", referenceTimestamp), mockResponse() as any);

    // Sugar 140 Fasting is created exactly once (G)
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "G. Exactly 2 records in total saved (BP and Sugar)");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_sugar", "G. Second record is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.value === 140, "G. Sugar value is 140");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.context === "fasting", "G. Sugar context is fasting");

    // Original measurement timestamp remains preserved (H)
    assert(
      MOCK_RECORDS["PAT-101"]?.[1]?.recordedAt?.getTime() === refDate.getTime(),
      "H. Original message timestamp preserved on completed sugar record"
    );

    // =========================================================================
    // I. Patient-scoped clarification isolation
    // =========================================================================
    resetState();

    // Set pending clarification for PAT-101
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 135, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Context missing",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 135", "iso-01", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") !== null, "I. PAT-101 pending state is active");
    assert(getPendingClarification("PAT-102") === null, "I. PAT-102 has no pending state");

    // PAT-102 sends "fasting". This must not resolve PAT-101's pending state!
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "Standalone fasting with no context.",
      });
    });

    await receiveMessage(makePayload("9999999999", "fasting", "iso-02", referenceTimestamp), mockResponse() as any);

    assert(MOCK_RECORDS["PAT-102"] === undefined || MOCK_RECORDS["PAT-102"]?.length === 0, "I. PAT-102 saves zero records");
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "I. PAT-101 remains unsaved");
    assert(getPendingClarification("PAT-101") !== null, "I. PAT-101 pending state remains active and isolated");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Sprint 37A Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 37A tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 37A Real Webhook Pending-Follow-up Deduplication Hotfix tests passed successfully!");
    process.exit(0);
  }
}

runSprint37aTests();
