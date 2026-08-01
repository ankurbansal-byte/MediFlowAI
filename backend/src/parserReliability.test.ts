import { receiveMessage, clearWebhookDeduplicationCache } from "./controllers/webhookController";
import { setMockExtractHealthData } from "./services/openaiService";
import { dynamicMockUsers } from "./utils/mockUsers";
import { MOCK_RECORDS } from "./controllers/patientController";
import {
  clearAllPendingClarifications,
  getPendingClarification,
  setPendingClarification,
} from "./services/pendingClarificationService";
import OpenAI from "openai";
import axios from "axios";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";
process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";
process.env.PHONE_NUMBER_ID = "mock-phone-id";
process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES = "330"; // IST
process.env.GROQ_API_KEY = "mock-groq-key";

let mockVoiceTranscript = "Mera BP high hai aur sugar 115 fasting weight 70";

// Mock Whisper API transcriber with a short delay to let read streams complete
(OpenAI.Audio.Transcriptions.prototype as any).create = async function () {
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockVoiceTranscript;
};

let axiosPostCalls: Array<{ url: string; data: any }> = [];

(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
};

(axios as any).get = async (url: string, config?: any) => {
  if (url.includes("graph.facebook.com")) {
    return {
      data: {
        url: "https://mock-meta-cdn.com/audio-file.ogg",
        mime_type: "audio/ogg",
        file_size: 100000,
      }
    };
  }
  return { data: Buffer.from("mock-audio-bytes-ogg") };
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

const makePayload = (from: string, messageText: string, id: string, type: "text" | "audio" = "text", timestamp?: string): any => {
  if (type === "audio") {
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
                      type: "audio",
                      audio: {
                        id: "audio-media-id-123",
                        mime_type: "audio/ogg",
                      },
                      timestamp: timestamp || "1784541600"
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    };
  }
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
                    timestamp: timestamp || "1784541600"
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

async function runParserReliabilityTests() {
  console.log("🧪 Running Comprehensive Parser Reliability & Response Generation Tests...");

  // 1. Single Observation Text & Parsing
  resetState();
  setMockExtractHealthData(async () => {
    throw new Error("AI Offline"); // Force deterministic local parser
  });

  // Sugar
  await receiveMessage(makePayload("917618432290", "Sugar fasting 105", "msg-1"), mockResponse() as any);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 1);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.[0]?.parameter, "blood_sugar");
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.[0]?.value, 105);
  console.log("✅ Test 1 Passed: Single Sugar Fasting parsed and saved.");

  // 2. BP Parsing & Rejection of partial BP
  resetState();
  // Valid BP
  await receiveMessage(makePayload("917618432290", "BP 120/80", "msg-2"), mockResponse() as any);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 1);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.[0]?.parameter, "blood_pressure");
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.[0]?.value, "120/80");

  // Partial BP (only systolic)
  MOCK_RECORDS["PAT-101"] = [];
  await receiveMessage(makePayload("917618432290", "BP 130", "msg-3"), mockResponse() as any);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 0, "Partial BP must never be saved.");
  console.log("✅ Test 2 Passed: Valid BP saved, partial BP rejected from database.");

  // 3. Rejecting invalid values (undefined, null, NaN, empty)
  resetState();
  await receiveMessage(makePayload("917618432290", "Weight nan", "msg-4"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "Temp undefined", "msg-5"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "Sugar null", "msg-6"), mockResponse() as any);
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 0, "Invalid NaN, undefined, null values must never be saved.");
  console.log("✅ Test 3 Passed: Invalid values rejected successfully.");

  // 4. Voice BP Parsing & Parameter Isolation
  resetState();
  mockVoiceTranscript = "Mera BP high hai aur sugar 115 fasting weight 70";
  // Voice message with failed BP but valid sugar and weight
  // Since there is a BP keyword ("bp"), but no systolic/diastolic numbers, BP parsing fails.
  // But Sugar and Weight are complete and must still be saved. Only BP is retried.
  await receiveMessage(makePayload("917618432290", "ignored_body", "msg-voice-1", "audio"), mockResponse() as any);

  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 2, "Parameter isolation: Sugar and Weight must be saved even if voice BP fails.");
  assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_sugar" && r.value === 115), "Sugar saved");
  assert(MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "weight" && r.value === 70), "Weight saved");
  assert(!MOCK_RECORDS["PAT-101"]?.some(r => r.parameter === "blood_pressure"), "BP must not be saved.");

  // Check the response content: must show save confirmation first, then voice BP retry message, and NO "undefined/undefined"
  const responseMsg = axiosPostCalls[0]?.data?.text?.body || "";
  assert(
    responseMsg.includes("successfully saved") || responseMsg.includes("successfully save"),
    "Confirmation block present"
  );
  assert(responseMsg.includes("Blood Sugar"), "Sugar listed in confirmation");
  assert(responseMsg.includes("Weight"), "Weight listed in confirmation");
  assert(
    responseMsg.includes("I could not clearly understand") || responseMsg.includes("Mujhe aapka blood pressure reading"),
    "BP repeat prompt appended"
  );
  assert(!responseMsg.includes("undefined"), "Must never contain undefined/undefined");
  assert(!responseMsg.includes("NaN"), "Must never contain NaN");
  console.log("✅ Test 4 Passed: Voice BP failed, saved other valid parameters, appended clear repeat instructions, zero undefined/undefined.");

  // 5. Multiple Alerts (Warning Messages Disabled in V1 Engine - Only confirm recorded observations)
  resetState();
  // Abnormal Fasting sugar (150 > 100), Elevated BP (140/90), Normal Weight (70 kg), Low SpO2 (92%)
  await receiveMessage(makePayload("917618432290", "Sugar fasting 150 BP 140/90 weight 70 SpO2 92", "msg-multi-alert"), mockResponse() as any);

  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 4);
  const combinedReply = axiosPostCalls[0]?.data?.text?.body || "";

  // Check confirmation is sent first
  assert(
    combinedReply.startsWith("✅ All your readings") ||
    combinedReply.includes("successfully saved"),
    "Confirmation must be sent first."
  );

  // Warning Alerts are fully disabled as per Objective 2
  assert(!combinedReply.includes("Blood Sugar is high."), "Automatic warnings must be disabled.");
  assert(!combinedReply.includes("Blood Pressure is elevated."), "Automatic warnings must be disabled.");
  assert(!combinedReply.includes("Oxygen saturation is slightly low."), "Automatic warnings must be disabled.");

  // Ensure we didn't send multiple messages
  assert.strictEqual(axiosPostCalls.length, 1, "Only exactly one combined reply sent.");
  console.log("✅ Test 5 Passed: Saved observations confirmed successfully with automatic alerts disabled.");

  // 6. Language Styles (Hindi & Hinglish)
  resetState();
  // Hindi abnormal BP
  await receiveMessage(makePayload("917618432290", "बीपी 140/90", "msg-hindi"), mockResponse() as any);
  const hindiReply = axiosPostCalls[0]?.data?.text?.body || "";
  assert(hindiReply.includes("सफलतापूर्वक सेव") || hindiReply.includes("सफलतापूर्वक दर्ज"), "Hindi confirmation header present.");
  assert(!hindiReply.includes("बढ़ा हुआ है।"), "Automatic warnings must be disabled in Hindi.");
  console.log("✅ Test 6 Passed: Language style matches Hindi confirmation and no alerts are triggered.");

  // 7. Duplicate Detection
  resetState();
  await receiveMessage(makePayload("917618432290", "Weight 70", "msg-dup"), mockResponse() as any);
  await receiveMessage(makePayload("917618432290", "Weight 70", "msg-dup"), mockResponse() as any); // Repeat same message ID
  assert.strictEqual(MOCK_RECORDS["PAT-101"]?.length, 1, "Duplicate messages must be completely ignored/deduplicated.");
  console.log("✅ Test 7 Passed: Duplicate message deduplicated completely.");

  console.log("\n=======================================================");
  console.log("🏆 ALL PARSER RELIABILITY & RESPONSE GENERATION TESTS PASSED!");
  console.log("=======================================================");
}

runParserReliabilityTests().catch(err => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
