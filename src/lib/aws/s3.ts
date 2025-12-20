import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

export interface UploadResult {
  key: string;
  bucket: string;
}

export async function uploadAudio(
  audioStream: Readable,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  // Convert stream to buffer for S3 upload
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    key,
    bucket: BUCKET_NAME,
  };
}

export async function getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export function generateAudioKey(userId: string, timestamp: number): string {
  return `audio/${userId}/${timestamp}.mp3`;
}
