import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function speechToText(filePath: string): Promise<string> {
  try {
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-large-v3",
      response_format: "text",
    });

    return transcription as string;
  } catch (error) {
    console.error("========== GROQ SPEECH ERROR ==========");
    console.error(error);
    console.error("======================================");

    return "";
  }
}