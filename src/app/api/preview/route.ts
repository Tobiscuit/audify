import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/aws/polly';
import type { Engine, VoiceId } from '@aws-sdk/client-polly';

// Short sample text for previewing voices
const PREVIEW_TEXT = "Hello! This is a preview of how I sound. I hope you like my voice!";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voiceId, engine } = body;

    if (!voiceId || !engine) {
      return NextResponse.json(
        { error: 'Missing voiceId or engine' },
        { status: 400 }
      );
    }

    // Generate preview audio (no auth required, no credits charged)
    const audioStream = await synthesizeSpeech({
      text: PREVIEW_TEXT,
      voiceId: voiceId as VoiceId,
      engine: engine as Engine,
      outputFormat: 'mp3',
    });

    // Collect stream into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);

    // Return audio directly (no S3 storage for previews)
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
