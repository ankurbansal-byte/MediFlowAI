import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
  setPendingClarification,
  clearRecentlyResolvedContext,
  getRecentlyResolvedContext,
} from "./services/pendingClarificationService";
import axios from "axios";
import assert from "assert";

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
                    text: { body: messageText },
                    timestamp: timestamp || "1784541600" // 2026-07-20T10:00:00Z -> Mon 3:30 PM IST
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
  clearRecentlyResolvedContext("PAT-102");
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
  dynamicMockUsers.push({
    username: "PAT-102",
    role: "patient",
    patientId: "PAT-102",
    hospitalId: "HOSP-002",
    fullName: "Patient Two",
    mobileNumber: "+917618432291",
    status: "active",
  });

  MOCK_RECORDS["PAT-101"] = [];
  MOCK_RECORDS["PAT-102"] = [];
}

async function runSprint42Tests() {
  console.log("🧪 Running Sprint 42 Advanced WhatsApp Turn State & Clinical Context Tests...");

  // =========================================================================
  // 1. sugar pending → after meal
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-1-1"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") !== null, "Test 1: Clarification pending for sugar");

  await receiveMessage(makePayload("917618432290", "after meal", "msg-1-2"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") === null, "Test 1: Clarification resolved");
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 1: Record saved");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 1: Saved as post_meal");
  console.log("✅ Test 1 Passed");

  // =========================================================================
  // 2. sugar pending → Hinglish answer
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-2-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "khane ke baad", "msg-2-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 2: Hinglish answer resolved post_meal");
  console.log("✅ Test 2 Passed");

  // =========================================================================
  // 3. sugar pending → Hindi answer
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-3-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "खाने के बाद", "msg-3-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 3: Hindi answer resolved post_meal");
  console.log("✅ Test 3 Passed");

  // =========================================================================
  // 4. temperature pending → F
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "temperature 99", "msg-4-1"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") !== null, "Test 4: Clarification pending for temp unit");
  await receiveMessage(makePayload("917618432290", "F", "msg-4-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 4: Saved successfully");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.unit === "°F", "Test 4: Unit preserved as °F");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 99, "Test 4: Fahrenheit preserved correctly");
  console.log("✅ Test 4 Passed");

  // =========================================================================
  // 5. unresolved numeric parameter → "sugar" → glucose context
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "145", "msg-5-1"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.unresolvedMeasurements?.[0] === 145, "Test 5: 145 marked as unresolved");
  await receiveMessage(makePayload("917618432290", "sugar", "msg-5-2"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.missingFields.includes("glucose_context"), "Test 5: Now pending glucose context");
  await receiveMessage(makePayload("917618432290", "random", "msg-5-3"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "Test 5: Saved sugar");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "random", "Test 5: Glucose context saved as random");
  console.log("✅ Test 5 Passed");

  // =========================================================================
  // 6. sugar pending then explicit BP → BP processed independently
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-6-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-6-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 6: BP saved independently");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Test 6: BP record correctly parsed");
  assert(getPendingClarification("PAT-101") !== null, "Test 6: Pending sugar is preserved");
  console.log("✅ Test 6 Passed");

  // =========================================================================
  // 7. temperature pending then oxygen → oxygen processed independently
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "temperature 99", "msg-7-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "oxygen 97", "msg-7-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 7: Oxygen saved independently");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "oxygen_saturation", "Test 7: Oxygen record parsed");
  assert(getPendingClarification("PAT-101") !== null, "Test 7: Temp pending context preserved");
  console.log("✅ Test 7 Passed");

  // =========================================================================
  // 8. completed sugar turn then "aur BP 130/80 bhi tha"
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-8-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "after meal", "msg-8-2"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 1, "Test 8: Sugar saved");

  await receiveMessage(makePayload("917618432290", "aur BP 130/80 bhi tha", "msg-8-3"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 2, "Test 8: BP saved independently");
  assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "blood_pressure", "Test 8: BP is second record");
  console.log("✅ Test 8 Passed");

  // =========================================================================
  // 9. completed sugar turn then pulse
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-9-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "after meal", "msg-9-2"), mockResponse() as any);

  await receiveMessage(makePayload("917618432290", "pulse 82 bhi tha", "msg-9-3"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 2, "Test 9: Pulse saved independently");
  assert(MOCK_RECORDS["PAT-101"]?.[1]?.parameter === "heart_rate", "Test 9: Heart rate correctly saved");
  console.log("✅ Test 9 Passed");

  // =========================================================================
  // 10. immediate context refinement does not create duplicate sugar
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-10-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "after meal", "msg-10-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 10: Saved post_meal sugar");

  await receiveMessage(makePayload("917618432290", "actually 2 hours after meal", "msg-10-3"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 10: No duplicate sugar created");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 10: Context remains post_meal (refined in audit/re-applied)");
  console.log("✅ Test 10 Passed");

  // =========================================================================
  // 11. ambiguous refinement asks rather than guesses
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-11-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "sugar random 145", "msg-11-2"), mockResponse() as any);

  // Send ambiguous refinement without specifying which 145
  await receiveMessage(makePayload("917618432290", "sorry 145 nahi 164", "msg-11-3"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.isCorrection === true, "Test 11: Prompted ambiguous correction clarification");
  console.log("✅ Test 11 Passed");

  // =========================================================================
  // 12. expired pending state does not hijack message
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-12-1"), mockResponse() as any);
  const pending = getPendingClarification("PAT-101");
  assert(pending !== null, "Test 12: Sugar pending");

  // Simulate expiration by shifting expiresAt into the past
  pending.expiresAt = new Date(Date.now() - 1000);
  assert(getPendingClarification("PAT-101") === null, "Test 12: Pending state naturally expired");

  // Send an ambiguous message that could have been an answer if active
  await receiveMessage(makePayload("917618432290", "fasting", "msg-12-2"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 0, "Test 12: Expired pending state did not hijack 'fasting'");
  console.log("✅ Test 12 Passed");

  // =========================================================================
  // 13. short answer without pending state fails safely
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "fasting", "msg-13-1"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 0, "Test 13: Short answer alone does not create record");
  const fallbackOutbound = axiosPostCalls[0]?.data?.text?.body || "";
  assert(fallbackOutbound.includes("samajhne") || fallbackOutbound.includes("understand"), "Test 13: Safely failed with a generic understanding error message");
  console.log("✅ Test 13 Passed");

  // =========================================================================
  // 14. latest sugar read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-14-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "meri last sugar kitni thi?", "msg-14-2"), mockResponse() as any);
  const lastOutbound14 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound14.includes("145") && lastOutbound14.includes("sugar"), "Test 14: Read back latest sugar correctly");
  console.log("✅ Test 14 Passed");

  // =========================================================================
  // 15. latest BP read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-15-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "last BP kya tha?", "msg-15-2"), mockResponse() as any);
  const lastOutbound15 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound15.includes("130/80") && lastOutbound15.includes("BP"), "Test 15: Read back latest BP correctly");
  console.log("✅ Test 15 Passed");

  // =========================================================================
  // 16. latest oxygen read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "oxygen 97", "msg-16-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "mera latest oxygen kya hai?", "msg-16-2"), mockResponse() as any);
  const lastOutbound16 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound16.includes("97") && lastOutbound16.includes("oxygen"), "Test 16: Read back latest oxygen correctly");
  console.log("✅ Test 16 Passed");

  // =========================================================================
  // 17. no-record read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "meri last sugar kitni thi?", "msg-17-1"), mockResponse() as any);
  const lastOutbound17 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound17.includes("koi reading nahi mili") || lastOutbound17.includes("No reading found"), "Test 17: No records found response returned");
  console.log("✅ Test 17 Passed");

  // =========================================================================
  // 18. today's readings read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-18-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-18-2"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "aaj maine kya readings bheji?", "msg-18-3"), mockResponse() as any);
  const lastOutbound18 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound18.includes("Sugar 145") && lastOutbound18.includes("BP 130/80"), "Test 18: Compact readings format returned");
  console.log("✅ Test 18 Passed");

  // =========================================================================
  // 19. today's timezone boundary correctness
  // =========================================================================
  resetState();
  // Message received yesterday at 11 PM UTC (which is 4:30 AM IST today)
  // Let's verify that using the configured India Offset, it correctly groups it as "today" in IST.
  await receiveMessage(makePayload("917618432290", "oxygen 98", "msg-19-1", "1784511600"), mockResponse() as any); // July 20, 1:40 AM UTC -> July 20, 7:10 AM IST
  await receiveMessage(makePayload("917618432290", "aaj ki readings:", "msg-19-2", "1784541600"), mockResponse() as any); // July 20, 10:00 AM UTC -> July 20, 3:30 PM IST
  const lastOutbound19 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound19.includes("Oxygen 98"), "Test 19: Timezone boundary correctly resolved oxygen 98 under the same IST date");
  console.log("✅ Test 19 Passed");

  // =========================================================================
  // 20. read-back creates zero HealthRecords
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-20-1"), mockResponse() as any);
  const recordsCount = MOCK_RECORDS["PAT-101"]?.length || 0;
  await receiveMessage(makePayload("917618432290", "last sugar kya thi?", "msg-20-2"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length || 0) === recordsCount, "Test 20: Read back creates zero health records");
  console.log("✅ Test 20 Passed");

  // =========================================================================
  // 21. query containing a historical numeric value is not persisted as new data
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "last sugar 145 thi kya?", "msg-21-1"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length as number) === 0, "Test 21: Query containing numerical value not saved as new record");
  console.log("✅ Test 21 Passed");

  // =========================================================================
  // 22. correction wins over query-like wording where appropriate
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-22-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "Sorry sugar 145 nahi 165 thi", "msg-22-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 165, "Test 22: Correction prioritized over simple queries");
  console.log("✅ Test 22 Passed");

  // =========================================================================
  // 23. emergency wins over normal conversation state
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-23-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "chest pain hai", "msg-23-2"), mockResponse() as any);
  const lastOutbound23 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound23.includes("EMERGENCY") && !lastOutbound23.includes("save ho gayi"), "Test 23: Emergency bypasses context processing");
  console.log("✅ Test 23 Passed");

  // =========================================================================
  // 24. emergency + BP preserves Sprint 41 behavior
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "chest pain hai, BP 160/100", "msg-24-1"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 24: Record saved during emergency");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "160/100", "Test 24: Correct value saved");
  const lastOutbound24 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(lastOutbound24.includes("EMERGENCY") && lastOutbound24.includes("160/100"), "Test 24: Warning returned emergency alerts and BP reading");
  console.log("✅ Test 24 Passed");

  // =========================================================================
  // 25. duplicate clarification answer does not duplicate
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar 145", "msg-25-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "after meal", "msg-25-answer"), mockResponse() as any);
  const countFirst = MOCK_RECORDS["PAT-101"]?.length || 0;

  // Re-deliver duplicate answer webhook
  await receiveMessage(makePayload("917618432290", "after meal", "msg-25-answer"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length || 0) === countFirst, "Test 25: Duplicate clarification answer deduplicated");
  console.log("✅ Test 25 Passed");

  // =========================================================================
  // 26. duplicate read-back has zero writes
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-26-1"), mockResponse() as any);
  const initialWrites = MOCK_RECORDS["PAT-101"]?.length || 0;

  await receiveMessage(makePayload("917618432290", "last sugar kya thi?", "msg-26-query"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "last sugar kya thi?", "msg-26-query"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length || 0) === initialWrites, "Test 26: Duplicate query did not mutate DB");
  console.log("✅ Test 26 Passed");

  // =========================================================================
  // 27. duplicate new observation remains idempotent
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-27-bp"), mockResponse() as any);
  const recordCount27 = MOCK_RECORDS["PAT-101"]?.length || 0;

  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-27-bp"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"]?.length || 0) === recordCount27, "Test 27: Duplicate observation idempotent");
  console.log("✅ Test 27 Passed");

  // =========================================================================
  // 28. duplicate correction remains idempotent
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "BP 130/80", "msg-28-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "BP 130/80 nahi 120/80 tha", "msg-28-correct"), mockResponse() as any);
  const valueFirstCorr = MOCK_RECORDS["PAT-101"]?.[0]?.value;
  const auditLength = MOCK_RECORDS["PAT-101"]?.[0]?.corrections?.length || 0;

  await receiveMessage(makePayload("917618432290", "BP 130/80 nahi 120/80 tha", "msg-28-correct"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === valueFirstCorr, "Test 28: Value unchanged on retry");
  assert((MOCK_RECORDS["PAT-101"]?.[0]?.corrections?.length || 0) === auditLength, "Test 28: Duplicate correction does not log additional audit");
  console.log("✅ Test 28 Passed");

  // =========================================================================
  // 29. language switch Hinglish → English answer
  // =========================================================================
  resetState();
  // Original prompt has Hinglish style detected
  await receiveMessage(makePayload("917618432290", "sugar 145 hai", "msg-29-1"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.language === "hinglish", "Test 29: Saved style Hinglish");

  // User answers in English
  await receiveMessage(makePayload("917618432290", "after meal", "msg-29-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 29: Context successfully resolved");
  console.log("✅ Test 29 Passed");

  // =========================================================================
  // 30. Hindi → English answer
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "शुगर 145 है", "msg-30-1"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.language === "hindi", "Test 30: Saved style Hindi");

  await receiveMessage(makePayload("917618432290", "fasting", "msg-30-2"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "fasting", "Test 30: Context successfully resolved");
  console.log("✅ Test 30 Passed");

  // =========================================================================
  // 31. patient isolation for read-back
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-31-pat101"), mockResponse() as any);
  await receiveMessage(makePayload("917618432291", "sugar fasting 120", "msg-31-pat102"), mockResponse() as any);

  // PAT-101 queries
  await receiveMessage(makePayload("917618432290", "meri last sugar kya thi?", "msg-31-q-pat101"), mockResponse() as any);
  const out31Pat101 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out31Pat101.includes("145"), "Test 31: PAT-101 sees their own record");

  // PAT-102 queries
  await receiveMessage(makePayload("917618432291", "meri last sugar kya thi?", "msg-31-q-pat102"), mockResponse() as any);
  const out31Pat102 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out31Pat102.includes("120"), "Test 31: PAT-102 sees their own record, isolated from PAT-101");
  console.log("✅ Test 31 Passed");

  // =========================================================================
  // 32. tenant isolation for read-back
  // =========================================================================
  resetState();
  // HOSP-001 tenant record
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-32-1"), mockResponse() as any);

  // Set PAT-101's hospitalId to HOSP-002 temporarily
  dynamicMockUsers[0].hospitalId = "HOSP-002";

  // PAT-101 queries now under HOSP-002
  await receiveMessage(makePayload("917618432290", "meri last sugar kya thi?", "msg-32-2"), mockResponse() as any);
  const out32 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out32.includes("koi reading nahi mili") || out32.includes("No reading found"), "Test 32: Tenant isolation blocks access to HOSP-001 record");
  console.log("✅ Test 32 Passed");

  // =========================================================================
  // 33. timeContext appears naturally in read-back where relevant
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "subah fasting sugar 145", "msg-33-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "meri last sugar kya thi?", "msg-33-2"), mockResponse() as any);
  const out33 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out33.includes("Morning") || out33.includes("सुबह") || out33.includes("subah"), "Test 33: timeContext printed in latest readback");
  console.log("✅ Test 33 Passed");

  // =========================================================================
  // 34. corrected record returns corrected latest value
  // =========================================================================
  resetState();
  await receiveMessage(makePayload("917618432290", "sugar fasting 145", "msg-34-1"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "sorry sugar 145 nahi 164 thi", "msg-34-2"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "meri last sugar kya thi?", "msg-34-3"), mockResponse() as any);
  const out34 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out34.includes("164"), "Test 34: Latest query returned corrected value");
  console.log("✅ Test 34 Passed");

  // =========================================================================
  // 35. old pre-correction value is not incorrectly presented as current
  // =========================================================================
  assert(!out34.includes("145"), "Test 35: Pre-correction value is omitted from current output");
  console.log("✅ Test 35 Passed");

  // =========================================================================
  // 36. multiple same-day readings are returned in correct deterministic order
  // =========================================================================
  resetState();
  // Save morning and evening BP
  await receiveMessage(makePayload("917618432290", "BP morning 120/80", "msg-36-morning"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "BP evening 130/85", "msg-36-evening"), mockResponse() as any);

  await receiveMessage(makePayload("917618432290", "aaj maine kya readings bheji?", "msg-36-query"), mockResponse() as any);
  const out36 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";

  const morningIdx = out36.indexOf("120/80");
  const eveningIdx = out36.indexOf("130/85");
  assert(morningIdx < eveningIdx, "Test 36: Readings sorted deterministically: Morning -> Evening");
  console.log("✅ Test 36 Passed");

  console.log("\n=========================================");
  console.log("🏆 ALL 36 SPRINT 42 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runSprint42Tests().catch(err => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
