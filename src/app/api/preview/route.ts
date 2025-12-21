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
    const audioData = await synthesizeSpeech({
      text: PREVIEW_TEXT,
      voiceId: voiceId as VoiceId,
      engine: engine as Engine,
      outputFormat: 'mp3',
    });

    // Return audio directly (no S3 storage for previews)
    return new NextResponse(Buffer.from(audioData), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
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
