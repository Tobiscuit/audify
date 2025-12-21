import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy initialization - only create client when first used (at runtime, not build time)
let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _s3Client;
}

function getBucketName(): string {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not configured');
  }
  return process.env.AWS_S3_BUCKET_NAME;
}

export interface UploadResult {
  key: string;
  bucket: string;
}

export async function uploadAudio(
  audioData: Uint8Array,
  key: string,
  contentType: string = 'audio/mpeg'
): Promise<UploadResult> {
  const bucketName = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: audioData,
    ContentType: contentType,
  });

  await getS3Client().send(command);

  return {
    key,
    bucket: bucketName,
  };
}

export async function getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

export function generateAudioKey(userId: string, timestamp: number, format: 'mp3' | 'ogg_vorbis' = 'mp3'): string {
  const ext = format === 'ogg_vorbis' ? 'ogg' : 'mp3';
  return `audio/${userId}/${timestamp}.${ext}`;
}
