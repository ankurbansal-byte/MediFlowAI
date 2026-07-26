import fs from "fs";
import path from "path";
import axios from "axios";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "dummy-key",
  baseURL: "https://api.groq.com/openai/v1",
});

export class VoiceError extends Error {
  constructor(
    public code:
      | "CONFIG_MISSING"
      | "UNSUPPORTED_AUDIO"
      | "AUDIO_TOO_LARGE"
      | "EMPTY_TRANSCRIPT"
      | "TRANSCRIPTION_FAILED"
      | "DOWNLOAD_FAILED",
    message: string
  ) {
    super(message);
    this.name = "VoiceError";
  }
}

// Bounded network timeouts (15 seconds)
const SECURE_TIMEOUT = 15000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB limit

export async function speechToText(filePath: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "dummy-key") {
    throw new VoiceError("CONFIG_MISSING", "Groq API key is not configured.");
  }

  try {
    const transcription = await client.audio.transcriptions.create(
      {
        file: fs.createReadStream(filePath),
        model: "whisper-large-v3",
        response_format: "text",
      },
      {
        timeout: SECURE_TIMEOUT,
      }
    );

    return (transcription as string) || "";
  } catch (error: any) {
    console.error("========== GROQ SPEECH ERROR ==========");
    console.error(error?.message || error);
    console.error("======================================");
    throw new VoiceError(
      "TRANSCRIPTION_FAILED",
      "Failed to transcribe audio via Groq Whisper API."
    );
  }
}

export async function handleVoiceNoteIngestion(
  mediaId: string,
  mimeType?: string
): Promise<string> {
  // 1. Check configuration
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "dummy-key") {
    throw new VoiceError(
      "CONFIG_MISSING",
      "Groq Speech API key is missing or invalid."
    );
  }

  // 2. Unsupported audio format early check
  if (mimeType && !mimeType.toLowerCase().startsWith("audio/")) {
    throw new VoiceError(
      "UNSUPPORTED_AUDIO",
      `Unsupported audio MIME type: ${mimeType}`
    );
  }

  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    throw new VoiceError(
      "DOWNLOAD_FAILED",
      "WhatsApp authentication token is missing."
    );
  }

  let filePath: string | null = null;

  try {
    // 3. Secure WhatsApp Media Metadata Retrieval
    let metadataResponse;
    try {
      metadataResponse = await axios.get(
        `https://graph.facebook.com/v23.0/${mediaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: SECURE_TIMEOUT,
        }
      );
    } catch (metaErr: any) {
      console.error(
        `❌ Meta metadata retrieval failed for ID ${mediaId}:`,
        metaErr.message || metaErr
      );
      throw new VoiceError(
        "DOWNLOAD_FAILED",
        "Failed to retrieve audio metadata from WhatsApp Meta API."
      );
    }

    const {
      url: mediaUrl,
      mime_type: metaMimeType,
      file_size: metaFileSize,
    } = metadataResponse.data;

    // Validate MIME type from metadata
    if (metaMimeType && !metaMimeType.toLowerCase().startsWith("audio/")) {
      throw new VoiceError(
        "UNSUPPORTED_AUDIO",
        `Unsupported audio metadata MIME type: ${metaMimeType}`
      );
    }

    // Validate File Size from metadata
    if (metaFileSize && metaFileSize > MAX_FILE_SIZE) {
      throw new VoiceError(
        "AUDIO_TOO_LARGE",
        `Audio file size ${metaFileSize} exceeds safety limit of 5MB.`
      );
    }

    // 4. Secure WhatsApp Media Download
    let audioResponse;
    try {
      audioResponse = await axios.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: { Authorization: `Bearer ${token}` },
        timeout: SECURE_TIMEOUT,
      });
    } catch (dlErr: any) {
      console.error(
        `❌ Meta media download failed for URL ${mediaUrl}:`,
        dlErr.message || dlErr
      );
      throw new VoiceError(
        "DOWNLOAD_FAILED",
        "Failed to download audio content from WhatsApp Meta API."
      );
    }

    const buffer = audioResponse.data;
    if (!buffer || buffer.byteLength === 0) {
      throw new VoiceError(
        "DOWNLOAD_FAILED",
        "Downloaded empty audio payload."
      );
    }

    // Post-download size check (in case metadata didn't have size)
    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new VoiceError(
        "AUDIO_TOO_LARGE",
        `Audio payload size ${buffer.byteLength} exceeds limit of 5MB.`
      );
    }

    // 5. Save temporarily with unique name
    const folder = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    filePath = path.join(folder, `${mediaId}.ogg`);
    fs.writeFileSync(filePath, buffer);

    // 6. Speech to text transcription
    const transcriptText = await speechToText(filePath);

    // 7. Validate transcript
    const trimmed = transcriptText.trim();
    if (!trimmed) {
      throw new VoiceError(
        "EMPTY_TRANSCRIPT",
        "Audio transcription returned an empty transcript."
      );
    }

    return trimmed;
  } finally {
    // 8. Privacy: Short-lived temporary file cleanup on both success and failure
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(
          `🧹 Privacy Cleanup: Successfully deleted temporary voice file at ${filePath}`
        );
      } catch (cleanupErr: any) {
        console.error(
          `⚠️ Failed to delete temporary voice file at ${filePath}:`,
          cleanupErr.message || cleanupErr
        );
      }
    }
  }
}
