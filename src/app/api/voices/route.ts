import { NextRequest, NextResponse } from 'next/server';
import { listVoices } from '@/lib/aws/polly';
import type { Engine, LanguageCode } from '@aws-sdk/client-polly';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const engine = searchParams.get('engine') as Engine | undefined;
    const languageCode = searchParams.get('languageCode') as LanguageCode | undefined;

    const voices = await listVoices(engine, languageCode);

    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error listing voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
}
