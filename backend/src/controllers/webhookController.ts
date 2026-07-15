import { speechToText } from "../services/groqSpeechService";
import HealthRecord from "../models/HealthRecord";
import { parseHealthRecord } from "../utils/healthRecordParser";
import axios from "axios";
import fs from "fs";
import path from "path";
import { extractHealthData } from "../services/openaiService";
import { Request, Response } from "express";

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

      // AI Extract Health Data
const extractedData = await extractHealthData(message);

console.log("🧠 Extracted Health Record:");
console.log(extractedData);

// AI JSON → HealthRecord Objects
const records = parseHealthRecord(
  extractedData,
  from,
  "text",
  message,
  whatsappMessageId
);

console.log("📦 Parsed Health Records:");
console.log(records);

if (records.length > 0) {

  for (const record of records) {

  // Duplicate Check
  const existingRecord = await HealthRecord.findOne({
  whatsappMessageId: record.whatsappMessageId,
});

  if (existingRecord) {
    console.log("⚠️ Duplicate Record Skipped:", record.parameter);
    continue;
  }

  await HealthRecord.create(record);

  console.log("✅ Saved:", record.parameter);
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