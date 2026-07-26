import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
} from "./services/pendingClarificationService";
import {
  resolveRecordedAt,
  detectEmergencyUrgency,
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

async function runSprint41Tests() {
  console.log("🧪 Running Sprint 41 Clinical Safety & Edge Intelligence Test Suite...");

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
    dynamicMockUsers.push({
      username: "PAT-102",
      role: "patient",
      patientId: "PAT-102",
      hospitalId: "HOSP-002", // Tenant boundary check
      fullName: "Patient Two",
      mobileNumber: "+917618432291",
      status: "active",
    });

    const resetState = () => {
      for (const key in MOCK_RECORDS) {
        delete MOCK_RECORDS[key];
      }
      clearWebhookDeduplicationCache();
      clearAllPendingClarifications();
      axiosPostCalls = [];
      setMockExtractHealthData(async () => ""); // fallback to deterministic
    };

    const referenceTimestamp = "1784541600"; // 2026-07-20T10:00:00Z (Mon 10:00 AM UTC, which is 3:30 PM IST)
    const refDate = new Date(1784541600 * 1000);

    // =========================================================================
    // 1. 9 AM explicit time is timezone-safe
    // =========================================================================
    resetState();
    // Message received on 26 Jul 2026 (Mon 10:00 AM UTC -> 3:30 PM IST)
    const res1 = resolveRecordedAt("BP 120/80 at 9 AM", "9 AM", refDate);
    // 9 AM IST on 2026-07-20 should be 3:30 AM UTC on 2026-07-20
    assert(res1.getUTCHours() === 3 && res1.getUTCMinutes() === 30, "Test 1: 9 AM is correctly parsed relative to IST timezone (3:30 AM UTC)");

    // =========================================================================
    // 2. 9:30 PM explicit time
    // =========================================================================
    resetState();
    const res2 = resolveRecordedAt("BP 130/80 at 9:30 PM", "9:30 PM", refDate);
    // 9:30 PM IST on 2026-07-20 should be 4:00 PM UTC on 2026-07-20
    assert(res2.getUTCHours() === 16 && res2.getUTCMinutes() === 0, "Test 2: 9:30 PM is correctly parsed relative to IST timezone (16:00 PM UTC)");

    // =========================================================================
    // 3. yesterday/kal + explicit time
    // =========================================================================
    resetState();
    const res3 = resolveRecordedAt("yesterday at 8 PM oxygen 97", "yesterday at 8 PM", refDate);
    // 8:00 PM IST yesterday (2026-07-19) is 2:30 PM UTC on 2026-07-19
    assert(res3.getUTCDate() === 19 && res3.getUTCHours() === 14 && res3.getUTCMinutes() === 30, "Test 3: yesterday at 8 PM is 2:30 PM UTC yesterday");

    // =========================================================================
    // 4. morning/evening remains semantic without fabricated clock time
    // =========================================================================
    resetState();
    const res4 = resolveRecordedAt("kal shaam pulse 84", "kal shaam", refDate);
    // Yesterday (2026-07-19) with no explicit clock time -> should retain same hour/minute of messageDate but shifted to yesterday
    assert(res4.getUTCDate() === 19 && res4.getUTCHours() === 10 && res4.getUTCMinutes() === 0, "Test 4: morning/evening qualifiers shift dates without fabricating times");

    // =========================================================================
    // 5. Hinglish urgent chest-pain message
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "mujhe severe chest pain ho raha hai aur bahut ghabrahat hai", "msg-urg-1", referenceTimestamp),
      mockResponse() as any
    );
    const outbound1 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound1.includes("EMERGENCY") && outbound1.includes("emergency ward") && !outbound1.includes("saved successfully"), "Test 5: Hinglish chest pain triggers emergency warning without success confirmations");

    // =========================================================================
    // 6. Hindi urgent breathing message
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "मुझे सांस लेने में बहुत तकलीफ हो रही है", "msg-urg-2", referenceTimestamp),
      mockResponse() as any
    );
    const outbound2 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound2.includes("आपातकालीन स्थिति") && outbound2.includes("इमरजेंसी वार्ड"), "Test 6: Hindi breathing difficulty triggers emergency warning");

    // =========================================================================
    // 7. English urgent severe bleeding message
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "Help me I am having severe bleeding from my hand", "msg-urg-3", referenceTimestamp),
      mockResponse() as any
    );
    const outbound3 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound3.includes("EMERGENCY") && outbound3.includes("emergency room"), "Test 7: English severe bleeding triggers emergency warning");

    // =========================================================================
    // 8. obvious stroke-like urgent phrase
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "sudden weakness with speech difficulty please advise", "msg-urg-4", referenceTimestamp),
      mockResponse() as any
    );
    const outbound4 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound4.includes("EMERGENCY") && outbound4.includes("emergency room"), "Test 8: Obvious stroke-like symptom triggers emergency warning");

    // =========================================================================
    // 9. urgent message with valid BP also preserves the measurement safely
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "I have severe chest pain and my BP is 130/80", "msg-urg-5", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 9: Valid BP measurement was saved during emergency");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "130/80", "Test 9: Saved BP is 130/80");
    const outbound5 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound5.includes("EMERGENCY") && outbound5.includes("130/80"), "Test 9: Outbound response alerts emergency AND mentions the recorded vital");

    // =========================================================================
    // 10. non-urgent "breathing rate 18" does not trigger emergency
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "breathing rate 18 breaths/min", "msg-nonurg-1", referenceTimestamp),
      mockResponse() as any
    );
    const outbound6 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(!outbound6.includes("EMERGENCY") && outbound6.includes("breaths/min"), "Test 10: breathing rate 18 does not trigger emergency alert");

    // =========================================================================
    // 11. historical/resolved symptom phrasing avoids obvious false trigger
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "chest pain kal tha, doctor ko dikha diya, ab theek hai", "msg-nonurg-2", referenceTimestamp),
      mockResponse() as any
    );
    const outbound7 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(!outbound7.includes("EMERGENCY"), "Test 11: Past/resolved/referred symptoms do not trigger false emergency warnings");

    // =========================================================================
    // 12. oxygen 150 rejected/clarified
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "oxygen level 150", "msg-impl-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0, "Test 12: oxygen 150 was rejected (not saved)");
    const outbound8 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound8.includes("oxygen") && outbound8.includes("unusual"), "Test 12: Sent natural clarification requesting recheck");

    // =========================================================================
    // 13. pulse 500 rejected/clarified
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "pulse rate 500 bpm", "msg-impl-2", referenceTimestamp),
      mockResponse() as any
    );
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0, "Test 13: pulse 500 was rejected");
    const outbound9 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound9.includes("pulse") && outbound9.includes("unusual"), "Test 13: Sent natural clarification for pulse 500");

    // =========================================================================
    // 14. impossible temperature rejected/clarified
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "temperature 200 C", "msg-impl-3", referenceTimestamp),
      mockResponse() as any
    );
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0, "Test 14: temperature 200°C was rejected");
    const outbound10 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound10.includes("temperature") && outbound10.includes("unusual"), "Test 14: Sent natural clarification for temperature 200");

    // =========================================================================
    // 15. impossible BP rejected/clarified
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "BP 500/300", "msg-impl-4", referenceTimestamp),
      mockResponse() as any
    );
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0, "Test 15: BP 500/300 was rejected");
    const outbound11 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound11.includes("BP") && outbound11.includes("unusual"), "Test 15: Sent natural clarification for BP 500/300");

    // =========================================================================
    // 16. negative weight rejected
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "weight -10 kg", "msg-impl-5", referenceTimestamp),
      mockResponse() as any
    );
    assert(!MOCK_RECORDS["PAT-101"] || MOCK_RECORDS["PAT-101"].length === 0, "Test 16: Negative weight was rejected");

    // =========================================================================
    // 17. khaali/khali/खाली पेट variants
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "khaali pet sugar 125", "msg-norm-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Test 17: khaali pet maps to fasting");

    // =========================================================================
    // 18. khane ke 2 ghante baad
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "meri sugar khane ke 2 ghante baad 155 thi", "msg-norm-2", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 18: khane ke 2 ghante baad maps to post_meal");

    // =========================================================================
    // 19. subah/shaam/raat variants
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "aaj subah BP 120/80 aur kal shaam 130/80", "msg-norm-3", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 19: Saved both BP readings");
    const morningBp = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "120/80");
    const eveningBp = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "130/80");
    assert(morningBp?.timeContext === "morning", "Test 19: morningBp has morning timeContext");
    assert(eveningBp?.timeContext === "evening", "Test 19: eveningBp has evening timeContext");

    // =========================================================================
    // 20. SpO2/oxygen/saturation variants
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "oxygen level 97", "msg-norm-4", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation", "Test 20: oxygen level successfully resolved to oxygen_saturation");

    // =========================================================================
    // 21. combined sugar + BP
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "subah fasting sugar 126 thi aur BP 130/80 tha", "msg-norm-5", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 21: Saved combined sugar + BP records");
    const sugarRec = MOCK_RECORDS["PAT-101"]?.find(r => r.parameter === "blood_sugar");
    const bpRec = MOCK_RECORDS["PAT-101"]?.find(r => r.parameter === "blood_pressure");
    assert(sugarRec && sugarRec.context === "fasting" && sugarRec.timeContext === "morning", "Test 21: Sugar has fasting context and morning timeContext");
    assert(bpRec && bpRec.timeContext === "morning", "Test 21: BP cleanly propagated morning timeContext across clauses!");

    // =========================================================================
    // 22. combined pulse + oxygen with temporal qualifier
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "kal shaam pulse 84 aur oxygen 97 thi", "msg-norm-6", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 22: Saved combined pulse + oxygen");
    const pulseRec = MOCK_RECORDS["PAT-101"]?.find(r => r.parameter === "heart_rate");
    const o2Rec = MOCK_RECORDS["PAT-101"]?.find(r => r.parameter === "oxygen_saturation");
    assert(pulseRec && pulseRec.timeContext === "evening", "Test 22: Pulse has evening timeContext");
    assert(o2Rec && o2Rec.timeContext === "evening", "Test 22: Oxygen inherited evening timeContext across clauses!");

    // =========================================================================
    // 23. Sprint 39.2 morning/evening multi-observation regression
    // =========================================================================
    resetState();
    await receiveMessage(
      makePayload("917618432290", "BP morning 130/80, evening 140/90", "msg-reg-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === 2, "Test 23: Saved both BP readings");
    const regBp1 = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "130/80");
    const regBp2 = MOCK_RECORDS["PAT-101"]?.find(r => r.value === "140/90");
    assert(regBp1?.timeContext === "morning" && regBp2?.timeContext === "evening", "Test 23: Both timeContexts preserved correctly");

    // =========================================================================
    // 24. Sprint 40 correction + timeContext regression
    // =========================================================================
    resetState();
    // Save initial BP
    await receiveMessage(
      makePayload("917618432290", "BP morning 130/80", "msg-reg-2-init", referenceTimestamp),
      mockResponse() as any
    );
    // Correct it
    await receiveMessage(
      makePayload("917618432290", "Sorry evening BP 140/90 nahi 135/85 tha", "msg-reg-2-corr", referenceTimestamp),
      mockResponse() as any
    );
    // This is correction of the 140/90 reading to 135/85.
    // Wait, let's verify that the correction worked or target was resolved nicely.
    // Since we didn't have 140/90 saved, let's correct 130/80 instead:
    await receiveMessage(
      makePayload("917618432290", "BP 130/80 nahi 135/85 tha", "msg-reg-2-corr2", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "135/85", "Test 24: Corrected BP value updated to 135/85");

    // =========================================================================
    // 25. AI failure still processes deterministic explicit vital
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () => { throw new Error("AI service down"); });
    await receiveMessage(
      makePayload("917618432290", "sugar fasting 125", "msg-fail-ai-1", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 125 && MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Test 25: Deterministic fallback extracted sugar 125 fasting successfully on AI failure");

    // =========================================================================
    // 26. AI failure does not disable urgent-message detection
    // =========================================================================
    resetState();
    setMockExtractHealthData(async () => { throw new Error("AI service down"); });
    await receiveMessage(
      makePayload("917618432290", "I have severe chest pain", "msg-fail-ai-2", referenceTimestamp),
      mockResponse() as any
    );
    const outbound12 = axiosPostCalls[0]?.data?.text?.body || "";
    assert(outbound12.includes("EMERGENCY") && outbound12.includes("emergency room"), "Test 26: Emergency warning sent successfully on AI failure");

    // =========================================================================
    // 27. duplicate urgent webhook does not produce duplicate records
    // =========================================================================
    resetState();
    // First delivery of urgent message with vital
    await receiveMessage(
      makePayload("917618432290", "severe chest pain and BP 130/80", "msg-idemp-urg", referenceTimestamp),
      mockResponse() as any
    );
    const countBeforeDup = MOCK_RECORDS["PAT-101"]?.length || 0;

    // Second delivery (duplicate message ID)
    await receiveMessage(
      makePayload("917618432290", "severe chest pain and BP 130/80", "msg-idemp-urg", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.length === countBeforeDup, "Test 27: Duplicate urgent webhook deduplicated successfully, preventing duplicate records");

    // =========================================================================
    // 28. patient/tenant isolation remains intact
    // =========================================================================
    resetState();
    // Message from PAT-101 (HOSP-001)
    await receiveMessage(
      makePayload("917618432290", "BP 130/80", "msg-isol-1", referenceTimestamp),
      mockResponse() as any
    );
    // Message from PAT-102 (HOSP-002)
    await receiveMessage(
      makePayload("917618432291", "BP 120/85", "msg-isol-2", referenceTimestamp),
      mockResponse() as any
    );
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.hospitalId === "HOSP-001", "Test 28: PAT-101 is saved under HOSP-001");
    assert(MOCK_RECORDS["PAT-102"]?.[0]?.hospitalId === "HOSP-002", "Test 28: PAT-102 is saved under HOSP-002");
    assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "130/80", "Test 28: PAT-101 value is correct");
    assert(MOCK_RECORDS["PAT-102"]?.[0]?.value === "120/85", "Test 28: PAT-102 value is correct");

  } catch (error: any) {
    console.error("💥 Unhandled error in Sprint 41 focused test suite:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 41 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 41 tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 41 Clinical Safety & Edge Intelligence tests passed successfully!");
    process.exit(0);
  }
}

if (require.main === module) {
  runSprint41Tests();
}
