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

async function runSprint35Tests() {
  console.log("🧪 Running Sprint 35 Comprehensive Conversational Clarification & Pending Context Memory Tests...");

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
    // ASSERTION 1: "Sugar 125" -> CLARIFY -> zero records saved.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
        ],
        missingFields: ["glucose_context"],
        reason: "Glucose context is missing.",
      })
    );

    const res1 = mockResponse();
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-1", referenceTimestamp), res1);
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "1. Sugar 125 triggers CLARIFY and saves zero records."
    );
    assert(
      axiosPostCalls.length === 1 &&
        axiosPostCalls[0].data.text.body.includes("Was this glucose reading fasting"),
      "1. Sent English glucose clarification prompt."
    );

    // =========================================================================
    // ASSERTION 2: Sugar 125 -> follow up "fasting" -> exactly one glucose record saved.
    // =========================================================================
    // Under test we mock OpenAI's extraction for the follow-up, which might return IGNORE for "fasting"
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      })
    );
    const res2 = mockResponse();
    await receiveMessage(makePayload("917618432290", "fasting", "msg-2", referenceTimestamp), res2);
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "2. Follow up 'fasting' resolves and saves exactly one glucose record."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].parameter === "blood_sugar" &&
        MOCK_RECORDS["PAT-101"][0].value === 125 &&
        MOCK_RECORDS["PAT-101"][0].unit === "mg/dL",
      "2. Glucose record value is 125 mg/dL."
    );

    // =========================================================================
    // ASSERTION 3: Sugar 125 -> follow up "khali pet" -> exactly one glucose record saved.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.toLowerCase().includes("sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    // Simulate first message
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-3a", referenceTimestamp), mockResponse());
    // Follow up "khali pet"
    await receiveMessage(makePayload("917618432290", "khali pet", "msg-3b", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "3. Follow up 'khali pet' saves exactly one glucose record."
    );
    assert(
      getPendingClarification("PAT-101") === null,
      "3. Pending clarification is cleared after completion."
    );

    // =========================================================================
    // ASSERTION 4: Hindi glucose clarification
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
        ],
        missingFields: ["glucose_context"],
        reason: "Glucose context is missing.",
      })
    );
    await receiveMessage(makePayload("917618432290", "शुगर १२५", "msg-4", referenceTimestamp), mockResponse());
    assert(
      axiosPostCalls.length === 1 &&
        axiosPostCalls[0].data.text.body.includes("यह शुगर रीडिंग खाली पेट"),
      "4. Original Devanagari message triggers Devanagari clarification prompt."
    );

    // =========================================================================
    // ASSERTION 5: Cross-language follow-up
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "hinglish",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "hinglish",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-5a", referenceTimestamp), mockResponse());
    assert(
      axiosPostCalls[0].data.text.body.includes("Ye sugar reading fasting"),
      "5. Sent Hinglish clarification prompt."
    );
    // Reply in Hindi Devanagari
    await receiveMessage(makePayload("917618432290", "खाली पेट", "msg-5b", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "5. Resolved cross-language Hindi Devanagari follow-up to fasting."
    );

    // =========================================================================
    // ASSERTION 6: BP 140 -> CLARIFY -> zero records saved.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("BP")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_pressure", systolic: 140, unit: "mmHg", confidence: 0.99 },
          ],
          missingFields: ["diastolic"],
          reason: "Diastolic is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "BP 140", "msg-6", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "6. Incomplete BP 140 triggers CLARIFY and saves zero records."
    );
    assert(
      axiosPostCalls[0].data.text.body.includes("Please provide the second (diastolic) BP number"),
      "6. Sent English BP clarification prompt."
    );

    // =========================================================================
    // ASSERTION 7: BP 140 -> 90 -> exactly one 140/90 blood pressure record saved.
    // =========================================================================
    await receiveMessage(makePayload("917618432290", "90", "msg-7", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "7. Follow up '90' saves exactly one blood pressure record."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].parameter === "blood_pressure" &&
        MOCK_RECORDS["PAT-101"][0].value === "140/90",
      "7. Saved record value is exactly 140/90."
    );

    // =========================================================================
    // ASSERTION 8: Temperature 38 -> clarification.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Temperature")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "body_temperature", value: 38, unit: "unknown", confidence: 0.99 },
          ],
          missingFields: ["temperature_unit"],
          reason: "Temperature unit is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "Temperature 38", "msg-8", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "8. Ambiguous temperature triggers CLARIFY and saves zero records."
    );
    assert(
      axiosPostCalls[0].data.text.body.includes("Was the temperature 38 °C or °F"),
      "8. Sent temperature unit clarification prompt."
    );

    // =========================================================================
    // ASSERTION 9: Temperature 38 -> Celsius -> exactly one temperature record saved.
    // =========================================================================
    await receiveMessage(makePayload("917618432290", "Celsius", "msg-9", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "9. Follow up 'Celsius' saves exactly one temperature record."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].parameter === "body_temperature" &&
        MOCK_RECORDS["PAT-101"][0].value === 38 &&
        MOCK_RECORDS["PAT-101"][0].unit === "°C",
      "9. Temperature record value is 38 °C."
    );

    // =========================================================================
    // ASSERTION 10: Complete glucose message -> no clarification.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "fasting", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );
    await receiveMessage(makePayload("917618432290", "fasting sugar 125", "msg-10", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "10. Complete glucose message is processed immediately with zero clarifications."
    );
    assert(
      axiosPostCalls[0].data.text.body.includes("saved successfully"),
      "10. Sent save confirmation message."
    );

    // =========================================================================
    // ASSERTION 11: Complete BP -> no clarification.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 120, diastolic: 80, unit: "mmHg", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );
    await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-11", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "11. Complete BP is processed immediately with zero clarifications."
    );

    // =========================================================================
    // ASSERTION 12: Multiple message: BP complete + glucose incomplete.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("BP")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_pressure", systolic: 128, diastolic: 82, unit: "mmHg", confidence: 0.99 },
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "BP 128/82 and sugar 125", "msg-12", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "12. Mixed message processes and saves complete BP immediately."
    );
    assert(
      MOCK_RECORDS["PAT-101"][0].parameter === "blood_pressure" &&
        MOCK_RECORDS["PAT-101"][0].value === "128/82",
      "12. Complete BP was saved correctly."
    );
    assert(
      getPendingClarification("PAT-101") !== null,
      "12. Incomplete glucose is saved into pending clarification state."
    );

    // =========================================================================
    // ASSERTION 13: Complete BP persists once while glucose remains pending.
    // =========================================================================
    assert(
      MOCK_RECORDS["PAT-101"].length === 1 &&
        MOCK_RECORDS["PAT-101"][0].parameter === "blood_pressure",
      "13. Complete BP persists once while glucose is still pending."
    );

    // =========================================================================
    // ASSERTION 14: Later glucose clarification does not duplicate BP.
    // =========================================================================
    await receiveMessage(makePayload("917618432290", "fasting", "msg-14", referenceTimestamp), mockResponse());
    assert(
      MOCK_RECORDS["PAT-101"].length === 2,
      "14. Completing pending glucose results in exactly 2 total records."
    );
    assert(
      MOCK_RECORDS["PAT-101"].some(r => r.parameter === "blood_sugar" && r.value === 125) &&
        MOCK_RECORDS["PAT-101"].some(r => r.parameter === "blood_pressure" && r.value === "128/82"),
      "14. Both glucose and blood pressure records are stored, and BP is NOT duplicated."
    );

    // =========================================================================
    // ASSERTION 15: Pending context is patient-specific.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    // Patient A (PAT-101) sends "Sugar 125"
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-15a", referenceTimestamp), mockResponse());
    const pendingA = getPendingClarification("PAT-101");
    const pendingB = getPendingClarification("PAT-102");
    assert(pendingA !== null, "15. Pending clarification is saved for Patient A.");
    assert(pendingB === null, "15. Pending clarification is not saved for Patient B.");

    // =========================================================================
    // ASSERTION 16: Cross-patient follow-up cannot complete pending context.
    // =========================================================================
    // Patient B (PAT-102) replies "fasting"
    await receiveMessage(makePayload("919999999999", "fasting", "msg-16b", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "16. Patient B's message does not resolve or complete Patient A's pending record."
    );
    assert(
      !MOCK_RECORDS["PAT-102"] || MOCK_RECORDS["PAT-102"].length === 0,
      "16. Patient B's follow up does not create a record for Patient B either."
    );

    // =========================================================================
    // ASSERTION 17: Cross-hospital safety.
    // =========================================================================
    assert(
      pendingA?.hospitalId === "HOSP-001",
      "17. Patient A's pending context is securely bound to HOSP-001."
    );

    // =========================================================================
    // ASSERTION 18: Pending TTL expiration.
    // =========================================================================
    // We can simulate TTL expiration by setting the expiresAt to a past date
    const clarif = getPendingClarification("PAT-101");
    if (clarif) {
      clarif.expiresAt = new Date(Date.now() - 5000); // 5 seconds ago
    }
    const expiredClarif = getPendingClarification("PAT-101");
    assert(expiredClarif === null, "18. Expired pending context is correctly cleared and returns null.");

    // =========================================================================
    // ASSERTION 19: Expired context cannot create a record.
    // =========================================================================
    // Let's explicitly recreate an expired state in the store
    setPendingClarification("PAT-101", {
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      originalWhatsappMessageId: "msg-19a",
      originalSourceText: "Sugar 125",
      language: "english",
      candidateRecords: [
        { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
      ],
      missingFields: ["glucose_context"],
      clarificationReason: "Glucose context is missing.",
      originalMessageDate: new Date(),
    });
    const clarif19 = getPendingClarification("PAT-101");
    if (clarif19) {
      clarif19.expiresAt = new Date(Date.now() - 5000); // Expired
    }
    // Now patient sends fasting
    await receiveMessage(makePayload("917618432290", "fasting", "msg-19b", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "19. Expired pending context cannot be completed by a subsequent message."
    );

    // =========================================================================
    // ASSERTION 20: Cancellation.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-20a", referenceTimestamp), mockResponse());
    assert(getPendingClarification("PAT-101") !== null, "20. Pending clarification created.");
    // Patient sends cancel command
    await receiveMessage(makePayload("917618432290", "cancel", "msg-20b", referenceTimestamp), mockResponse());
    assert(getPendingClarification("PAT-101") === null, "20. Pending context is successfully cancelled.");
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "20. Cancellation did not create any HealthRecord."
    );

    // =========================================================================
    // ASSERTION 21: New unrelated health message while clarification pending.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      if (msg.includes("BP")) {
        return JSON.stringify({
          language: "english",
          action: "RECORD",
          intent: "health_measurement",
          candidateRecords: [
            { parameter: "blood_pressure", systolic: 130, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          ],
          missingFields: [],
          reason: "",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    // 1. Send "Sugar 125" -> Pending clarification
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-21a", referenceTimestamp), mockResponse());
    assert(getPendingClarification("PAT-101") !== null, "21. Glucose clarification is pending.");

    // 2. Patient sends "BP 130/80" -> different complete parameter
    await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-21b", referenceTimestamp), mockResponse());
    // 3. Verify BP was saved
    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1 &&
        MOCK_RECORDS["PAT-101"][0].parameter === "blood_pressure",
      "21. BP was saved as a new complete measurement."
    );
    // 4. Verify glucose clarification is still pending
    assert(getPendingClarification("PAT-101") !== null, "21. Glucose clarification is preserved.");

    // =========================================================================
    // ASSERTION 22: Duplicate original webhook.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
        ],
        missingFields: ["glucose_context"],
        reason: "Glucose context is missing.",
      })
    );
    axiosPostCalls = [];
    // original webhook message
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-22", referenceTimestamp), mockResponse());
    const countAcks1 = axiosPostCalls.length;
    // duplicate webhook delivery (consecutive with same ID)
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-22", referenceTimestamp), mockResponse());
    const countAcks2 = axiosPostCalls.length;
    assert(
      countAcks1 === 1 && countAcks2 === 1,
      "22. Duplicate original webhook delivery does not generate a second clarification message."
    );

    // =========================================================================
    // ASSERTION 23: Duplicate follow-up webhook.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    // 1. Send "Sugar 125" -> Pending clarification
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-23a", referenceTimestamp), mockResponse());
    // 2. Send follow-up "fasting"
    await receiveMessage(makePayload("917618432290", "fasting", "msg-23b", referenceTimestamp), mockResponse());
    assert(MOCK_RECORDS["PAT-101"].length === 1, "23. Saved exactly one glucose record.");
    // 3. Send duplicate follow-up delivery of "msg-23b"
    await receiveMessage(makePayload("917618432290", "fasting", "msg-23b", referenceTimestamp), mockResponse());
    assert(MOCK_RECORDS["PAT-101"].length === 1, "23. Duplicate follow-up delivery did NOT save duplicate glucose records.");

    // =========================================================================
    // ASSERTION 24: Exactly-once final persistence.
    // =========================================================================
    assert(
      MOCK_RECORDS["PAT-101"].filter(r => r.parameter === "blood_sugar").length === 1,
      "24. Completed pending record was persisted exactly once."
    );

    // =========================================================================
    // ASSERTION 25: Original timestamp preservation.
    // =========================================================================
    resetState();
    const originalTime = "1784541600"; // 2026-07-20T10:00:00Z
    const followUpTime = "1784541900"; // 2026-07-20T10:05:00Z

    // original message
    setMockExtractHealthData(async (msg) => {
      if (msg.includes("Sugar")) {
        return JSON.stringify({
          language: "english",
          action: "CLARIFY",
          intent: "ambiguous_health_message",
          candidateRecords: [
            { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
          ],
          missingFields: ["glucose_context"],
          reason: "Glucose context is missing.",
        });
      }
      return JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      });
    });
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-25a", originalTime), mockResponse());

    // follow-up message at a later time
    await receiveMessage(makePayload("917618432290", "fasting", "msg-25b", followUpTime), mockResponse());

    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1,
      "25. Completed glucose record saved successfully."
    );
    const recordedTime = MOCK_RECORDS["PAT-101"][0].recordedAt;
    const expectedTime = new Date(parseInt(originalTime, 10) * 1000);
    assert(
      recordedTime.getTime() === expectedTime.getTime(),
      "25. Measurement timestamp is preserved from the ORIGINAL message (10:00, not 10:05)."
    );

    // =========================================================================
    // ASSERTION 26: Conversation-only reply without pending state creates no HealthRecord.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "Conversational greeting.",
      })
    );
    await receiveMessage(makePayload("917618432290", "thank you", "msg-26", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "26. Conversation-only reply (no pending state) does NOT create any HealthRecord."
    );

    // =========================================================================
    // ASSERTION 27: AI hallucinated value still rejected after pending merge.
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "",
      })
    );
    // 1. Store a pending glucose with an AI hallucinated value "125" (which is NOT in original message "my sugar is normal")
    setPendingClarification("PAT-101", {
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      originalWhatsappMessageId: "msg-27a",
      originalSourceText: "my sugar is normal",
      language: "english",
      candidateRecords: [
        { parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 },
      ],
      missingFields: ["glucose_context"],
      clarificationReason: "Glucose context is missing.",
      originalMessageDate: new Date(),
    });
    // 2. Send follow-up fasting (with NO number)
    await receiveMessage(makePayload("917618432290", "fasting", "msg-27b", referenceTimestamp), mockResponse());
    assert(
      !MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0,
      "27. AI hallucinated value still rejected after merge because neither original nor follow-up contains '125'."
    );

    // =========================================================================
    // ASSERTION 28: Existing RECORD/IGNORE behavior remains intact.
    // =========================================================================
    resetState();
    // RECORD
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 },
        ],
        missingFields: [],
        reason: "",
      })
    );
    await receiveMessage(makePayload("917618432290", "Oxygen 97%", "msg-28a", referenceTimestamp), mockResponse());
    // IGNORE
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
        reason: "Greeting.",
      })
    );
    await receiveMessage(makePayload("917618432290", "Hello!", "msg-28b", referenceTimestamp), mockResponse());

    assert(
      MOCK_RECORDS["PAT-101"] && MOCK_RECORDS["PAT-101"].length === 1 &&
        MOCK_RECORDS["PAT-101"][0].parameter === "oxygen_saturation" &&
        MOCK_RECORDS["PAT-101"][0].value === 97,
      "28. Existing RECORD behavior is perfectly intact."
    );

  } catch (error) {
    console.error("💥 Test suite threw unexpected error:", error);
    testsFailed++;
  }

  // Clean up mock extractor
  setMockExtractHealthData(null);

  console.log("\n=========================================");
  console.log(`📊 Sprint 35 Test Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 35 Conversational Clarification & Pending Context Memory tests passed successfully!");
    process.exit(0);
  }
}

runSprint35Tests();
