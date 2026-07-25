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
    assert(axiosPostCalls[0]?.data?.text?.body.includes("sugar is 127"), "Message has natural clarification style");

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
    assert(axiosPostCalls[0]?.data?.text?.body.includes("sugar is 127"), "Sugar 127 survived AI failure using deterministic extract");
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
    assert(Math.abs(Number(MOCK_RECORDS["PAT-101"]?.[0]?.value) - 37.0) < 0.1, "Fahrenheit converted to Celsius 37.0");

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
      return JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 80, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      });
    });

    await receiveMessage(makePayload("917618432290", "Pulse 80", "msg-id-1", referenceTimestamp), mockResponse() as any);
    await receiveMessage(makePayload("917618432290", "Pulse 80", "msg-id-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Two different message IDs for the same user saved two distinct records");

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
