import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand, Engine, VoiceId, OutputFormat, LanguageCode } from '@aws-sdk/client-polly';
import { Readable } from 'stream';

// Initialize Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Voice type to engine mapping
export const VOICE_TYPE_ENGINE_MAP: Record<string, Engine> = {
  standard: 'standard',
  neural: 'neural',
  generative: 'generative',
  long_form: 'long-form',
};

// Credit multipliers for different voice types
export const VOICE_CREDIT_MULTIPLIERS: Record<string, number> = {
  standard: 1,
  neural: 4,
  generative: 10,
  long_form: 35,
};

export interface SynthesizeOptions {
  text: string;
  voiceId: VoiceId;
  engine: Engine;
  outputFormat?: OutputFormat;
  languageCode?: LanguageCode;
}

export async function synthesizeSpeech(options: SynthesizeOptions): Promise<Readable> {
  const command = new SynthesizeSpeechCommand({
    Text: options.text,
    VoiceId: options.voiceId,
    Engine: options.engine,
    OutputFormat: options.outputFormat || 'mp3',
    LanguageCode: options.languageCode,
  });

  const response = await pollyClient.send(command);

  if (!response.AudioStream) {
    throw new Error('No audio stream returned from Polly');
  }

  // AWS SDK v3 returns a SdkStream, convert to Node Readable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Readable.fromWeb(response.AudioStream as any);
}

export interface VoiceInfo {
  voiceId: string;
  name: string;
  languageCode: string;
  languageName: string;
  gender: string;
  engine: string[];
}

export async function listVoices(engine?: Engine, languageCode?: LanguageCode): Promise<VoiceInfo[]> {
  const command = new DescribeVoicesCommand({
    Engine: engine,
    LanguageCode: languageCode,
  });

  const response = await pollyClient.send(command);

  return (response.Voices || []).map((voice) => ({
    voiceId: voice.Id || '',
    name: voice.Name || '',
    languageCode: voice.LanguageCode || '',
    languageName: voice.LanguageName || '',
    gender: voice.Gender || '',
    engine: voice.SupportedEngines || [],
  }));
}

export function getVoiceType(engine: Engine): string {
  const reverseMap: Record<string, string> = {
    'standard': 'standard',
    'neural': 'neural',
    'generative': 'generative',
    'long-form': 'long_form',
  };
  return reverseMap[engine] || 'standard';
}

export function calculateCreditsRequired(charCount: number, voiceType: string): number {
  const multiplier = VOICE_CREDIT_MULTIPLIERS[voiceType] || 1;
  return charCount * multiplier;
}
