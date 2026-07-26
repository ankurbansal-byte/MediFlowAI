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
import axios from "axios";
import OpenAI from "openai";
import fs from "fs";
import assert from "assert";

// Force mock data mode
process.env.USE_MOCK_DATA = "true";
process.env.GROQ_API_KEY = "mock-groq-key";
process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";
process.env.PHONE_NUMBER_ID = "mock-phone-id";
process.env.WHATSAPP_TIMEZONE_OFFSET_MINUTES = "330"; // IST

let axiosPostCalls: Array<{ url: string; data: any }> = [];
let axiosGetCalls: Array<{ url: string; config?: any }> = [];

let mockMetadataResponse: any = {
  data: {
    url: "https://mock-meta-cdn.com/audio-file.ogg",
    mime_type: "audio/ogg",
    file_size: 100000,
  }
};

let mockDownloadResponse: any = {
  data: Buffer.from("mock-audio-bytes-ogg")
};

let axiosGetError: any = null;

(axios as any).post = async (url: string, data?: any, config?: any) => {
  axiosPostCalls.push({ url, data });
  return { data: { success: true } };
};

(axios as any).get = async (url: string, config?: any) => {
  axiosGetCalls.push({ url, config });
  if (axiosGetError) {
    throw axiosGetError;
  }
  if (url.includes("mock-meta-cdn.com")) {
    return mockDownloadResponse;
  }
  return mockMetadataResponse;
};

// Mock OpenAI Whisper API (used in speechToText inside groqSpeechService)
let mockTranscript = "sugar fasting 145";
let mockTranscriptionError: any = null;

(OpenAI.Audio.Transcriptions.prototype as any).create = async function () {
  if (mockTranscriptionError) {
    throw mockTranscriptionError;
  }
  return mockTranscript;
};

// Spy on FS write and delete to check cleanup
let writtenFiles = new Set<string>();
let deletedFiles = new Set<string>();

const origWriteFileSync = fs.writeFileSync;
const origUnlinkSync = fs.unlinkSync;

(fs as any).writeFileSync = (filePath: any, data: any, options: any) => {
  if (typeof filePath === "string" && filePath.includes("uploads")) {
    writtenFiles.add(filePath);
  }
  return origWriteFileSync(filePath, data, options);
};

(fs as any).unlinkSync = (filePath: any) => {
  if (typeof filePath === "string" && filePath.includes("uploads")) {
    deletedFiles.add(filePath);
  }
  return origUnlinkSync(filePath);
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

const makeVoicePayload = (
  from: string,
  mediaId: string,
  id: string,
  mimeType = "audio/ogg; codecs=opus",
  timestamp?: string
): any => {
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
                      id: mediaId,
                      mime_type: mimeType,
                    },
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

const makeTextPayload = (from: string, messageText: string, id: string, timestamp?: string): any => {
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
  clearRecentlyResolvedContext("PAT-101");
  clearRecentlyResolvedContext("PAT-102");
  setMockExtractHealthData(async () => "");
  axiosPostCalls = [];
  axiosGetCalls = [];
  axiosGetError = null;
  mockTranscript = "sugar fasting 145";
  mockTranscriptionError = null;
  writtenFiles.clear();
  deletedFiles.clear();

  mockMetadataResponse = {
    data: {
      url: "https://mock-meta-cdn.com/audio-file.ogg",
      mime_type: "audio/ogg",
      file_size: 100000,
    }
  };
  mockDownloadResponse = {
    data: Buffer.from("mock-audio-bytes-ogg")
  };

  process.env.GROQ_API_KEY = "mock-groq-key";
  process.env.WHATSAPP_TOKEN = "mock-whatsapp-token";

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

async function runTests() {
  console.log("🎙️ Running Sprint 43 WhatsApp Voice Intelligence E2E Unit & Safety Tests...");

  // =========================================================================
  // 1. valid WhatsApp voice webhook recognized
  // 2. media ID extracted
  // =========================================================================
  resetState();
  await receiveMessage(makeVoicePayload("917618432290", "media-101", "msg-v-1"), mockResponse() as any);
  assert(axiosGetCalls.length >= 2, "Test 1 & 2: Recognized voice webhook and executed Meta API metadata/download calls");
  assert(axiosGetCalls[0].url.includes("media-101"), "Test 2: Correctly extracted media ID from payload");
  console.log("✅ Assertion 1 & 2 Passed");

  // =========================================================================
  // 3. malformed audio payload rejected safely
  // =========================================================================
  resetState();
  const malformedPayload = makeVoicePayload("917618432290", "", "msg-v-2");
  delete malformedPayload.body.entry[0].changes[0].value.messages[0].audio.id;
  await receiveMessage(malformedPayload, mockResponse() as any);
  assert(axiosGetCalls.length === 0, "Test 3: Malformed audio payload skipped safely without making Meta API calls");
  console.log("✅ Assertion 3 Passed");

  // =========================================================================
  // 4. media download failure handled
  // =========================================================================
  resetState();
  axiosGetError = new Error("Network error downloading from Meta CDN");
  await receiveMessage(makeVoicePayload("917618432290", "media-102", "msg-v-3"), mockResponse() as any);
  const out4 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out4.includes("samajh nahi aaya") || out4.includes("couldn't understand"), "Test 4: Media download failure handled and failed safely");
  console.log("✅ Assertion 4 Passed");

  // =========================================================================
  // 5. transcription timeout handled
  // =========================================================================
  resetState();
  mockTranscriptionError = new Error("Whisper transcription timed out");
  await receiveMessage(makeVoicePayload("917618432290", "media-103", "msg-v-4"), mockResponse() as any);
  const out5 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out5.includes("available nahi hai") || out5.includes("temporarily unavailable"), "Test 5: Transcription timeout handled and failure response sent");
  console.log("✅ Assertion 5 Passed");

  // =========================================================================
  // 6. empty transcript handled
  // =========================================================================
  resetState();
  mockTranscript = "   ";
  await receiveMessage(makeVoicePayload("917618432290", "media-104", "msg-v-5"), mockResponse() as any);
  const out6 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out6.includes("khali ya silent") || out6.includes("empty or silent"), "Test 6: Empty transcript handled safely with specific response");
  console.log("✅ Assertion 6 Passed");

  // =========================================================================
  // 7. unsupported audio handled
  // =========================================================================
  resetState();
  await receiveMessage(makeVoicePayload("917618432290", "media-105", "msg-v-6", "image/jpeg"), mockResponse() as any);
  const out7 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out7.includes("format supported nahi") || out7.includes("Unsupported audio"), "Test 7: Unsupported MIME type rejected");
  console.log("✅ Assertion 7 Passed");

  // =========================================================================
  // 8. oversized audio handled
  // =========================================================================
  resetState();
  mockMetadataResponse.data.file_size = 10 * 1024 * 1024; // 10 MB
  await receiveMessage(makeVoicePayload("917618432290", "media-106", "msg-v-7"), mockResponse() as any);
  const out8 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out8.includes("bada ya lamba") || out8.includes("too large"), "Test 8: 10MB audio rejected with size warning");
  console.log("✅ Assertion 8 Passed");

  // =========================================================================
  // 9. English voice sugar extraction
  // =========================================================================
  resetState();
  mockTranscript = "My sugar is 145 after meal";
  await receiveMessage(makeVoicePayload("917618432290", "media-107", "msg-v-8"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 1, "Test 9: Record created");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_sugar", "Test 9: Extracted blood sugar");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 145, "Test 9: Value is 145");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 9: Context post_meal mapped");
  console.log("✅ Assertion 9 Passed");

  // =========================================================================
  // 10. Hinglish voice sugar extraction
  // =========================================================================
  resetState();
  mockTranscript = "Meri sugar 145 hai, khane ke baad";
  await receiveMessage(makeVoicePayload("917618432290", "media-108", "msg-v-9"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 10: Hinglish context resolved post_meal");
  console.log("✅ Assertion 10 Passed");

  // =========================================================================
  // 11. Hindi voice sugar extraction
  // =========================================================================
  resetState();
  mockTranscript = "मेरी शुगर 145 है, खाने के बाद";
  await receiveMessage(makeVoicePayload("917618432290", "media-109", "msg-v-10"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 11: Hindi context resolved post_meal");
  console.log("✅ Assertion 11 Passed");

  // =========================================================================
  // 12. voice BP extraction
  // =========================================================================
  resetState();
  mockTranscript = "Mera BP 130 by 80 hai";
  await receiveMessage(makeVoicePayload("917618432290", "media-110", "msg-v-11"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.parameter === "blood_pressure", "Test 12: Extracted blood pressure");
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === "130/80", "Test 12: Correctly parsed systolic/diastolic pair");
  console.log("✅ Assertion 12 Passed");

  // =========================================================================
  // 13. voice multi-vital extraction
  // =========================================================================
  resetState();
  mockTranscript = "Mera BP 130/80 hai aur heart rate 72";
  await receiveMessage(makeVoicePayload("917618432290", "media-111", "msg-v-12"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 2, "Test 13: Saved 2 records in a single voice message");
  console.log("✅ Assertion 13 Passed");

  // =========================================================================
  // 14. voice sugar missing context → clarification
  // =========================================================================
  resetState();
  mockTranscript = "mera sugar 145 hai";
  await receiveMessage(makeVoicePayload("917618432290", "media-112", "msg-v-13"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") !== null, "Test 14: Clarification state pending for sugar context");
  console.log("✅ Assertion 14 Passed");

  // =========================================================================
  // 15. voice sugar → text context follow-up
  // =========================================================================
  resetState();
  mockTranscript = "mera sugar 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-113", "msg-v-14"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") !== null, "Test 15: Voice sugar clarified context pending");
  await receiveMessage(makeTextPayload("917618432290", "after meal", "msg-t-15"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 15: Successfully resolved voice pending state with text answer");
  console.log("✅ Assertion 15 Passed");

  // =========================================================================
  // 16. text sugar → voice context follow-up
  // =========================================================================
  resetState();
  await receiveMessage(makeTextPayload("917618432290", "sugar 145", "msg-t-16"), mockResponse() as any);
  assert(getPendingClarification("PAT-101") !== null, "Test 16: Text sugar clarified context pending");
  mockTranscript = "after meal";
  await receiveMessage(makeVoicePayload("917618432290", "media-114", "msg-v-16"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.context === "post_meal", "Test 16: Successfully resolved text pending state with voice answer");
  console.log("✅ Assertion 16 Passed");

  // =========================================================================
  // 17. voice unresolved number → voice "sugar" resolution
  // =========================================================================
  resetState();
  mockTranscript = "145";
  await receiveMessage(makeVoicePayload("917618432290", "media-115", "msg-v-17"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.unresolvedMeasurements?.[0] === 145, "Test 17: Pending unresolved number 145");
  mockTranscript = "sugar";
  await receiveMessage(makeVoicePayload("917618432290", "media-116", "msg-v-18"), mockResponse() as any);
  assert(getPendingClarification("PAT-101")?.missingFields.includes("glucose_context"), "Test 17: Multi-turn voice resolved unresolved number to sugar");
  console.log("✅ Assertion 17 Passed");

  // =========================================================================
  // 18. voice correction routes through Sprint 40
  // 19. correction does not create duplicate record
  // =========================================================================
  resetState();
  mockTranscript = "sugar fasting 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-117", "msg-v-19"), mockResponse() as any);
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 1, "Test 18: Record saved");

  mockTranscript = "sorry sugar 145 nahi 165 thi";
  await receiveMessage(makeVoicePayload("917618432290", "media-118", "msg-v-20"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.value === 165, "Test 18: Voice correction resolved and applied");
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 1, "Test 19: Correction did not create duplicate record");
  console.log("✅ Assertion 18 & 19 Passed");

  // =========================================================================
  // 20. voice emergency triggers Sprint 41 safety
  // 21. voice emergency does not diagnose
  // =========================================================================
  resetState();
  mockTranscript = "mujhe chest pain hai aur saans lene mein dikkat hai";
  await receiveMessage(makeVoicePayload("917618432290", "media-119", "msg-v-21"), mockResponse() as any);
  const out20 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out20.includes("EMERGENCY") || out20.includes("आपातकालीन स्थिति"), "Test 20: Emergency response triggered successfully via voice");
  assert(!out20.includes("heart attack") && !out20.includes("stroke") && !out20.includes("percent"), "Test 21: Warning does not diagnose");
  console.log("✅ Assertion 20 & 21 Passed");

  // =========================================================================
  // 22. voice oxygen 150 is rejected/clarified
  // =========================================================================
  resetState();
  mockTranscript = "mera oxygen 150 hai";
  await receiveMessage(makeVoicePayload("917618432290", "media-120", "msg-v-22"), mockResponse() as any);
  const out22 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out22.includes("unusual") || out22.includes("असामान्य"), "Test 22: Implausible reading rejected and re-checked");
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 0, "Test 22: Implausible value not persisted");
  console.log("✅ Assertion 22 Passed");

  // =========================================================================
  // 23. voice latest-sugar read-back
  // 25. read-back creates zero records
  // =========================================================================
  resetState();
  mockTranscript = "sugar fasting 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-121", "msg-v-23"), mockResponse() as any);

  mockTranscript = "meri last sugar kitni thi?";
  await receiveMessage(makeVoicePayload("917618432290", "media-122", "msg-v-24"), mockResponse() as any);
  const out23 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out23.includes("145") && out23.includes("sugar"), "Test 23: Voice latest readback succeeded");
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 1, "Test 25: Read back query did not create any new record");
  console.log("✅ Assertion 23 & 25 Passed");

  // =========================================================================
  // 24. voice today's-readings query
  // =========================================================================
  resetState();
  mockTranscript = "sugar fasting 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-123", "msg-v-25"), mockResponse() as any);
  mockTranscript = "BP 120/80";
  await receiveMessage(makeVoicePayload("917618432290", "media-124", "msg-v-26"), mockResponse() as any);

  mockTranscript = "aaj maine kya readings bheji?";
  await receiveMessage(makeVoicePayload("917618432290", "media-125", "msg-v-27"), mockResponse() as any);
  const out24 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out24.includes("Sugar 145") && out24.includes("BP 120/80"), "Test 24: Voice today query listed readings");
  console.log("✅ Assertion 24 Passed");

  // =========================================================================
  // 26. voice explicit 9 AM preserves timezone-safe recordedAt
  // =========================================================================
  resetState();
  mockTranscript = "BP 120/80 at 9 AM";
  await receiveMessage(makeVoicePayload("917618432290", "media-126", "msg-v-28", "audio/ogg", "1784541600"), mockResponse() as any); // reference: July 20, 2026 UTC
  const rec26 = MOCK_RECORDS["PAT-101"]?.[0];
  const recDate = new Date(rec26.recordedAt);
  // IST is UTC+5:30 (330 min). 9 AM IST is 3:30 AM UTC.
  assert(recDate.getUTCHours() === 3 && recDate.getUTCMinutes() === 30, "Test 26: Preserved timezone adjusted clock-time");
  console.log("✅ Assertion 26 Passed");

  // =========================================================================
  // 27. voice morning/evening preserves timeContext
  // =========================================================================
  resetState();
  mockTranscript = "BP morning 120/80";
  await receiveMessage(makeVoicePayload("917618432290", "media-127", "msg-v-29"), mockResponse() as any);
  assert(MOCK_RECORDS["PAT-101"]?.[0]?.timeContext === "morning", "Test 27: preserved timeContext");
  console.log("✅ Assertion 27 Passed");

  // =========================================================================
  // 28. duplicate voice webhook creates one clinical result only
  // =========================================================================
  resetState();
  mockTranscript = "BP 120/80";
  await receiveMessage(makeVoicePayload("917618432290", "media-128", "msg-v-30"), mockResponse() as any);
  await receiveMessage(makeVoicePayload("917618432290", "media-128", "msg-v-30"), mockResponse() as any); // deliver duplicate messageId
  assert((MOCK_RECORDS["PAT-101"] as any)?.length === 1, "Test 28: Duplicate voice payload deduplicated perfectly");
  console.log("✅ Assertion 28 Passed");

  // =========================================================================
  // 29. duplicate voice webhook does not duplicate state transition
  // =========================================================================
  resetState();
  mockTranscript = "sugar 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-129", "msg-v-31"), mockResponse() as any);
  const outCountFirst = axiosPostCalls.length;
  await receiveMessage(makeVoicePayload("917618432290", "media-129", "msg-v-31"), mockResponse() as any);
  assert(axiosPostCalls.length === outCountFirst, "Test 29: Duplicate webhook did not trigger duplicate state transitions or duplicate outbound messages");
  console.log("✅ Assertion 29 Passed");

  // =========================================================================
  // 30. patient isolation
  // =========================================================================
  resetState();
  mockTranscript = "sugar fasting 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-130", "msg-v-32"), mockResponse() as any); // PAT-101

  mockTranscript = "sugar fasting 120";
  await receiveMessage(makeVoicePayload("917618432291", "media-131", "msg-v-33"), mockResponse() as any); // PAT-102

  mockTranscript = "meri last sugar kya thi?";
  await receiveMessage(makeVoicePayload("917618432290", "media-132", "msg-v-34"), mockResponse() as any); // PAT-101 queries
  const out30 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out30.includes("145") && !out30.includes("120"), "Test 30: Patient isolation enforced (PAT-101 sees 145, not 120)");
  console.log("✅ Assertion 30 Passed");

  // =========================================================================
  // 31. tenant isolation
  // =========================================================================
  resetState();
  mockTranscript = "sugar fasting 145";
  await receiveMessage(makeVoicePayload("917618432290", "media-133", "msg-v-35"), mockResponse() as any); // PAT-101 under HOSP-001

  // Set PAT-101 hospitalId to HOSP-002 temporarily
  dynamicMockUsers[0].hospitalId = "HOSP-002";
  mockTranscript = "meri last sugar kya thi?";
  await receiveMessage(makeVoicePayload("917618432290", "media-134", "msg-v-36"), mockResponse() as any); // Query under HOSP-002
  const out31 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out31.includes("koi reading nahi mili") || out31.includes("No reading found"), "Test 31: Tenant isolation enforces complete boundary");
  console.log("✅ Assertion 31 Passed");

  // =========================================================================
  // 32. temporary media cleanup on success
  // =========================================================================
  resetState();
  mockTranscript = "BP 120/80";
  await receiveMessage(makeVoicePayload("917618432290", "media-135", "msg-v-37"), mockResponse() as any);
  const successFile = Array.from(writtenFiles)[0];
  assert(successFile && successFile.includes("media-135"), "Test 32: File was temporarily written");
  assert(deletedFiles.has(successFile), "Test 32: File was unconditionally deleted on successful transcription");
  console.log("✅ Assertion 32 Passed");

  // =========================================================================
  // 33. temporary media cleanup on transcription failure
  // =========================================================================
  resetState();
  mockTranscriptionError = new Error("Transcription server error");
  await receiveMessage(makeVoicePayload("917618432290", "media-136", "msg-v-38"), mockResponse() as any);
  const failureFile = Array.from(writtenFiles)[0];
  assert(failureFile && failureFile.includes("media-136"), "Test 33: File was temporarily written");
  assert(deletedFiles.has(failureFile), "Test 33: File was unconditionally deleted on transcription failure");
  console.log("✅ Assertion 33 Passed");

  // =========================================================================
  // 34. missing transcription configuration fails gracefully
  // =========================================================================
  resetState();
  process.env.GROQ_API_KEY = "dummy-key";
  await receiveMessage(makeVoicePayload("917618432290", "media-137", "msg-v-39"), mockResponse() as any);
  const out34 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out34.includes("unavailable") || out34.includes("available nahi hai"), "Test 34: Missing API key fails gracefully");
  console.log("✅ Assertion 34 Passed");

  // =========================================================================
  // 35. language-matched transcription failure response
  // =========================================================================
  resetState();
  // Set up pending Hindi clarification state
  setPendingClarification("PAT-101", {
    patientId: "PAT-101",
    hospitalId: "HOSP-001",
    originalWhatsappMessageId: "orig-msg-id",
    originalSourceText: "शुगर",
    language: "hindi",
    candidateRecords: [],
    missingFields: [],
    clarificationReason: "test",
    originalMessageDate: new Date(),
  });
  mockTranscriptionError = new Error("Any transcriber crash");
  await receiveMessage(makeVoicePayload("917618432290", "media-138", "msg-v-40"), mockResponse() as any);
  const out35 = axiosPostCalls[axiosPostCalls.length - 1]?.data?.text?.body || "";
  assert(out35.includes("अस्थायी रूप से अनुपलब्ध है"), "Test 35: Sent language-matched (Hindi) failure response");
  console.log("✅ Assertion 35 Passed");

  // =========================================================================
  // 36. outbound response uses existing reliable sender path
  // =========================================================================
  assert(axiosPostCalls.length > 0, "Test 36: Sent messages");
  for (const call of axiosPostCalls) {
    assert(call.url.includes("graph.facebook.com/v23.0") && call.url.includes("messages"), "Test 36: Standard outbound messages path used");
  }
  console.log("✅ Assertion 36 Passed");

  console.log("\n=========================================");
  console.log("🏆 ALL 36 SPRINT 43 TESTS PASSED PERFECTLY!");
  console.log("=========================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ Test assertion failed:", err);
  process.exit(1);
});
