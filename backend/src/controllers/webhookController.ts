import { speechToText } from "../services/groqSpeechService";
import HealthRecord from "../models/HealthRecord";
import { parseHealthRecord } from "../utils/healthRecordParser";
import axios from "axios";
import fs from "fs";
import path from "path";
import { extractHealthData } from "../services/openaiService";
import { Request, Response } from "express";
import { findEnrolledPatientByWhatsApp } from "../utils/phoneHelper";
import { MOCK_RECORDS } from "./patientController";

// Meta Webhook Verification
export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log("✅ Webhook Verified Successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

// Receive WhatsApp Messages
export const receiveMessage = async (req: Request, res: Response) => {
  console.log("📩 Incoming Webhook:");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    const incomingMessage = value?.messages?.[0];
    const whatsappMessageId = incomingMessage?.id;

    let message = incomingMessage?.text?.body;
    const from = incomingMessage?.from;

    const audioId = incomingMessage?.audio?.id;
    const messageType = incomingMessage?.type;

    // ==========================
    // Voice Message
    // ==========================
    if (messageType === "audio" && audioId && from) {
      console.log("🎤 Voice Message Received");

      const filePath = await downloadWhatsAppAudio(audioId);

      console.log("📁 Audio Saved:", filePath);

      message = await speechToText(filePath);

      console.log("📝 Transcript:");
      console.log(message);
    }

    // ==========================
    // Common Pipeline (Text + Voice)
    // ==========================
    if (message && from) {
      console.log("👤 User:", message);

      // Resolve WhatsApp sender to an enrolled patient user (fail safely if not found or ambiguous)
      const patient = await findEnrolledPatientByWhatsApp(from);
      if (!patient) {
        // Safe fail. Preserve normal webhook acknowledgement behavior (200 OK)
        return res.sendStatus(200);
      }

      // AI Extract Health Data
      const extractedData = await extractHealthData(message);

      console.log("🧠 Extracted Health Record:");
      console.log(extractedData);

      if (!extractedData) {
        console.error(`❌ [Pipeline Error] AI extraction failed or returned an empty string for user message: "${message}"`);
      }

      // AI JSON → HealthRecord Objects using resolved patient's PAT-xxx ID
      const records = parseHealthRecord(
        extractedData,
        patient.patientId,
        "text",
        message,
        whatsappMessageId
      );

      console.log("📦 Parsed Health Records:");
      console.log(records);

      if (records.length > 0) {
        for (const record of records) {
          // Set additional attributes including hospitalId for tenant security
          const recordPayload: any = {
            ...record,
            hospitalId: patient.hospitalId,
          };

          // Duplicate Check
          let existingRecord = null;
          if (process.env.USE_MOCK_DATA === "true") {
            for (const pId in MOCK_RECORDS) {
              const match = MOCK_RECORDS[pId].find(
                (r: any) => r.whatsappMessageId === recordPayload.whatsappMessageId
              );
              if (match) {
                existingRecord = match;
                break;
              }
            }
          } else {
            existingRecord = await HealthRecord.findOne({
              whatsappMessageId: recordPayload.whatsappMessageId,
            });
          }

          if (existingRecord) {
            console.log("⚠️ Duplicate Record Skipped:", recordPayload.parameter);
            continue;
          }

          if (process.env.USE_MOCK_DATA === "true") {
            if (!MOCK_RECORDS[recordPayload.patientId]) {
              MOCK_RECORDS[recordPayload.patientId] = [];
            }
            MOCK_RECORDS[recordPayload.patientId].push(recordPayload);
          } else {
            await HealthRecord.create(recordPayload);
          }

          console.log("✅ Saved:", recordPayload.parameter);
        }

        await sendWhatsAppMessage(
          from,
          `✅ ${records.length} health record(s) saved successfully.`
        );

        console.log("✅ All Health Records Saved");
      } else {
        await sendWhatsAppMessage(
          from,
          "❌ Unable to understand your health record."
        );

        console.log("❌ Invalid Health Record");
      }
    }
  } catch (err) {
    console.error(err);
  }

  res.sendStatus(200);
};

async function sendWhatsAppMessage(to: string, message: string) {
  try {
    await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err?.message || err);
  }
}

// =========================
// Download WhatsApp Audio
// =========================
async function downloadWhatsAppAudio(mediaId: string) {
  console.log("📥 Downloading Media ID:", mediaId);
  // Step 1 - Get Media URL
  const mediaResponse = await axios.get(
    `https://graph.facebook.com/v23.0/${mediaId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    }
  );

  const mediaUrl = mediaResponse.data.url;

  // Step 2 - Download Audio
  const audioResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
    },
  });

  // Step 3 - Create uploads folder if not exists
  const folder = path.join(process.cwd(), "uploads");

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder);
  }

  // Step 4 - Save Audio
  const filePath = path.join(folder, `${mediaId}.ogg`);

  fs.writeFileSync(filePath, audioResponse.data);

  console.log("🎤 Voice Downloaded:", filePath);

  return filePath;
}
