import { SupabaseClient } from '@supabase/supabase-js';

export class LoggingService {
  constructor(private supabase: SupabaseClient) {}

  async logSynthesizeUsage(params: {
    userId: string;
    voiceId: string;
    engine: string;
    charCount: number;
    creditsUsed: number;
    s3Key: string;
  }) {
    const { 
      userId, 
      voiceId, 
      engine, 
      charCount, 
      creditsUsed, 
      s3Key 
    } = params;
    
    // We determine voice_type from engine (using imported helper logic or simple map)
    const voiceType = engine === 'long-form' ? 'long_form' : engine;

    const { error } = await this.supabase
      .from('usage_history')
      .insert({
        user_id: userId,
        voice_id: voiceId,
        voice_type: voiceType,
        char_count: charCount,
        credits_used: creditsUsed,
        s3_key: s3Key,
      } as never);

    if (error) {
      console.error('Failed to log usage:', error);
      // We don't throw here. Logging failure shouldn't crash the user request.
    }
  }
}
