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

async function runParserStabilizationTests() {
  console.log("🧪 Running Comprehensive Parser Stabilization Update Verification Tests...");

  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
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
      // Always force AI error to execute local segment-based parser fallback
      setMockExtractHealthData(async () => {
        throw new Error("AI Offline");
      });
    };

    const referenceTimestamp = "1784541600"; // 2026-07-20T10:00:00Z

    // =========================================================================
    // 1. SINGLE PARAMETERS
    // =========================================================================
    console.log("\n--- Category 1: Single Parameters ---");

    // Single Sugar
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar fasting 118", "msg-sugar-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single Sugar: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 118, "Single Sugar: value is 118");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Single Sugar: context is fasting");

    // Single BP
    resetState();
    await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-bp-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single BP: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure" && MOCK_RECORDS["PAT-101"]?.[0]?.value === "120/80", "Single BP: value is 120/80");

    // Single Weight
    resetState();
    await receiveMessage(makePayload("917618432290", "Weight 70", "msg-weight-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single Weight: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "weight" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 70, "Single Weight: value is 70");

    // Single Pulse
    resetState();
    await receiveMessage(makePayload("917618432290", "Pulse 80", "msg-pulse-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single Pulse: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "heart_rate" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 80, "Single Pulse: value is 80");

    // Single Temperature (Celsius)
    resetState();
    await receiveMessage(makePayload("917618432290", "Temp 37 C", "msg-temp-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single Temp: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "body_temperature" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 37, "Single Temp: value is 37");

    // Single SpO2
    resetState();
    await receiveMessage(makePayload("917618432290", "SpO2 98", "msg-spo2-single", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Single SpO2: Saved 1 record");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation" && MOCK_RECORDS["PAT-101"]?.[0]?.value === 98, "Single SpO2: value is 98");


    // =========================================================================
    // 2. MIXED MESSAGES / MULTI-RECORD
    // =========================================================================
    console.log("\n--- Category 2: Mixed Messages ---");

    // Mixed Message (English)
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar random 118 BP 140/95 Weight 90 Pulse 80 SpO2 98", "msg-mixed-eng", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 5, "Mixed Message (English): Saved all 5 records successfully");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_sugar" && r.value === 118 && r.context === "random"), "Sugar extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "140/95"), "BP extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "weight" && r.value === 90), "Weight extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "heart_rate" && r.value === 80), "Pulse extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "oxygen_saturation" && r.value === 98), "SpO2 extracted correctly");

    // Mixed Message (Hindi)
    resetState();
    await receiveMessage(makePayload("917618432290", "शुगर 110 खाली पेट बीपी 120/80 वजन 68", "msg-mixed-hin", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 3, "Mixed Message (Hindi): Saved 3 records successfully");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_sugar" && r.value === 110 && r.context === "fasting"), "Hindi Sugar Fasting extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "120/80"), "Hindi BP extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "weight" && r.value === 68), "Hindi Weight extracted correctly");

    // Mixed Message (Hinglish/Hindi-English mix)
    resetState();
    await receiveMessage(makePayload("917618432290", "sugar 110 khaali pet BP 120/80 weight 68", "msg-mixed-hinglish", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 3, "Mixed Message (Hinglish): Saved 3 records successfully");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_sugar" && r.value === 110 && r.context === "fasting"), "Hinglish Sugar Fasting extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "120/80"), "Hinglish BP extracted correctly");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "weight" && r.value === 68), "Hinglish Weight extracted correctly");


    // =========================================================================
    // 3. VOICE MULTI-RECORD TRANSCRIPT EMULATION
    // =========================================================================
    console.log("\n--- Category 3: Voice Multi-Record ---");
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar 118 BP 140/95 Pulse 82 Weight 70", "msg-voice-multi", referenceTimestamp), mockResponse() as any);
    // Note: Sugar is incomplete because no context was supplied, so it triggers CLARIFY and doesn't get saved, but the others get saved!
    // Wait, let's verify if Pulse, BP, Weight are successfully saved.
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure" && r.value === "140/95"), "Voice Multi: BP saved");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "heart_rate" && r.value === 82), "Voice Multi: Pulse saved");
    assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "weight" && r.value === 70), "Voice Multi: Weight saved");


    // =========================================================================
    // 4. CONTEXT DETECTION HARDENING
    // =========================================================================
    console.log("\n--- Category 4: Context Detection Hardening ---");

    // Before Breakfast
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar 118 before breakfast", "msg-sugar-before-bf", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "pre_meal", "Context: 'before breakfast' mapped to pre_meal");

    // After Breakfast
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar 118 after breakfast", "msg-sugar-after-bf", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Context: 'after breakfast' mapped to post_meal");

    // Before Lunch / Dinner
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar 118 before lunch", "msg-sugar-before-lunch", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "pre_meal", "Context: 'before lunch' mapped to pre_meal");

    // After Lunch / Dinner
    resetState();
    await receiveMessage(makePayload("917618432290", "Sugar 118 after dinner", "msg-sugar-after-dinner", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Context: 'after dinner' mapped to post_meal");

    // Hindi/Devanagari breakfast variations
    resetState();
    await receiveMessage(makePayload("917618432290", "शुगर 118 नाश्ते से पहले", "msg-sugar-hin-bf-pre", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "pre_meal", "Context: 'नाश्ते से पहले' mapped to pre_meal");

    resetState();
    await receiveMessage(makePayload("917618432290", "शुगर 118 नाश्ते के बाद", "msg-sugar-hin-bf-post", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Context: 'नाश्ते के बाद' mapped to post_meal");


    // =========================================================================
    // 5. DUPLICATE DETECTION AND REJECTION
    // =========================================================================
    console.log("\n--- Category 5: Duplicate Detection ---");
    resetState();
    await receiveMessage(makePayload("917618432290", "BP 120/80, BP 120/80", "msg-duplicate-bp", referenceTimestamp), mockResponse() as any);
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Duplicate Detection: Redundant identical BP matched from same message kept count at 1");


    // =========================================================================
    // 6. PARSER AMBIGUITY (BARE NUMBERS)
    // =========================================================================
    console.log("\n--- Category 6: Parser Ambiguity ---");
    resetState();
    await receiveMessage(makePayload("917618432290", "118", "msg-ambig-bare", referenceTimestamp), mockResponse() as any);
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"]?.length === 0, "Parser Ambiguity: Bare numbers must never be saved as default parameters like blood_sugar");
    assert(getPendingClarification("PAT-101") !== null, "Parser Ambiguity: Saved unresolved measurement state instead");

  } catch (error: any) {
    console.error("💥 Unhandled Error during Verification Tests:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Suite Run Complete: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Parser stabilization verification tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 Parser stabilization verification tests passed successfully!");
  }
}

if (require.main === module) {
  runParserStabilizationTests();
}
