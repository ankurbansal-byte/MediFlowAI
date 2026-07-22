import { receiveMessage } from "./controllers/webhookController";
import { arePhoneNumbersEquivalent, findEnrolledPatientByWhatsApp } from "./utils/phoneHelper";
import { resolveRecordedAt } from "./utils/healthRecordParser";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import { setMockExtractHealthData } from "./services/openaiService";

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

async function runTests() {
  console.log("🧪 Running backend WhatsApp Identity Linking & Date Accuracy Tests...");

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
    // Set mock extraction callback
    setMockExtractHealthData(async (message: string) => {
      const msg = message.toLowerCase();
      if (msg.includes("sugar")) {
        const valMatch = msg.match(/\d+/);
        const value = valMatch ? parseInt(valMatch[0], 10) : 125;
        let recordedAt: string | null = null;
        if (msg.includes("yesterday")) {
          recordedAt = "2026-07-11T08:00:00"; // simulated hallucinated prompt date
        }
        return JSON.stringify([
          {
            parameter: "blood_sugar",
            value,
            unit: "mg/dL",
            recordedAt,
          },
        ]);
      }
      return "[]";
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
    // TEST 4: Registered WhatsApp number successfully stores record in MOCK_RECORDS with PAT-101
    // -------------------------------------------------------------------------
    const resRegistered = mockResponse();
    const reqRegistered: any = makeWebhookPayload("917618432290", "Aaj ki sugar hai 125", "msg-reg-1");
    await receiveMessage(reqRegistered, resRegistered);

    assert(resRegistered.statusCode === 200, "Registered webhook handles incoming successfully.");
    assert(MOCK_RECORDS["PAT-101"] !== undefined, "Health record is successfully mapped to PAT-101.");
    assert(MOCK_RECORDS["PAT-101"].length === 1, "Exactly 1 record is created for PAT-101.");
    assert(MOCK_RECORDS["PAT-101"][0].value === 125, "Value of the health record is correct (125).");
    assert(MOCK_RECORDS["PAT-101"][0].hospitalId === "HOSP-001", "Strict tenant safety: correct hospitalId is attached.");

    // -------------------------------------------------------------------------
    // TEST 5: Duplicate WhatsApp message ID does not create duplicate record
    // -------------------------------------------------------------------------
    const resDuplicate = mockResponse();
    const reqDuplicate: any = makeWebhookPayload("917618432290", "Aaj ki sugar hai 125", "msg-reg-1"); // Same ID
    await receiveMessage(reqDuplicate, resDuplicate);

    assert(MOCK_RECORDS["PAT-101"].length === 1, "Duplicate message ID must be skipped (records count remains 1).");

    // -------------------------------------------------------------------------
    // TEST 6: "Aaj ki sugar hai 125" receives the correct current/message date
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
    // TEST 7: Explicit historical dates remain respected and are not overwritten
    // -------------------------------------------------------------------------
    const explicitDateStr = "2026-05-15T14:30:00";
    const resolvedExplicit = resolveRecordedAt("My sugar on 15 May was 110", explicitDateStr, messageDate);
    assert(
      resolvedExplicit.toISOString() === new Date(explicitDateStr).toISOString(),
      "Explicit historical date remains respected and is not overwritten."
    );

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
    console.log("🏆 All WhatsApp Identity & Date Accuracy tests passed successfully!");
    process.exit(0);
  }
}

runTests();
