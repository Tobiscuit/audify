import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function run() {
  const client = new PollyClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  });

  console.log(`Using Key: ${process.env.AWS_ACCESS_KEY_ID}`);
  console.log(`Region: ${process.env.AWS_REGION}`);

  try {
    const command = new SynthesizeSpeechCommand({
      Engine: "neural",
      OutputFormat: "mp3",
      Text: "Hello world testing usage tracking.",
      VoiceId: "Joanna"
    });

    console.log("Synthesizing...");
    const response = await client.send(command);
    console.log("Success! Request ID:", response.$metadata.requestId);
    console.log("Characters:", "Hello world testing usage tracking.".length);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
