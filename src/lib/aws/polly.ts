import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand, Engine, VoiceId, OutputFormat, LanguageCode } from '@aws-sdk/client-polly';

// Lazy initialization - only create client when first used (at runtime, not build time)
let _pollyClient: PollyClient | null = null;

function getPollyClient(): PollyClient {
  if (!_pollyClient) {
    _pollyClient = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _pollyClient;
}

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
  lexiconNames?: string[];
}

export async function synthesizeSpeech(options: SynthesizeOptions): Promise<Uint8Array> {
  const command = new SynthesizeSpeechCommand({
    Text: options.text,
    VoiceId: options.voiceId,
    Engine: options.engine,
    OutputFormat: options.outputFormat || 'mp3',
    LanguageCode: options.languageCode,
    LexiconNames: options.lexiconNames,
  });

  const response = await getPollyClient().send(command);

  if (!response.AudioStream) {
    throw new Error('No audio stream returned from Polly');
  }

  // AWS SDK v3: use transformToByteArray() to get the audio data
  const audioData = await response.AudioStream.transformToByteArray();
  return audioData;
}

export interface VoiceInfo {
  voiceId: string;
  name: string;
  languageCode: string;
  languageName: string;
  gender: string;
  engines: string[];
}

export async function listVoices(engine?: Engine, languageCode?: LanguageCode): Promise<VoiceInfo[]> {
  const command = new DescribeVoicesCommand({
    Engine: engine,
    LanguageCode: languageCode,
  });

  const response = await getPollyClient().send(command);

  return (response.Voices || []).map((voice) => ({
    voiceId: voice.Id || '',
    name: voice.Name || '',
    languageCode: voice.LanguageCode || '',
    languageName: voice.LanguageName || '',
    gender: voice.Gender || '',
    engines: voice.SupportedEngines || [],
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
