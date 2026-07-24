import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
  setPendingClarification,
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

async function runSprint37Tests() {
  console.log("🧪 Running Sprint 37 Comprehensive Natural Conversational Clarification & Safety Tests...");

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
    // A. GLUCOSE CLARIFICATION Turn-by-Turn Flows
    // =========================================================================

    // Test case A1: "Sugar 125" -> Hinglish clarification prompt
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing glucose context",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-001", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "A1. Request sent to WhatsApp");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("sugar note kar loon"),
      "A1. Response matches natural Hinglish clarification"
    );
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("Please clarify:"), "A1. Robotic prefix is removed");
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("glucose_context"), "A1. Internal fields are hidden");

    // Test case A2: "fasting" follow-up
    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "msg-002", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "A2. Exactly 1 record saved");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "A2. Record is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 125, "A2. Value is 125");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "A2. Context is fasting");
    assert(
      MOCK_RECORDS["PAT-101"]?.[0]?.recordedAt?.getTime() === refDate.getTime(),
      "A2. Original message timestamp preserved for timeline accuracy"
    );
    assert(
      axiosPostCalls[1]?.data?.text?.body.includes("Sugar 125 mg/dL (Fasting) save ho gayi"),
      "A2. Natural Hinglish confirmation sent"
    );

    // Test case A3: Devanagari Hindi support
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hindi",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Hindi missing context",
      });
    });

    await receiveMessage(makePayload("917618432290", "मेरी शुगर 125 है", "msg-003", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("यह शुगर रीडिंग खाली पेट"),
      "A3. Clarification message is in natural Devanagari Hindi"
    );

    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "hindi",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "खाली पेट", "msg-004", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "A3. Record saved successfully");
    assert(
      axiosPostCalls[1]?.data?.text?.body.includes("शुगर 125 mg/dL (खाली पेट) सेव हो गई"),
      "A3. Natural Devanagari Hindi success confirmation sent"
    );

    // Test case A4: English language style matching
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "English missing context",
      });
    });

    await receiveMessage(makePayload("917618432290", "My blood sugar is 125", "msg-005", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("sugar is 125"),
      "A4. English style clarification returned"
    );

    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "msg-006", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "A4. Context saved successfully");
    assert(
      axiosPostCalls[1]?.data?.text?.body.includes("Sugar 125 mg/dL (Fasting) saved"),
      "A4. Natural English confirmation sent"
    );

    // =========================================================================
    // B. MIXED RECOGNIZED + UNRESOLVED ("140, 160/80")
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 160, diastolic: 80, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
        unresolvedMeasurements: [140],
        reason: "Unresolved plausible health measurement",
      });
    });

    await receiveMessage(makePayload("917618432290", "140, 160/80", "msg-bp01", referenceTimestamp), mockResponse() as any);

    // Verify 160/80 BP was saved immediately!
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "B. Recognized BP saved immediately");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "B. Parameter is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "160/80", "B. Value is 160/80");

    // Verify unresolved 140 was stored in pending clarification
    const pendingB = getPendingClarification("PAT-101");
    assert(pendingB !== null, "B. Pending clarification state created");
    assert(pendingB?.unresolvedMeasurements?.[0] === 140, "B. Unresolved 140 stored in pending");

    // Verify clarification question format
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("160/80 BP note kar liya"),
      "B. Acknowledged saved BP"
    );
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("140 kiski reading hai"),
      "B. Asked about unresolved 140 value"
    );

    // Step 2: User follow up: "sugar"
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
        reason: "Glucose context is missing",
      });
    });

    await receiveMessage(makePayload("917618432290", "sugar", "msg-bp02", referenceTimestamp), mockResponse() as any);

    // BP should not be duplicated
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "B. BP not duplicated on progressive step");

    const pendingB2 = getPendingClarification("PAT-101");
    assert(pendingB2 !== null, "B. Progressive pending state preserved");
    assert(pendingB2?.unresolvedMeasurements?.length === 0, "B. Unresolved measurements resolved");
    assert(pendingB2?.candidateRecords?.[0]?.parameter === "blood_sugar", "B. Incomplete candidate is now blood_sugar");
    assert(!!(pendingB2?.missingFields?.includes("glucose_context")), "B. Missing glucose_context tracked");

    assert(
      axiosPostCalls[1]?.data?.text?.body.includes("140 sugar note kar loon"),
      "B. Progressive clarification requested glucose context"
    );

    // Step 3: User follow up: "fasting"
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

    await receiveMessage(makePayload("917618432290", "fasting", "msg-bp03", referenceTimestamp), mockResponse() as any);

    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "B. Exactly 2 records saved now");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "B. BP is still first record");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_sugar", "B. Sugar is now second record");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.value === 140, "B. Sugar value is 140");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.context === "fasting", "B. Sugar context is fasting");
    assert(
      axiosPostCalls[2]?.data?.text?.body.includes("Sugar 140 mg/dL (Fasting) save ho gayi"),
      "B. Final natural confirmation sent"
    );

    // =========================================================================
    // C. MULTI-PARAMETER MESSAGES
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 130, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          { parameter: "heart_rate", value: 72, unit: "bpm", confidence: 0.99 }
        ],
        missingFields: [],
        unresolvedMeasurements: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "BP 130/80 pulse 72", "msg-multi01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "C. Both BP and Pulse saved");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("BP 130/80") &&
      axiosPostCalls[0]?.data?.text?.body.includes("Pulse 72") &&
      axiosPostCalls[0]?.data?.text?.body.includes("save ho gaye"),
      "C. Natural Hinglish multi-parameter confirmation"
    );

    // Multi-parameter with context
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 },
          { parameter: "blood_pressure", systolic: 130, diastolic: 80, unit: "mmHg", confidence: 0.99 }
        ],
        missingFields: [],
        unresolvedMeasurements: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar fasting 125, BP 130/80", "msg-multi02", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "C. Multi-parameter records saved");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "C. Fasting context survived");

    // =========================================================================
    // D. UNRESOLVED NUMBERS
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [],
        missingFields: [],
        unresolvedMeasurements: [125, 72],
        reason: "Two unresolved numbers",
      });
    });

    await receiveMessage(makePayload("917618432290", "125, 72", "msg-unres01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "D. No records saved for purely ambiguous message");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("125, 72 kiski reading hai"),
      "D. Asked about multiple unresolved readings without guessing parameters"
    );

    // =========================================================================
    // E. NON-HEALTH NUMBERS (Bypassing Health Pipeline)
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        unresolvedMeasurements: [],
        reason: "Non-health number mention",
      });
    });

    await receiveMessage(makePayload("917618432290", "Meeting at 4", "msg-non01", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") === null, "E. Pure date/time numbers do not set pending state");
    assert(MOCK_RECORDS["PAT-101"]?.length === undefined, "E. Zero records persisted");

    await receiveMessage(makePayload("917618432290", "My OTP is 1256", "msg-non02", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") === null, "E. OTP numbers do not set pending state");

    await receiveMessage(makePayload("917618432290", "Call me on 917618432290", "msg-non03", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") === null, "E. Phone numbers do not set pending state");

    // =========================================================================
    // G. PENDING STATE (Expiry & Progressive Cancellation & Patient Isolation)
    // =========================================================================
    // progressive cancellation
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Context missing",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-state01", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") !== null, "G. Pending state is active");

    await receiveMessage(makePayload("917618432290", "rehne do", "msg-state02", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") === null, "G. Pending state cleared after cancellation command 'rehne do'");
    assert(axiosPostCalls[1]?.data?.text?.body.includes("Clarification cancelled"), "G. Cancellation reply sent");

    // Patient Isolation
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Context missing",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-state03", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") !== null, "G. PAT-101 has pending clarification");
    assert(getPendingClarification("PAT-102") === null, "G. PAT-102 has no pending clarification (strict isolation)");

    // =========================================================================
    // H. DUPLICATE PROTECTION &Turn Safety
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "Fasting sugar 125", "msg-dup01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "H. Saved 1 record");

    // Duplicate delivery
    await receiveMessage(makePayload("917618432290", "Fasting sugar 125", "msg-dup01", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "H. Duplicate webhook delivery does not save another record");

    // =========================================================================
    // I. SAFETY (No diagnosis, no treatment advice, no fabrication)
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 180, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting sugar 180", "msg-safe01", referenceTimestamp), mockResponse() as any);
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("high"), "I. No diagnosis statement is made (even if sugar is 180)");
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("insulin"), "I. No treatment advice is offered");
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("diabetic"), "I. No diagnostic labels applied");

    // =========================================================================
    // INTEGRATION FLOWS
    // =========================================================================

    // FLOW 1
    // User: Sugar 125
    // Assistant: natural clarification
    // User: fasting
    // Assistant: natural confirmation -> One saved record, fasting.
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Context missing",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 125", "flow1-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "FLOW 1. No records saved yet");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("sugar note kar loon"), "FLOW 1. Natural clarification sent");

    setMockExtractHealthData(async (msg) => {
      return smartMock(msg, {
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 }],
        missingFields: [],
        reason: "",
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "flow1-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "FLOW 1. Exactly 1 record saved successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "FLOW 1. Record has fasting context");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 125, "FLOW 1. Record has value 125");
    assert(axiosPostCalls[1]?.data?.text?.body.includes("Sugar 125 mg/dL (Fasting) save ho gayi"), "FLOW 1. Natural confirmation sent");

    // FLOW 2
    // User: 140, 160/80
    // Assistant: BP preserved + 140 clarified
    // User: sugar
    // Assistant: glucose context requested
    // User: fasting
    // Assistant: sugar saved without BP duplication.
    resetState();
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

    await receiveMessage(makePayload("917618432290", "140, 160/80", "flow2-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "FLOW 2. BP saved immediately");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "FLOW 2. Parameter is blood_pressure");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("160/80 BP note kar liya"), "FLOW 2. Clarification includes saved BP");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("140 kiski reading hai"), "FLOW 2. Asked about unresolved 140");

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

    await receiveMessage(makePayload("917618432290", "sugar", "flow2-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "FLOW 2. Still exactly 1 record (BP is not duplicated)");
    assert(axiosPostCalls[1]?.data?.text?.body.includes("140 sugar note kar loon"), "FLOW 2. Asked about glucose context for 140");

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

    await receiveMessage(makePayload("917618432290", "fasting", "flow2-3", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "FLOW 2. Exactly 2 records saved in total");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "FLOW 2. First is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_sugar", "FLOW 2. Second is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.value === 140, "FLOW 2. Sugar value is 140");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.context === "fasting", "FLOW 2. Sugar context is fasting");
    assert(axiosPostCalls[2]?.data?.text?.body.includes("Sugar 140 mg/dL (Fasting) save ho gayi"), "FLOW 2. Final success confirmation sent");

    // =========================================================================
    // SECTION J: Standalone fasting vs Active pending context
    // =========================================================================
    console.log("\n🧪 Section J: Standalone 'fasting' vs Active pending context");
    resetState();

    // Case A: Standalone "fasting" with NO pending context
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "Greeting or isolated context with no numerical metrics."
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "standalone-fasting", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"].length === 0, "Standalone 'fasting' with no pending context must be ignored and not save any record.");
    console.log("✅ [PASS] Standalone 'fasting' with no pending context is correctly ignored.");
    testsPassed++;

    // Case B: Active pending context with "Sugar 125" followed by "fasting"
    setMockExtractHealthData(async () => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }
        ],
        missingFields: ["glucose_context"],
        reason: "Context missing"
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 125", "caseb-sugar", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"].length === 0, "Initial Sugar 125 must not save any record without context.");

    // Now send "fasting". Under active pending context, it should be resolved deterministically!
    axiosPostCalls = []; // reset outbound logs
    await receiveMessage(makePayload("917618432290", "fasting", "caseb-fasting", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Active pending context must resolve 'fasting' and save exactly 1 record.");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "Resolved record must be blood_sugar.");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 125, "Resolved record must have value 125.");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Resolved record must have fasting context.");
    console.log("✅ [PASS] Active pending context successfully resolves 'fasting' follow-up.");
    testsPassed += 5;

  } catch (error: any) {
    console.error("💥 Unhandled Error during Sprint 37 Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 37 tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 37 Natural Conversational Clarification & Safety tests passed successfully!");
    process.exit(0);
  }
}

runSprint37Tests();
