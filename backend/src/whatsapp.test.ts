import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { arePhoneNumbersEquivalent, findEnrolledPatientByWhatsApp } from "./utils/phoneHelper";
import { resolveRecordedAt } from "./utils/healthRecordParser";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import { setMockExtractHealthData } from "./services/openaiService";
import axios from "axios";

// Enable mock data mode explicitly
process.env.USE_MOCK_DATA = "true";

// Helper to create mock Express Response
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

// Mock Webhook Request Payload generator
const makeWebhookPayload = (from: string, messageText: string, id: string = "msg-123") => {
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

// Mock Webhook Request Payload generator for status events
const makeStatusWebhookPayload = (id: string = "msg-123", status: string = "delivered") => {
  return {
    body: {
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id,
                    status,
                    timestamp: "1601223456",
                    recipient_id: "917618432290"
                  }
                ]
              },
            },
          ],
        },
      ],
    },
  };
};

// Track axios.post calls to spy on WhatsApp messages sent
let axiosPostCalls: Array<{ url: string; data: any }> = [];

// Intercept axios.post
(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
};

async function runTests() {
  console.log("🧪 Running backend WhatsApp Identity Linking, Date Accuracy & Idempotency Tests...");

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
    // Set mock extraction callback returning the new Message Intelligence Contract format
    setMockExtractHealthData(async (message: string) => {
      const msg = message.toLowerCase();
      if (msg.includes("sugar")) {
        const valMatch = msg.match(/\d+/);
        const value = valMatch ? parseInt(valMatch[0], 10) : 125;
        let recordedAt: string | null = null;
        if (msg.includes("yesterday")) {
          recordedAt = "2026-07-11T08:00:00"; // simulated hallucinated prompt date
        }
        return JSON.stringify({
          language: "hinglish",
          action: "RECORD",
          intent: "health_measurement",
          candidateRecords: [
            {
              parameter: "blood_sugar",
              value,
              unit: "mg/dL",
              recordedAt,
              confidence: 0.99
            }
          ],
          missingFields: [],
          reason: ""
        });
      }
      return JSON.stringify({
        language: "unknown",
        action: "IGNORE",
        intent: "unknown",
        candidateRecords: [],
        missingFields: [],
        reason: ""
      });
    });

    // Let's seed a clean state of mock users & mock records
    dynamicMockUsers.length = 0;
    dynamicMockUsers.push({
      username: "PAT-101",
      role: "patient",
      patientId: "PAT-101",
      hospitalId: "HOSP-001",
      fullName: "Enrolled Patient One",
      mobileNumber: "+917618432290",
      status: "active",
    });

    // Clear previous mock records
    for (const key in MOCK_RECORDS) {
      delete MOCK_RECORDS[key];
    }
    clearWebhookDeduplicationCache();
    axiosPostCalls = [];

    // -------------------------------------------------------------------------
    // TEST 1: Phone number normalization equivalence tests
    // -------------------------------------------------------------------------
    assert(
      arePhoneNumbersEquivalent("+917618432290", "917618432290"),
      "Phone numbers with/without leading plus must be equivalent."
    );
    assert(
      arePhoneNumbersEquivalent("917618432290", "7618432290"),
      "Indian country code prefix differences must match suffix successfully."
    );
    assert(
      arePhoneNumbersEquivalent("+91 7618432290", "07618432290"),
      "Spaces and leading zero variations are equivalent."
    );
    assert(
      !arePhoneNumbersEquivalent("917618432290", "919999999999"),
      "Different phone numbers must NOT match (no unsafe partial match)."
    );

    // -------------------------------------------------------------------------
    // TEST 2: Registered WhatsApp number resolves to the correct PAT-xxx patientId
    // -------------------------------------------------------------------------
    const matchedPat = await findEnrolledPatientByWhatsApp("917618432290");
    assert(matchedPat !== null, "Registered phone number must successfully resolve to a patient user.");
    assert(matchedPat?.patientId === "PAT-101", "Resolved patientId must be exactly PAT-101.");

    // -------------------------------------------------------------------------
    // TEST 3: Unregistered WhatsApp number creates no orphan HealthRecord & fails safely
    // -------------------------------------------------------------------------
    const resUnregistered = mockResponse();
    const reqUnregistered: any = makeWebhookPayload("919999999999", "Aaj ki sugar hai 125", "msg-unreg");
    await receiveMessage(reqUnregistered, resUnregistered);

    assert(resUnregistered.statusCode === 200, "Unregistered WhatsApp request returns 200 OK (fails safely).");
    assert(
      !MOCK_RECORDS["919999999999"],
      "No health records should be created under the raw unregistered phone number."
    );

    // -------------------------------------------------------------------------
    // TEST 4: "Aaj ki sugar hai 125" receives the correct current/message date
    // -------------------------------------------------------------------------
    const messageDate = new Date("2026-07-22T10:00:00Z");
    const resolvedDateToday = resolveRecordedAt("Aaj ki sugar hai 125", null, messageDate);
    assert(
      resolvedDateToday.toISOString() === messageDate.toISOString(),
      "'Aaj' relative term resolves exactly to the current message date."
    );

    const resolvedDateYesterday = resolveRecordedAt("Yesterday night sugar was 130", "2026-07-11T08:00:00", messageDate);
    const expectedYesterday = new Date(messageDate);
    expectedYesterday.setDate(expectedYesterday.getDate() - 1);
    assert(
      resolvedDateYesterday.toDateString() === expectedYesterday.toDateString(),
      "'Yesterday' relative term resolves to exactly 1 day before the current message date."
    );

    // -------------------------------------------------------------------------
    // TEST 5: Explicit historical dates remain respected and are not overwritten
    // -------------------------------------------------------------------------
    const explicitDateStr = "2026-05-15T14:30:00";
    const resolvedExplicit = resolveRecordedAt("My sugar on 15 May was 110", explicitDateStr, messageDate);
    assert(
      resolvedExplicit.toISOString() === new Date(explicitDateStr).toISOString(),
      "Explicit historical date remains respected and is not overwritten."
    );

    // -------------------------------------------------------------------------
    // TEST A: One unique WhatsApp health message -> one HealthRecord, one acknowledgement
    // -------------------------------------------------------------------------
    clearWebhookDeduplicationCache();
    axiosPostCalls = [];
    for (const key in MOCK_RECORDS) {
      delete MOCK_RECORDS[key];
    }

    const resA = mockResponse();
    const reqA: any = makeWebhookPayload("917618432290", "Aaj ki sugar hai 137", "msg-unique-A");
    await receiveMessage(reqA, resA);

    assert(resA.statusCode === 200, "Unique message request returned 200 OK.");
    assert(MOCK_RECORDS["PAT-101"] !== undefined, "Health record mapped to PAT-101 successfully.");
    assert(MOCK_RECORDS["PAT-101"].length === 1, "Exactly 1 health record was stored.");
    assert(MOCK_RECORDS["PAT-101"][0].value === 137, "Value of the health record is exactly 137.");
    assert(axiosPostCalls.length === 1, "Exactly 1 acknowledgement sent to user.");
    const ackBody = axiosPostCalls[0].data.text.body;
    assert(ackBody.includes("1 health record(s) saved successfully") || ackBody.includes("save ho gayi") || ackBody.includes("saved"), "Acknowledgement text is correct.");

    // -------------------------------------------------------------------------
    // TEST B: Same webhook/message delivered repeatedly -> still one HealthRecord, still one acknowledgement
    // -------------------------------------------------------------------------
    for (let i = 0; i < 4; i++) {
      const resB = mockResponse();
      const reqB: any = makeWebhookPayload("917618432290", "Aaj ki sugar hai 137", "msg-unique-A");
      await receiveMessage(reqB, resB);
      assert(resB.statusCode === 200, `Duplicate delivery #${i + 1} returned 200 OK.`);
    }

    assert(MOCK_RECORDS["PAT-101"].length === 1, "Still exactly 1 health record exists after duplicate message deliveries.");
    assert(axiosPostCalls.length === 1, "Still exactly 1 acknowledgement sent in total (zero duplicate acknowledgements sent).");

    // -------------------------------------------------------------------------
    // TEST C: WhatsApp status events (sent/delivered/read) -> no health records, no acknowledgements
    // -------------------------------------------------------------------------
    const countBeforeStatus = MOCK_RECORDS["PAT-101"].length;
    const countAcksBeforeStatus = axiosPostCalls.length;

    const resStatus = mockResponse();
    const reqStatus: any = makeStatusWebhookPayload("msg-unique-A", "delivered");
    await receiveMessage(reqStatus, resStatus);

    assert(resStatus.statusCode === 200, "Status event payload processed successfully with 200 OK.");
    assert(MOCK_RECORDS["PAT-101"].length === countBeforeStatus, "Status event did not create any HealthRecord.");
    assert(axiosPostCalls.length === countAcksBeforeStatus, "Status event did not trigger any acknowledgement messages.");

    // -------------------------------------------------------------------------
    // TEST D: Two genuinely different WhatsApp message IDs -> both processed normally
    // -------------------------------------------------------------------------
    const resD = mockResponse();
    const reqD: any = makeWebhookPayload("917618432290", "Aaj ki sugar hai 111", "msg-unique-D");
    await receiveMessage(reqD, resD);

    assert(resD.statusCode === 200, "Second unique message returned 200 OK.");
    assert(MOCK_RECORDS["PAT-101"].length === 2, "Second health record successfully saved (total count = 2).");
    assert(MOCK_RECORDS["PAT-101"][1].value === 111, "Second record value is correct (111).");
    assert(axiosPostCalls.length === 2, "Exactly 2 acknowledgements sent in total across both unique messages.");

    // -------------------------------------------------------------------------
    // TEST E: Existing Patient identity linking and tenant security must continue to pass
    // -------------------------------------------------------------------------
    assert(MOCK_RECORDS["PAT-101"][0].hospitalId === "HOSP-001", "Tenant security check: first record correctly assigned to HOSP-001.");
    assert(MOCK_RECORDS["PAT-101"][1].hospitalId === "HOSP-001", "Tenant security check: second record correctly assigned to HOSP-001.");

    // Clean up mock extractor
    setMockExtractHealthData(null);

  } catch (error) {
    console.error("💥 Unexpected test execution error:", error);
    testsFailed++;
  }

  console.log("\n=========================================");
  console.log(`📊 Test Execution Results: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("=========================================");

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    console.log("🏆 All WhatsApp Identity, Date Accuracy, and Idempotency tests passed successfully!");
    process.exit(0);
  }
}

runTests();
