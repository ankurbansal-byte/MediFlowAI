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

async function runSprint37BTests() {
  console.log("🧪 Running Sprint 37B WhatsApp Reliability & AI Failure Hardening Tests...");

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
    // 1. Sugar 127 with successful AI extraction
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 127, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing context",
      });
    });

    await receiveMessage(makePayload("917618432290", "Sugar 127", "msg-ai-success", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "Sugar 127 sent clarify request");
    assert(axiosPostCalls[0]?.data?.text?.body.toLowerCase().includes("sugar") && axiosPostCalls[0]?.data?.text?.body.includes("127"), "Message has natural clarification style");

    // =========================================================================
    // 2. Sugar 127 when AI provider throws / fails
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      throw new Error("402 This request requires more credits, or fewer max_tokens.");
    });

    await receiveMessage(makePayload("917618432290", "Sugar 127", "msg-ai-fails", referenceTimestamp), mockResponse() as any);

    // Deterministic parameter must survive!
    assert(axiosPostCalls.length === 1, "Deterministic fallback triggered when AI threw error");
    assert(axiosPostCalls[0]?.data?.text?.body.toLowerCase().includes("sugar") && axiosPostCalls[0]?.data?.text?.body.includes("127"), "Sugar 127 survived AI failure using deterministic extract");
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("402"), "Technical error was NOT exposed to user");
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("Error"), "Technical error was NOT exposed to user");

    // Check that pending clarification is set up correctly
    const pending = getPendingClarification("PAT-101");
    assert(pending !== null, "Pending clarification was stored on AI failure");
    assert(pending?.candidateRecords?.[0]?.parameter === "blood_sugar", "Saved pending parameter is blood_sugar");
    assert(pending?.candidateRecords?.[0]?.value === 127, "Saved pending value is 127");
    assert(!!(pending?.missingFields?.includes("glucose_context")), "glucose_context added to missingFields");

    // =========================================================================
    // 3. Fasting follow-up resolves pending glucose and is saved exactly once
    // =========================================================================
    // Follow-up flow with AI failure (smartMock or fallback)
    setMockExtractHealthData(async (msg) => {
      // simulate AI failure on follow-up or smart ignored follow-up
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      });
    });

    await receiveMessage(makePayload("917618432290", "fasting", "msg-ai-fails-followup", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Glucose saved successfully on follow-up even when AI is unhelpful/unavailable");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "Saved parameter is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 127, "Saved value is 127");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Saved context is fasting");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.recordedAt?.getTime() === refDate.getTime(), "Original recordedAt date preserved");

    // Deliver same follow-up webhook ID again (idempotency check)
    await receiveMessage(makePayload("917618432290", "fasting", "msg-ai-fails-followup", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Duplicate webhook delivery did not save record again");

    // =========================================================================
    // 4. Bare "127" is NOT guessed as glucose
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      throw new Error("AI Down");
    });

    await receiveMessage(makePayload("917618432290", "127", "msg-bare-num", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "No record saved for bare '127'");

    const pendingBare = getPendingClarification("PAT-101");
    assert(pendingBare !== null, "Bare '127' sets a pending clarification for unresolved measurements");
    assert(pendingBare?.unresolvedMeasurements?.[0] === 127, "Bare '127' is in unresolvedMeasurements");
    assert(pendingBare?.candidateRecords?.length === 0, "Bare '127' has NO candidate records guessed");

    // =========================================================================
    // 5. BP 160/80 works during provider failure
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      throw new Error("AI Down");
    });

    await receiveMessage(makePayload("917618432290", "BP 160/80", "msg-bp-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "BP 160/80 saved successfully during AI provider failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Saved parameter is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "160/80", "Saved value is 160/80");

    // =========================================================================
    // 6. Explicit pulse works during provider failure
    // =========================================================================
    resetState();
    await receiveMessage(makePayload("917618432290", "Pulse 82", "msg-pulse-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse 82 saved successfully during AI provider failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate", "Saved parameter is heart_rate");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 82, "Saved value is 82");

    // =========================================================================
    // 7. Explicit temperature works during provider failure
    // =========================================================================
    resetState();
    await receiveMessage(makePayload("917618432290", "Temperature 98.6", "msg-temp-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Temperature 98.6 saved successfully during AI provider failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "body_temperature", "Saved parameter is body_temperature");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 98.6, "Fahrenheit preserved as 98.6");

    // =========================================================================
    // 8. Explicit weight works during provider failure
    // =========================================================================
    resetState();
    await receiveMessage(makePayload("917618432290", "Weight 95 kg", "msg-weight-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Weight 95 kg saved successfully during AI provider failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "weight", "Saved parameter is weight");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 95, "Saved value is 95");

    // =========================================================================
    // 9. Mixed "140, 160/80" behavior remains intact
    // =========================================================================
    resetState();
    // Simulate AI success/failure mix (or fallback where we can parse BP deterministically and find 140 is unresolved)
    // Actually, findUnresolvedPlausibleNumbers handles unresolved numbers deterministically!
    // Since BP 160/80 is parsed deterministically, 140 is left unresolved!
    await receiveMessage(makePayload("917618432290", "140, 160/80", "msg-mixed-fail", referenceTimestamp), mockResponse() as any);

    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "BP saved immediately");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Saved first parameter is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "160/80", "Saved value is 160/80");

    const pendingMixed = getPendingClarification("PAT-101");
    assert(pendingMixed !== null, "Pending state was stored for unresolved 140");
    assert(pendingMixed?.unresolvedMeasurements?.[0] === 140, "Unresolved measurement 140 is tracked");

    // =========================================================================
    // 10. Different message IDs remain independent
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      const val = msg.toLowerCase().includes("81") ? 81 : 80;
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: val, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      });
    });

    await receiveMessage(makePayload("917618432290", "Pulse 80", "msg-id-1", referenceTimestamp), mockResponse() as any);
    await receiveMessage(makePayload("917618432290", "Pulse 81", "msg-id-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Two different message IDs for the same user saved two distinct records");

    // =========================================================================
    // 11. Sprint 37B.1 Pending Parameter Resolution Regression
    // =========================================================================
    resetState();
    // Turn 1: User says "145, 135/85"
    setMockExtractHealthData(async (msg) => {
      const clean = msg.toLowerCase().trim();
      if (clean === "sugar" || clean === "random") {
        return JSON.stringify({
          language: "english",
          action: "IGNORE",
          intent: "conversational",
          candidateRecords: [],
          missingFields: [],
          unresolvedMeasurements: [],
        });
      }
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 135, diastolic: 85, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
        unresolvedMeasurements: [145],
        reason: "Unresolved 145",
      });
    });

    await receiveMessage(makePayload("917618432290", "145, 135/85", "flow-step-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "BP 135/85 saved immediately on Turn 1");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Saved parameter is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "135/85", "Saved value is 135/85");

    const pendingAfterTurn1 = getPendingClarification("PAT-101");
    assert(pendingAfterTurn1 !== null, "Pending state contains unresolved 145");
    assert(pendingAfterTurn1?.unresolvedMeasurements?.[0] === 145, "Unresolved measurement 145 is tracked");

    // Reset outbound message logs
    axiosPostCalls = [];

    // Turn 2: User says "sugar"
    await receiveMessage(makePayload("917618432290", "sugar", "flow-step-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "BP is saved exactly once (not duplicated on progressive step)");

    // Check that we transitioned to glucose-context clarification
    const pendingAfterTurn2 = getPendingClarification("PAT-101");
    assert(pendingAfterTurn2 !== null, "Pending state is still active");
    assert(pendingAfterTurn2?.unresolvedMeasurements?.length === 0, "145 is resolved (no longer in unresolved list)");
    assert(pendingAfterTurn2?.candidateRecords?.[0]?.parameter === "blood_sugar", "Incomplete candidate record is blood_sugar");
    assert(pendingAfterTurn2?.candidateRecords?.[0]?.value === 145, "Pending sugar value is 145");
    assert(!!pendingAfterTurn2?.missingFields?.includes("glucose_context"), "glucose_context is requested");

    // Verify response
    assert(axiosPostCalls.length === 1, "Clarification response was sent");
    assert(
      axiosPostCalls[0]?.data?.text?.body.toLowerCase().includes("sugar") && axiosPostCalls[0]?.data?.text?.body.toLowerCase().includes("checked"),
      "Asked glucose context naturally and didn't repeat 'What does 145 represent?'"
    );

    // Reset outbound message logs
    axiosPostCalls = [];

    // Turn 3: User says "random"
    await receiveMessage(makePayload("917618432290", "random", "flow-step-3", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Sugar is successfully saved (total 2 records)");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_sugar", "Saved record is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.value === 145, "Saved sugar value is 145");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.context === "random", "Saved sugar context is random");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.recordedAt?.getTime() === refDate.getTime(), "Original message timestamp preserved");

    const pendingAfterTurn3 = getPendingClarification("PAT-101");
    assert(pendingAfterTurn3 === null, "Pending state cleared after completion");

    // =========================================================================
    // 12. Standalone "sugar" without pending value does not invent a reading
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
      });
    });

    await receiveMessage(makePayload("917618432290", "sugar", "standalone-sugar-msg", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "Standalone 'sugar' with no pending value does not save anything");
    assert(getPendingClarification("PAT-101") === null, "No pending clarification created for standalone 'sugar'");

    // =========================================================================
    // 13. Pending 145 + "pulse" resolves correctly according to existing supported behavior
    // =========================================================================
    resetState();
    // Turn 1: 145
    setMockExtractHealthData(async (msg) => {
      return JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [],
        missingFields: [],
        unresolvedMeasurements: [145],
        reason: "Unresolved 145",
      });
    });
    await receiveMessage(makePayload("917618432290", "145", "flow-pulse-1", referenceTimestamp), mockResponse() as any);

    // Turn 2: "pulse"
    await receiveMessage(makePayload("917618432290", "pulse", "flow-pulse-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse resolved and saved immediately");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate", "Parameter is heart_rate");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 145, "Value is 145");
    assert(getPendingClarification("PAT-101") === null, "Pending state cleared after pulse resolution");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Sprint 37B Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 37B tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 37B WhatsApp Reliability & AI Failure Hardening tests passed successfully!");
    process.exit(0);
  }
}

runSprint37BTests();
