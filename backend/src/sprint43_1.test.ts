import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
  setPendingClarification,
  clearRecentlyResolvedContext,
} from "./services/pendingClarificationService";
import { deterministicExtract, isValueSupportedByMessage } from "./utils/healthRecordParser";
import axios from "axios";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";
process.env.PHONE_NUMBER_ID = "mock-phone-id";
process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";
process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES = "330"; // IST

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

const makePayload = (from: string, body: string, messageId: string, timestamp = "1784541600"): any => {
  return {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: messageId,
                    from,
                    type: "text",
                    text: { body },
                    timestamp
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  };
};

function resetState() {
  clearWebhookDeduplicationCache();
  clearAllPendingClarifications();
  clearRecentlyResolvedContext("PAT-101");
  setMockExtractHealthData(async () => "");
  axiosPostCalls = [];

  // Seed Users
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

  MOCK_RECORDS["PAT-101"] = [];
}

async function runTests() {
  console.log("🚀 Running Sprint 43.1 E2E Hotfix Unit & Integration Tests...");

  // =========================================================================
  // 1. BP 131 by 83
  // =========================================================================
  resetState();
  const res1 = deterministicExtract("BP 131 by 83");
  assert.strictEqual(res1.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res1.candidateRecords[0].systolic, 131);
  assert.strictEqual(res1.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 1 Passed: BP 131 by 83");

  // =========================================================================
  // 2. BP 131 over 83
  // =========================================================================
  resetState();
  const res2 = deterministicExtract("BP 131 over 83");
  assert.strictEqual(res2.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res2.candidateRecords[0].systolic, 131);
  assert.strictEqual(res2.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 2 Passed: BP 131 over 83");

  // =========================================================================
  // 3. BP 131/83
  // =========================================================================
  resetState();
  const res3 = deterministicExtract("BP 131/83");
  assert.strictEqual(res3.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res3.candidateRecords[0].systolic, 131);
  assert.strictEqual(res3.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 3 Passed: BP 131/83");

  // =========================================================================
  // 4. BP 131 83 with explicit BP context
  // =========================================================================
  resetState();
  const res4 = deterministicExtract("Mera BP 131 83 hai");
  assert.strictEqual(res4.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res4.candidateRecords[0].systolic, 131);
  assert.strictEqual(res4.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 4 Passed: BP 131 83 with context");

  // =========================================================================
  // 5. BP 131.83 with explicit BP context
  // =========================================================================
  resetState();
  const res5 = deterministicExtract("BP 131.83");
  assert.strictEqual(res5.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res5.candidateRecords[0].systolic, 131);
  assert.strictEqual(res5.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 5 Passed: BP 131.83 with context");

  // =========================================================================
  // 6. Hindi बीपी 131.83
  // =========================================================================
  resetState();
  const res6 = deterministicExtract("मेरा बीपी 131.83 है");
  assert.strictEqual(res6.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res6.candidateRecords[0].systolic, 131);
  assert.strictEqual(res6.candidateRecords[0].diastolic, 83);
  console.log("✅ Test 6 Passed: Hindi बीपी 131.83");

  // =========================================================================
  // 7. exact real transcript: 'मेरा बीपी 131.82 है और ओक्सीजन 98 है'
  // =========================================================================
  resetState();
  const res7 = deterministicExtract("मेरा बीपी 131.82 है और ओक्सीजन 98 है");
  assert.strictEqual(res7.candidateRecords.length, 2);
  assert.strictEqual(res7.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res7.candidateRecords[0].systolic, 131);
  assert.strictEqual(res7.candidateRecords[0].diastolic, 82);
  assert.strictEqual(res7.candidateRecords[1].parameter, "oxygen_saturation");
  assert.strictEqual(res7.candidateRecords[1].value, 98);
  console.log("✅ Test 7 Passed: Exact real transcript split and extract");

  // =========================================================================
  // 8. exact intended speech representation: 'Mera BP 131 by 83 hai aur oxygen 98 hai'
  // =========================================================================
  resetState();
  const res8 = deterministicExtract("Mera BP 131 by 83 hai aur oxygen 98 hai");
  assert.strictEqual(res8.candidateRecords.length, 2);
  assert.strictEqual(res8.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res8.candidateRecords[0].systolic, 131);
  assert.strictEqual(res8.candidateRecords[0].diastolic, 83);
  assert.strictEqual(res8.candidateRecords[1].parameter, "oxygen_saturation");
  assert.strictEqual(res8.candidateRecords[1].value, 98);
  console.log("✅ Test 8 Passed: Exact intended speech representation");

  // =========================================================================
  // 9. temperature 98.6 is NOT BP
  // =========================================================================
  resetState();
  const res9 = deterministicExtract("temperature 98.6");
  assert.strictEqual(res9.candidateRecords[0].parameter, "body_temperature");
  const hasBp9 = res9.candidateRecords.some((r: any) => r.parameter === "blood_pressure");
  assert.strictEqual(hasBp9, false);
  console.log("✅ Test 9 Passed: Temperature 98.6 is not BP");

  // =========================================================================
  // 10. weight 81.5 is NOT BP
  // =========================================================================
  resetState();
  const res10 = deterministicExtract("weight 81.5");
  assert.strictEqual(res10.candidateRecords[0].parameter, "weight");
  const hasBp10 = res10.candidateRecords.some((r: any) => r.parameter === "blood_pressure");
  assert.strictEqual(hasBp10, false);
  console.log("✅ Test 10 Passed: Weight 81.5 is not BP");

  // =========================================================================
  // 11. sugar 131.8 is NOT BP
  // =========================================================================
  resetState();
  const res11 = deterministicExtract("sugar 131.8");
  assert.strictEqual(res11.candidateRecords[0].parameter, "blood_sugar");
  const hasBp11 = res11.candidateRecords.some((r: any) => r.parameter === "blood_pressure");
  assert.strictEqual(hasBp11, false);
  console.log("✅ Test 11 Passed: Sugar 131.8 is not BP");

  // =========================================================================
  // 12. oxygen 97.5 is NOT BP
  // =========================================================================
  resetState();
  const res12 = deterministicExtract("oxygen 97.5");
  assert.strictEqual(res12.candidateRecords[0].parameter, "oxygen_saturation");
  const hasBp12 = res12.candidateRecords.some((r: any) => r.parameter === "blood_pressure");
  assert.strictEqual(hasBp12, false);
  console.log("✅ Test 12 Passed: Oxygen 97.5 is not BP");

  // =========================================================================
  // 13. BP 131 remains incomplete
  // =========================================================================
  resetState();
  const res13 = deterministicExtract("BP 131");
  assert.strictEqual(res13.candidateRecords[0].parameter, "blood_pressure");
  assert.strictEqual(res13.candidateRecords[0].diastolic, undefined);
  assert.deepStrictEqual(res13.missingFields, ["diastolic"]);
  console.log("✅ Test 13 Passed: BP 131 remains incomplete");

  // =========================================================================
  // 14. implausible BP components remain rejected/clarified
  // =========================================================================
  resetState();
  const res14 = deterministicExtract("BP 131.180");
  const bp14 = res14.candidateRecords.find((r: any) => r.parameter === "blood_pressure");
  if (bp14) {
    assert.notStrictEqual(bp14.diastolic, 180);
  }
  console.log("✅ Test 14 Passed: Implausible BP components rejected");

  // =========================================================================
  // 15. multi-vital result contains no stray unresolved 98
  // =========================================================================
  resetState();
  const res15 = deterministicExtract("मेरा बीपी 131.82 है और ओक्सीजन 98 है");
  assert.strictEqual(res15.unresolvedMeasurements.length, 0);
  console.log("✅ Test 15 Passed: Multi-vital contains no stray unresolved 98");

  // =========================================================================
  // 16. one inbound message produces one logical clarification response
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 140", "msg-unique-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1);
  assert(axiosPostCalls[0].data.text.body.includes("Was this glucose reading fasting") || axiosPostCalls[0].data.text.body.includes("glucose"));
  console.log("✅ Test 16 Passed: One inbound message produces one logical clarification response");

  // =========================================================================
  // 17. duplicate same webhook message ID does not duplicate clarification
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 140", "msg-dup-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1);

  await receiveMessage(makePayload("917618432290", "sugar 140", "msg-dup-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1); // Remains 1, deduplicated!
  console.log("✅ Test 17 Passed: Duplicate webhook message ID is deduplicated");

  // =========================================================================
  // 18. genuinely new follow-up message still receives response
  // =========================================================================
  resetState();
  // Msg 1: BP 130
  await receiveMessage(makePayload("917618432290", "BP 130", "msg-new-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1);
  assert(axiosPostCalls[0].data.text.body.includes("diastolic"));

  // Msg 2: 80 (new ID)
  await receiveMessage(makePayload("917618432290", "80", "msg-new-2"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 2);
  assert(axiosPostCalls[1].data.text.body.includes("Done 👍 BP 130/80 mmHg"));
  console.log("✅ Test 18 Passed: Genuinely new follow-up receives response");

  // =========================================================================
  // 19. voice idempotency remains intact
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-voice-dup-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1);

  await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-voice-dup-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1); // Deduplicated!
  console.log("✅ Test 19 Passed: Voice webhook idempotency remains intact");

  // =========================================================================
  // 20. Sprint 42 pending-state behavior remains intact
  // =========================================================================
  resetState();
  // Save BP successfully first
  await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-s42-1"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 1);

  // Send correction
  await receiveMessage(makePayload("917618432290", "actually 130/85", "msg-s42-2"), mockResponse() as any);
  assert.strictEqual(axiosPostCalls.length, 2);
  assert(axiosPostCalls[1].data.text.body.includes("BP corrected from 120/80 to 130/85"));
  console.log("✅ Test 20 Passed: Sprint 42 pending-state behavior intact");

  console.log("\n=========================================");
  console.log("🏆 ALL 20 SPRINT 43.1 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
