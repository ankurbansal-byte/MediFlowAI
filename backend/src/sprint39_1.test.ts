import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
} from "./services/pendingClarificationService";
import {
  validateCandidateRecord,
} from "./utils/healthRecordParser";
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

async function runSprint39_1Tests() {
  console.log("🧪 Running Sprint 39.1 Same-Parameter Multi-Observation Hotfix & UX Cleanup Regression Suite...");

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
    // Setup and Seed Users
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

    // =========================================================================
    // 1. BP morning 130/80, evening 140/90
    // =========================================================================
    resetState();
    // Simulate AI failing or mock it to test deterministic fallback + validation
    setMockExtractHealthData(async () => { return ""; });

    await receiveMessage(
      makePayload("917618432290", "BP morning 130/80, evening 140/90", "msg-bp-1", referenceTimestamp),
      mockResponse() as any
    );

    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 1: Saved exactly two BP records");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "130/80"),
      "Test 1: Saved first BP 130/80"
    );
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "140/90"),
      "Test 1: Saved second BP 140/90"
    );
    assert(
      getPendingClarification("PAT-101") === null,
      "Test 1: No unresolved measurements or pending state"
    );
    assert(
      !axiosPostCalls[0]?.data?.text?.body.includes("What does"),
      "Test 1: Outbound message does NOT ask unresolved measurement questions"
    );

    // =========================================================================
    // 2. morning BP 130/80 and evening BP 140/90
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "morning BP 130/80 and evening BP 140/90", "msg-bp-2", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 2: Saved exactly two BP records");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "130/80"),
      "Test 2: Extracted 130/80"
    );
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "140/90"),
      "Test 2: Extracted 140/90"
    );

    // =========================================================================
    // 3. BP 130/80 at 9 AM, BP 140/90 at 6 PM
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "BP 130/80 at 9 AM, BP 140/90 at 6 PM", "msg-bp-3", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 3: Saved two distinct records with temporal context");
    const rec9am = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "130/80");
    const rec6pm = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "140/90");
    assert(rec9am && rec9am.recordedAt.getHours() === 9, "Test 3: 9 AM temporal context preserved precisely");
    assert(rec6pm && rec6pm.recordedAt.getHours() === 18, "Test 3: 6 PM temporal context preserved precisely");

    // =========================================================================
    // 4. Hindi equivalent with two BP readings
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "आज सुबह BP 130/80 था और शाम को 140/90", "msg-bp-hindi", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 4: Hindi matched both BP readings");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "130/80"),
      "Test 4: Saved 130/80"
    );
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "140/90"),
      "Test 4: Saved 140/90"
    );

    // =========================================================================
    // 5. 145, 135/85
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "145, 135/85", "msg-unresolved-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 5: BP 135/85 saved successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "135/85", "Test 5: Value is indeed 135/85");
    const pendingState = getPendingClarification("PAT-101");
    assert(pendingState !== null, "Test 5: Pending state created");
    assert(
      pendingState?.unresolvedMeasurements?.includes(145),
      "Test 5: 145 remains unresolved"
    );
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("145"),
      "Test 5: Asked clarification about 145"
    );

    // =========================================================================
    // 6. pulse 78 morning, 84 evening
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "pulse 78 morning, 84 evening", "msg-pulse-multi", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 6: Safe same-parameter pulse matched both");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "heart_rate" && r.value === 78),
      "Test 6: Saved pulse 78"
    );
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "heart_rate" && r.value === 84),
      "Test 6: Saved pulse 84"
    );

    // =========================================================================
    // 7. oxygen 97 at 9 AM, 98 at 6 PM
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "oxygen 97 at 9 AM, 98 at 6 PM", "msg-o2-multi", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 7: Safe same-parameter oxygen matched both");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "oxygen_saturation" && r.value === 97),
      "Test 7: Saved oxygen 97"
    );
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "oxygen_saturation" && r.value === 98),
      "Test 7: Saved oxygen 98"
    );

    // =========================================================================
    // 8. sugar fasting 110, after meal 155
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "sugar fasting 110, after meal 155", "msg-sugar-multi", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 8: Saved two sugar records with different contexts");
    const fastRec = MOCK_RECORDS["PAT-101"]?.find(r => r.value === 110);
    const postRec = MOCK_RECORDS["PAT-101"]?.find(r => r.value === 155);
    assert(fastRec?.context === "fasting", "Test 8: fasting context mapped correctly");
    assert(postRec?.context === "post_meal", "Test 8: post_meal context mapped correctly");

    // =========================================================================
    // 9. genuinely ambiguous repeated numbers (do not guess)
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "120, 150", "msg-ambig", referenceTimestamp),
      mockResponse() as any
    );
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "Test 9: Did not save records for genuinely ambiguous bare numbers"
    );
    const pendingAmbig = getPendingClarification("PAT-101");
    assert(pendingAmbig !== null, "Test 9: Created pending clarification for ambiguous numbers");
    assert(
      pendingAmbig?.unresolvedMeasurements?.includes(120) && pendingAmbig?.unresolvedMeasurements?.includes(150),
      "Test 9: Both 120 and 150 remain unresolved"
    );

    // =========================================================================
    // 10. temperature 99 hai
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "temperature 99 hai", "msg-temp-hinglish", referenceTimestamp),
      mockResponse() as any
    );
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "Test 10: Temperature not saved without unit"
    );
    const outboundMsg = axiosPostCalls[0]?.data?.text?.body;
    assert(
      outboundMsg === "Temperature 99 note kar loon 👍 Bas bata dijiye — °C hai ya °F?",
      "Test 10: Sent exactly ONE Hinglish clarification without duplication"
    );

    // =========================================================================
    // 11. follow-up F
    // =========================================================================
    await receiveMessage(
      makePayload("917618432290", "F", "msg-temp-follow", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 11: Temperature saved after follow-up");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "body_temperature", "Test 11: Parameter is body_temperature");
    // 99 F converts to 37.2 C
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 37.2, "Test 11: Converted 99°F to 37.2°C precisely");

    // =========================================================================
    // 12. Oxygen 97
    // =========================================================================
    resetState();
    // Use fallback / mock extract returning oxygen 97
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(
      makePayload("917618432290", "Oxygen 97", "msg-o2-clean", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 12: Saved oxygen record");
    const confirmationText = axiosPostCalls[0]?.data?.text?.body;
    assert(
      confirmationText.includes("Oxygen 97%"),
      `Test 12: No space before % in SpO2 confirmation. Got: "${confirmationText}"`
    );

    // =========================================================================
    // 13. 145, 135/85 -> sugar -> random
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () => { return ""; });
    // First message: "145, 135/85"
    await receiveMessage(
      makePayload("917618432290", "145, 135/85", "msg-flow-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 13: BP 135/85 saved");

    // Follow-up 1: "sugar"
    await receiveMessage(
      makePayload("917618432290", "sugar", "msg-flow-2", referenceTimestamp),
      mockResponse() as any
    );
    const flowPending1 = getPendingClarification("PAT-101");
    assert(flowPending1?.candidateRecords?.[0]?.parameter === "blood_sugar", "Test 13: Resolved 145 as sugar, missing context");

    // Follow-up 2: "random"
    await receiveMessage(
      makePayload("917618432290", "random", "msg-flow-3", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 13: Saved second record after sugar context clarification");
    assert(
      MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_sugar" && r.value === 145 && r.context === "random"),
      "Test 13: Saved sugar 145 with random context"
    );

    // =========================================================================
    // 14. duplicate webhook delivery
    // =========================================================================
    resetState();
    // Deliver first time
    await receiveMessage(
      makePayload("917618432290", "pulse 78 morning, 84 evening", "msg-dup-1", referenceTimestamp),
      mockResponse() as any
    );
    const countBeforeDup = MOCK_RECORDS["PAT-101"]?.length;
    assert(countBeforeDup === 2, "Test 14: Delivered first time, saved 2 records");

    // Deliver second time (exact duplicate whatsappMessageId)
    await receiveMessage(
      makePayload("917618432290", "pulse 78 morning, 84 evening", "msg-dup-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 14: Deduplicated successfully, still exactly 2 records");

  } catch (error: any) {
    console.error("💥 Unhandled error in Sprint 39.1 focused test suite:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 39.1 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 39.1 tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All 14 Sprint 39.1 Same-Parameter Multi-Observation and UX Cleanup regression tests passed successfully!");
    process.exit(0);
  }
}

if (require.main === module) {
  runSprint39_1Tests();
}
