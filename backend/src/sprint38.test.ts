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

async function runSprint38Tests() {
  console.log("🧪 Running Sprint 38 Comprehensive Multilingual Conversational WhatsApp Experience Tests...");

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
    // ENGLISH STYLE CONVERSATION
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing context",
      })
    );

    // Turn 1: Sugar 125
    await receiveMessage(makePayload("917618432290", "Sugar 125", "msg-eng-1", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "English: Outbound WhatsApp triggered on Turn 1");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("When was this sugar checked?"),
      "English: Prompted naturally for fasting/before meal/after meal/random context"
    );
    assert(!axiosPostCalls[0]?.data?.text?.body.includes("glucose_context"), "English: Safe from internal terminology leakage");

    // Turn 2: after meal
    axiosPostCalls = [];
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "after meal", "msg-eng-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "English: Saved 1 health record on follow-up");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "English: Parameter saved is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 125, "English: Value saved is 125");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "English: Context mapped is post_meal");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your sugar.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Sugar (After meal): 125 mg/dL"),
      "English: Confirmation is natural English"
    );

    // Turn 3: BP
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 120, diastolic: 80, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-eng-bp", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "English: Saved BP");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your BP.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Pressure: 120/80 mmHg"),
      "English: BP confirmation style is correct"
    );

    // Turn 4: pulse
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 72, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Pulse is 72", "msg-eng-pulse", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate", "English: Saved Pulse");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your pulse.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Pulse: 72 bpm"),
      "English: Pulse confirmation style is correct"
    );

    // Turn 5: oxygen
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 98, unit: "%", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Oxygen level 98", "msg-eng-o2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation", "English: Saved Oxygen");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your oxygen.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Oxygen: 98%"),
      "English: Oxygen confirmation style is correct"
    );

    // Turn 6: temperature
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "body_temperature", value: 37, unit: "°C", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Temperature is 37 C", "msg-eng-temp", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "body_temperature", "English: Saved Temperature");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your temperature.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Temperature: 37 °C"),
      "English: Temperature confirmation style is correct"
    );

    // Turn 7: weight
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 70, unit: "kg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "My weight is 70 kg", "msg-eng-weight", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "weight", "English: Saved Weight");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your weight.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Weight: 70 kg"),
      "English: Weight confirmation style is correct"
    );


    // =========================================================================
    // HINGLISH STYLE CONVERSATION
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing context",
      })
    );

    // Turn 1: Sugar 125 hai
    await receiveMessage(makePayload("917618432290", "Sugar 125 hai", "msg-hing-1", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "Hinglish: Outbound WhatsApp triggered on Turn 1");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Yeh sugar kab check ki gayi thi?"),
      "Hinglish: Prompted naturally for fasting/before meal/after meal/random context in Hinglish style"
    );

    // Turn 2: khane ke baad
    axiosPostCalls = [];
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "khane ke baad", "msg-hing-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Hinglish: Saved 1 health record on follow-up");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Hinglish: Context mapped is post_meal");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka sugar successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Sugar (Khane ke baad): 125 mg/dL"),
      "Hinglish: Confirmation is natural Hinglish style"
    );

    // Additional Hinglish records tests
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 140, diastolic: 90, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "BP 140/90 hai", "msg-hing-bp", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka BP successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Pressure: 140/90 mmHg"),
      "Hinglish: BP confirmation style is correct"
    );

    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "oxygen 97 hai", "msg-hing-o2", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka oxygen successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Oxygen: 97%"),
      "Hinglish: Oxygen confirmation style is correct"
    );

    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 82, unit: "kg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "weight 82 kg hai", "msg-hing-weight", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka weight successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Weight: 82 kg"),
      "Hinglish: Weight confirmation style is correct"
    );


    // =========================================================================
    // HINDI STYLE CONVERSATION
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing context",
      })
    );

    // Turn 1: मेरी शुगर 125 है
    await receiveMessage(makePayload("917618432290", "मेरी शुगर 125 है", "msg-hin-1", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "Hindi: Outbound WhatsApp triggered on Turn 1");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("यह शुगर कब चेक की गई थी?"),
      "Hindi: Prompted naturally in Hindi script"
    );

    // Turn 2: खाने के बाद
    axiosPostCalls = [];
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "खाने के बाद", "msg-hin-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Hindi: Saved 1 health record on follow-up");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Hindi: Context mapped is post_meal");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("हो गया! मैंने आपका शुगर सफलतापूर्वक सेव कर लिया है।") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• ब्लड शुगर (खाने के बाद): 125 mg/dL"),
      "Hindi: Confirmation is natural Hindi style"
    );


    // =========================================================================
    // LANGUAGE PERSISTENCE / COHERENCY ACROSS MULTI-TURN
    // =========================================================================
    // Hinglish origin + short English context answer -> Hinglish completion
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_sugar", value: 125, unit: "mg/dL", context: "unknown", confidence: 0.99 }],
        missingFields: ["glucose_context"],
        reason: "Missing context",
      })
    );
    await receiveMessage(makePayload("917618432290", "Sugar 125 hai", "msg-per-1", referenceTimestamp), mockResponse() as any);

    axiosPostCalls = [];
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english", // AI might mistakenly think short "after meal" is English
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "after meal", "msg-per-2", referenceTimestamp), mockResponse() as any);
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka sugar successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Sugar (Khane ke baad): 125 mg/dL"),
      "Persistence: Saved in established Hinglish style even if follow-up message is a generic English phrase"
    );


    // =========================================================================
    // MULTI-MEASUREMENT CONVERSATION
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "blood_pressure", systolic: 136, diastolic: 86, unit: "mmHg", confidence: 0.99 }],
        missingFields: [],
        unresolvedMeasurements: [146],
        reason: "Unresolved 146",
      })
    );

    // Turn 1: 146, BP 136/86 hai
    await receiveMessage(makePayload("917618432290", "146, BP 136/86 hai", "msg-multi-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Multi: Saved BP immediately");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Multi: Saved parameter is blood_pressure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "136/86", "Multi: Value is 136/86");
    console.log("ACTUAL BODY OF OUTBOUND WHATSAPP:", JSON.stringify(axiosPostCalls[0]?.data?.text?.body));
    assert(axiosPostCalls[0]?.data?.text?.body.includes("146 kiski reading hai — sugar, pulse ya weight?"), "Multi: Prompted for unresolved measurement in natural Hinglish style");

    // Turn 2: sugar
    axiosPostCalls = [];
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "sugar", "msg-multi-2", referenceTimestamp), mockResponse() as any);
    assert(getPendingClarification("PAT-101") !== null, "Multi: Still pending clarification");
    assert(getPendingClarification("PAT-101")?.candidateRecords?.[0]?.parameter === "blood_sugar", "Multi: Pending parameter resolved to blood_sugar");
    assert(getPendingClarification("PAT-101")?.candidateRecords?.[0]?.value === 146, "Multi: Pending value resolved to 146");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Sugar 146 note kar li gayi hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("Yeh sugar kab check ki gayi thi?"),
      "Multi: Prompted for glucose context in natural Hinglish style"
    );

    // Turn 3: khane ke baad
    axiosPostCalls = [];
    await receiveMessage(makePayload("917618432290", "khane ke baad", "msg-multi-3", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Multi: Both BP and Sugar saved exactly once under PAT-101");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_sugar", "Multi: Second record is blood_sugar");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.value === 146, "Multi: Glucose value is 146");
    assert(MOCK_RECORDS["PAT-101"]?.[1]?.context === "post_meal", "Multi: Glucose context is post_meal");
    assert(
      axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka sugar successfully save kar liya hai.") &&
      axiosPostCalls[0]?.data?.text?.body.includes("• Blood Sugar (Khane ke baad): 146 mg/dL"),
      "Multi: Saved successfully and acknowledged in Hinglish"
    );


    // =========================================================================
    // FAILURE MODE / DETERMINISTIC FALLBACK WITH LANGUAGE STYLE
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () => {
      throw new Error("AI Down");
    });

    // AI fails + Hinglish input
    await receiveMessage(makePayload("917618432290", "Sugar 127 hai", "msg-fail-hing", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "Failure: Outbound WhatsApp triggered on AI failure (Hinglish)");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Yeh sugar kab check ki gayi thi?"), "Failure: Survives AI offline and retains Hinglish style");

    // AI fails + Hindi input
    resetState();
    await receiveMessage(makePayload("917618432290", "मेरी शुगर 127 है", "msg-fail-hin", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls.length === 1, "Failure: Outbound WhatsApp triggered on AI failure (Hindi)");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("यह शुगर कब चेक की गई थी?"), "Failure: Survives AI offline and retains Hindi style");


    // =========================================================================
    // SAFETY AND NON-TERMINOLOGY EXPOSURE
    // =========================================================================
    // Ambiguous bare number is not guessed
    resetState();
    await receiveMessage(makePayload("917618432290", "145", "msg-safety-bare", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"] === undefined || MOCK_RECORDS["PAT-101"]?.length === 0, "Safety: Bare number is not guessed and zero records saved");
    assert(getPendingClarification("PAT-101")?.unresolvedMeasurements?.[0] === 145, "Safety: Kept in unresolvedMeasurements array");

    // Internal field check
    const rawReply = axiosPostCalls[0]?.data?.text?.body;
    console.log("SAFETY RAW REPLY:", JSON.stringify(rawReply));
    const internalKeywords = [
      "glucose_context",
      "candidateRecords",
      "unresolvedMeasurements",
      "blood_sugar",
      "CLARIFY",
      "RECORD",
      "pending state",
      "parameter registry"
    ];
    const hasTechnicalTerms = internalKeywords.some(term => rawReply.toLowerCase().includes(term.toLowerCase()));
    assert(!hasTechnicalTerms, "Safety: Internal terms never leak to patient-facing replies");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Sprint 38 Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 38 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 38 tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 38 Multilingual Conversational WhatsApp Experience tests passed successfully!");
    process.exit(0);
  }
}

if (require.main === module) {
  runSprint38Tests();
}
