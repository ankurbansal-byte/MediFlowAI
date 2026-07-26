import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import { clearAllPendingClarifications } from "./services/pendingClarificationService";
import axios from "axios";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";

let postAttemptsCount = 0;
let postCalls: Array<{ url: string; data: any }> = [];
let postBehavior: (url: string, data?: any, config?: any) => Promise<any> = async (url, data) => {
  postCalls.push({ url, data });
  return { data: { success: true } };
};

(axios as any).post = async (url: string, data?: any, config?: any) => {
  return postBehavior(url, data, config);
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

async function runSprint41RetryTests() {
  console.log("🧪 Running Sprint 41.1 WhatsApp Outbound Reliability Hotfix Tests...");

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
    // Setup mock patient
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
      postCalls = [];
      postAttemptsCount = 0;
      setMockExtractHealthData(async () => ""); // Fallback to deterministic
      // Reset post behavior to default success
      postBehavior = async (url, data) => {
        postCalls.push({ url, data });
        return { data: { success: true } };
      };
    };

    const referenceTimestamp = "1784541600"; // 2026-07-20T10:00:00Z

    // =========================================================================
    // 1. First send timeout, retry succeeds
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err = new Error("timeout of 10000ms exceeded");
          (err as any).code = "ECONNABORTED";
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-1", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 1: Timeout on first attempt caused a retry");
    assert(postCalls.length === 2, "Test 1: Two outbound post calls recorded in total");
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 1: Record successfully persisted once");

    // =========================================================================
    // 2. Transient 5xx, retry succeeds
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err: any = new Error("Request failed with status code 503");
          err.response = { status: 503, data: "Service Unavailable" };
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-2", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 2: Transient 503 on first attempt caused a retry");
    assert(postCalls.length === 2, "Test 2: Correct total number of post attempts");

    // =========================================================================
    // 3. Rate limit 429 retry behavior
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err: any = new Error("Request failed with status code 429");
          err.response = { status: 429, data: "Too Many Requests" };
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-3", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 3: Rate limit 429 on first attempt caused a retry");
    assert(postCalls.length === 2, "Test 3: Two post calls made in total");

    // =========================================================================
    // 4. Permanent 4xx (e.g. 401) does not retry
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err: any = new Error("Request failed with status code 401");
          err.response = { status: 401, data: "Unauthorized" };
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-4", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 1, "Test 4: Permanent 401 was NOT retried");
    assert(postCalls.length === 1, "Test 4: Only one outbound post call attempted");

    // =========================================================================
    // 5. All retry attempts fail cleanly
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        const err = new Error("timeout of 10000ms exceeded");
        (err as any).code = "ECONNABORTED";
        throw err;
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-5", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 3, "Test 5: Exhausted all 3 attempts on continuous timeouts");
    assert(postCalls.length === 3, "Test 5: Continuous timeouts failed after maximum 3 attempts");

    // =========================================================================
    // 6. Retry does not duplicate HealthRecords
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err = new Error("timeout of 10000ms exceeded");
          (err as any).code = "ECONNABORTED";
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "BP 120/80", "msg-ret-6", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 6: Succeeded on retry attempt");
    assert(MOCK_RECORDS["PAT-101"]?.length === 1, "Test 6: Only one HealthRecord was saved despite 2 send attempts");

    // =========================================================================
    // 7. Emergency response survives a transient first-send failure
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err = new Error("timeout of 10000ms exceeded");
          (err as any).code = "ECONNABORTED";
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "Help! I have severe chest pain!", "msg-ret-7", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 7: Emergency alert send retried successfully on timeout");
    const emergencyMsg = postCalls[1]?.data?.text?.body || "";
    assert(emergencyMsg.includes("EMERGENCY") && emergencyMsg.includes("emergency room"), "Test 7: Delivered correct emergency message on retry");

    // =========================================================================
    // 8. Implausible-value clarification survives first-send failure & is exact
    // =========================================================================
    resetState();
    postBehavior = async (url, data) => {
      postCalls.push({ url, data });
      if (url.includes("graph.facebook.com")) {
        postAttemptsCount++;
        if (postAttemptsCount === 1) {
          const err = new Error("timeout of 10000ms exceeded");
          (err as any).code = "ECONNABORTED";
          throw err;
        }
      }
      return { data: { success: true } };
    };

    await receiveMessage(
      makePayload("917618432290", "mera oxygen 150 hai", "msg-ret-8", referenceTimestamp),
      mockResponse() as any
    );

    assert(postAttemptsCount === 2, "Test 8: Implausible oxygen recheck message retried on timeout");
    const recheckMsg = postCalls[1]?.data?.text?.body || "";
    assert(recheckMsg.includes("oxygen") && recheckMsg.includes("unusual"), "Test 8: Delivered correct implausible oxygen recheck message on retry");
    assert(!recheckMsg.includes("represent"), "Test 8: Did NOT deliver the older unresolved measurement clarification message");

  } catch (error: any) {
    console.error("💥 Unhandled error in Sprint 41.1 retry test suite:", error?.message || error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Sprint 41.1 Retry Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    console.error("❌ Some Sprint 41.1 retry tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All Sprint 41.1 WhatsApp Outbound Reliability retry tests passed successfully!");
    process.exit(0);
  }
}

if (require.main === module) {
  runSprint41RetryTests();
}
