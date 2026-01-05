import { synthesizeSpeech, calculateCreditsRequired, getVoiceType } from '@/lib/aws/polly';
import { uploadAudio, getPresignedUrl, generateAudioKey } from '@/lib/aws/s3';
import { VoiceId, Engine } from '@aws-sdk/client-polly';

export class AudioService {
  /**
   * Orchestrates the entire text-to-speech pipeline:
   * 1. Validates input
   * 2. Calls Polly
   * 3. Uploads to S3
   * 4. Returns URL
   */
  async synthesizeAndStore(params: {
    text: string;
    voiceId: string;
    engine: string;
    outputFormat: string;
    userId: string;
    lexiconNames?: string[];
  }) {
    // 1. Synthesize
    const audioStream = await synthesizeSpeech({
      text: params.text,
      voiceId: params.voiceId as VoiceId,
      engine: params.engine as Engine,
      outputFormat: (params.outputFormat as 'mp3' | 'ogg_vorbis') || 'mp3',
      lexiconNames: params.lexiconNames,
    });

    // 2. Generate Key
    const timestamp = Date.now();
    const format = (params.outputFormat as 'mp3' | 'ogg_vorbis') || 'mp3';
    const s3Key = generateAudioKey(params.userId, timestamp, format);

    // 3. Upload
    const contentType = format === 'ogg_vorbis' ? 'audio/ogg' : 'audio/mpeg';
    await uploadAudio(audioStream, s3Key, contentType);

    // 4. Get URL
    const audioUrl = await getPresignedUrl(s3Key);

    return { audioUrl, s3Key, format };
  }

  calculateCost(text: string, engine: string): number {
    const charCount = text.length;
    const voiceType = getVoiceType(engine as Engine);
    return calculateCreditsRequired(charCount, voiceType);
  }
}
