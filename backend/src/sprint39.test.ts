import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
} from "./services/pendingClarificationService";
import {
  isCorrectionMessage,
  validateCandidateRecord
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

async function runSprint39Tests() {
  console.log("🧪 Running Sprint 39 Comprehensive Home-Vitals WhatsApp Intelligence & Real-World Robustness Tests...");

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
    // 1. PULSE / HEART RATE
    // =========================================================================
    // Pulse 82 (English)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 82, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Pulse 82", "msg-pulse-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse 1: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 82, "Pulse 1: heart_rate is 82");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Done! I've successfully saved your pulse.") && axiosPostCalls[0]?.data?.text?.body.includes("• Pulse: 82 bpm"), "Pulse 1: Outbound message is correct");

    // mera pulse 82 hai (Hinglish)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 82, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "mera pulse 82 hai", "msg-pulse-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse 2 (Hinglish): Saved 1 record");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka pulse successfully save kar liya hai.") && axiosPostCalls[0]?.data?.text?.body.includes("• Pulse: 82 bpm"), "Pulse 2 (Hinglish): Outbound message matches style");

    // पल्स 82 है (Hindi)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 82, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "पल्स 82 है", "msg-pulse-3", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse 3 (Hindi): Saved 1 record");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("हो गया! मैंने आपका पल्स सफलतापूर्वक सेव कर लिया है।") && axiosPostCalls[0]?.data?.text?.body.includes("• पल्स: 82 bpm"), "Pulse 3 (Hindi): Outbound message matches style");

    // AI failure deterministic fallback for pulse
    resetState();
    setMockExtractHealthData(async () => { throw new Error("AI Offline"); });
    await receiveMessage(makePayload("917618432290", "dhadkan 78 bpm", "msg-pulse-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Pulse Fallback: Saved 1 record despite AI failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 78, "Pulse Fallback: value is 78");

    // Standalone arbitrary number should not be guessed as pulse
    resetState();
    await receiveMessage(makePayload("917618432290", "82", "msg-pulse-bare", referenceTimestamp), mockResponse() as any);
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"]?.length === 0, "Pulse Safety: Bare number 82 not guessed as heart rate");


    // =========================================================================
    // 2. OXYGEN SATURATION / SPO2
    // =========================================================================
    // Oxygen 97% (English)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Oxygen 97%", "msg-o2-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "SpO2 1: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 97, "SpO2 1: oxygen is 97");

    // oxygen 97 hai (Hinglish)
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
    await receiveMessage(makePayload("917618432290", "oxygen 97 hai", "msg-o2-2", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Done! Maine aapka oxygen successfully save kar liya hai.") && axiosPostCalls[0]?.data?.text?.body.includes("• Oxygen: 97%"), "SpO2 Hinglish: Confirmed in Hinglish");

    // ऑक्सीजन 97 है (Hindi)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "ऑक्सीजन 97 है", "msg-o2-3", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls[0]?.data?.text?.body.includes("हो गया! मैंने आपका ऑक्सीजन सफलतापूर्वक सेव कर लिया है।") && axiosPostCalls[0]?.data?.text?.body.includes("• ऑक्सीजन: 97%"), "SpO2 Hindi: Confirmed in Hindi");

    // AI failure fallback for oxygen
    resetState();
    setMockExtractHealthData(async () => { throw new Error("AI Offline"); });
    await receiveMessage(makePayload("917618432290", "SpO2 96", "msg-o2-fail", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "SpO2 Fallback: Saved 1 record despite AI failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 96, "SpO2 Fallback: value is 96");


    // =========================================================================
    // 3. BODY TEMPERATURE
    // =========================================================================
    // Fahrenheit explicit
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "body_temperature", value: 98.6, unit: "°F", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Temp 98.6 F", "msg-temp-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Temp 1: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "body_temperature" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 98.6, "Temp 1: preserved 98.6F exactly");

    // Celsius explicit
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
    await receiveMessage(makePayload("917618432290", "temperature 37 C", "msg-temp-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Temp 2: Celsius explicit saved successfully");

    // Ambiguity handling (no unit)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [{ parameter: "body_temperature", value: 99, unit: "unknown", confidence: 0.99 }],
        missingFields: ["temperature_unit"],
      })
    );
    await receiveMessage(makePayload("917618432290", "temperature 99", "msg-temp-ambig", referenceTimestamp), mockResponse() as any);
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"]?.length === 0, "Temp Ambig: Did not persist record without unit");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Temperature 99 has been noted.") && axiosPostCalls[0]?.data?.text?.body.includes("Please specify the temperature unit:"), "Temp Ambig: Asked language-matched clarification");


    // =========================================================================
    // 4. WEIGHT
    // =========================================================================
    // Weight 82 kg (English)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 82, unit: "kg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Weight 82 kg", "msg-weight-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Weight 1: Saved weight successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "weight" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 82, "Weight 1: weight is 82");

    // weight 82 (implicit kg unit)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 82, unit: "kg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "weight 82", "msg-weight-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Weight 2: Missing unit inferred as kg successfully");

    // वजन 82 किलो है (Hindi)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hindi",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "weight", value: 82, unit: "kg", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "वजन 82 किलो है", "msg-weight-3", referenceTimestamp), mockResponse() as any);
    assert(axiosPostCalls[0]?.data?.text?.body.includes("हो गया! मैंने आपका वजन सफलतापूर्वक सेव कर लिया है।") && axiosPostCalls[0]?.data?.text?.body.includes("• वजन: 82 kg"), "Weight 3 (Hindi): Confirm matches Hindi style");


    // =========================================================================
    // 5. RESPIRATORY RATE
    // =========================================================================
    // Respiratory rate 18
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "respiratory_rate", value: 18, unit: "breaths/min", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Respiratory rate 18", "msg-rr-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "RR 1: Saved RR successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "respiratory_rate" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 18, "RR 1: rr is 18");

    // RR 18
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "respiratory_rate", value: 18, unit: "breaths/min", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "RR 18", "msg-rr-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "RR 2: RR parsed correctly");

    // Symptom statement only should NOT record a respiratory rate
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "IGNORE",
        intent: "conversational",
        candidateRecords: [],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "saans lene mein dikkat hai", "msg-rr-symptom", referenceTimestamp), mockResponse() as any);
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"]?.length === 0, "RR Safety: Symptom statement created no measurement records");


    // =========================================================================
    // 6. HEIGHT
    // =========================================================================
    // Height 170 cm
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "height", value: 170, unit: "cm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "Height 170 cm", "msg-height-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Height 1: Saved height successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "height" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 170, "Height 1: height is 170");

    // height 5 ft 8 in (conversion correctness)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "height", value: 172.7, unit: "cm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "height 5 ft 8 in", "msg-height-2", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Height 2: Saved ft/in conversion successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 172.7, "Height 2: 5'8\" converted to 172.7 cm");

    // height 5'8" via deterministic fallback
    resetState();
    setMockExtractHealthData(async () => { throw new Error("AI Offline"); });
    await receiveMessage(makePayload("917618432290", "height 5'8\"", "msg-height-fallback", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Height Fallback: Saved height 5'8\" converted successfully during AI failure");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 172.7, "Height Fallback: value is 172.7");


    // =========================================================================
    // 7. MULTIPLE PARAMETERS IN ONE MESSAGE
    // =========================================================================
    // BP 130/80, pulse 82, oxygen 97
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 130, diastolic: 80, unit: "mmHg", confidence: 0.99 },
          { parameter: "heart_rate", value: 82, unit: "bpm", confidence: 0.99 },
          { parameter: "oxygen_saturation", value: 97, unit: "%", confidence: 0.99 }
        ],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "BP 130/80, pulse 82, oxygen 97", "msg-multi-param", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 3, "Multi-Param: Saved all 3 parameters in one message");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "130/80"), "Multi-Param: Mapped BP");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "heart_rate" && r.value === 82), "Multi-Param: Mapped heart_rate");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "oxygen_saturation" && r.value === 97), "Multi-Param: Mapped oxygen");

    // Exactly once persistence check (no duplicates saved on reprocessing/second delivery)
    await receiveMessage(makePayload("917618432290", "BP 130/80, pulse 82, oxygen 97", "msg-multi-param", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 3, "Multi-Param Safety: Deduplication kept total count at 3");

    // One bad candidate does not silently erase unrelated valid candidates
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "CLARIFY",
        intent: "ambiguous_health_message",
        candidateRecords: [
          { parameter: "heart_rate", value: 72, unit: "bpm", confidence: 0.99 },
          { parameter: "blood_sugar", value: 120, unit: "mg/dL", context: "unknown", confidence: 0.99 }
        ],
        missingFields: ["glucose_context"],
      })
    );
    await receiveMessage(makePayload("917618432290", "pulse 72, sugar 120", "msg-multi-clari", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Multi-Clarify: Pulse (complete) saved successfully");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 72, "Multi-Clarify: value is 72");
    assert(getPendingClarification("PAT-101") !== null, "Multi-Clarify: Pending state created for incomplete sugar");


    // =========================================================================
    // 8. MULTIPLE OBSERVATIONS OF THE SAME PARAMETER
    // =========================================================================
    // BP morning 130/80, evening 140/90
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "english",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [
          { parameter: "blood_pressure", systolic: 130, diastolic: 80, unit: "mmHg", recordedAt: "2026-07-20T08:00:00.000Z", confidence: 0.99 },
          { parameter: "blood_pressure", systolic: 140, diastolic: 90, unit: "mmHg", recordedAt: "2026-07-20T20:00:00.000Z", confidence: 0.99 }
        ],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "BP morning 130/80, evening 140/90", "msg-double-bp", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Double Same Param: Saved both legitimate BP readings");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "130/80" && MOCK_RECORDS["PAT-101"]?.[1]?.value === "140/90", "Double Same Param: Values are correct and distinct");


    // =========================================================================
    // 9. RELATIVE / EXPLICIT TIME HANDLING
    // =========================================================================
    // Kal shaam pulse 84 (Yesterday relative date anchoring)
    resetState();
    setMockExtractHealthData(async () =>
      JSON.stringify({
        language: "hinglish",
        action: "RECORD",
        intent: "health_measurement",
        candidateRecords: [{ parameter: "heart_rate", value: 84, unit: "bpm", confidence: 0.99 }],
        missingFields: [],
      })
    );
    await receiveMessage(makePayload("917618432290", "kal shaam pulse 84", "msg-time-1", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Temporal: Saved record successfully");
    const recDate = MOCK_RECORDS["PAT-101"]?.[0]?.recordedAt;
    const expectedDate = new Date(parseInt(referenceTimestamp) * 1000);
    expectedDate.setDate(expectedDate.getDate() - 1);
    assert(recDate.getDate() === expectedDate.getDate(), "Temporal: Correctly anchored to yesterday relative to WhatsApp timestamp reference");


    // =========================================================================
    // 10. SAFETY & STABILITY EXTRAS
    // =========================================================================
    // Correction safeguard test
    resetState();
    await receiveMessage(makePayload("917618432290", "sorry sugar 146 nahi 164 thi", "msg-correct-safeguard", referenceTimestamp), mockResponse() as any);
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"]?.length === 0, "Safety: Blocked correction/edit messages from saving multiple incorrect records");
    assert(axiosPostCalls[0]?.data?.text?.body.includes("Sorry, mujhe pehle ki") || axiosPostCalls[0]?.data?.text?.body.includes("mili") || axiosPostCalls[0]?.data?.text?.body.includes("find"), "Safety: Informed user of correction support limitations");

    // Implausible/Fabricated range checks in validateCandidateRecord
    const fakeRecord = { parameter: "heart_rate", value: 999, unit: "bpm", confidence: 0.99 };
    const isValid = validateCandidateRecord(fakeRecord, "pulse 999");
    assert(isValid === false, "Safety: Rejected implausible heart rate of 999 bpm in validateCandidateRecord");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Sprint 39 Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 39 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 39 tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 39 WhatsApp vitals intelligence & robustness tests passed successfully!");
    process.exit(0);
  }
}

if (require.main === module) {
  runSprint39Tests();
}
