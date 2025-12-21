import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';
import { synthesizeSpeech, getVoiceType, calculateCreditsRequired } from '@/lib/aws/polly';
import { uploadAudio, generateAudioKey, getPresignedUrl } from '@/lib/aws/s3';
import type { Engine, VoiceId } from '@aws-sdk/client-polly';

// Concurrency limits per voice type
const CONCURRENCY_LIMITS: Record<string, number> = {
  standard: 20, // Conservative (limit is 80)
  neural: 8,    // Limit is 18, stay safe
  generative: 8, // Limit is 26, stay safe
  long_form: 8,  // Limit is 26, stay safe
};

interface Section {
  id: number;
  title: string;
  content: string;
  charCount: number;
}

interface GenerateRequest {
  sections: Section[];
  voiceId: string;
  engine: string;
  outputFormat: 'mp3' | 'ogg_vorbis';
}

// Process sections in batches with rate limiting
async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<R>,
  delayMs: number = 1000
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => processor(item, i + j))
    );
    results.push(...batchResults);
    
    // Delay between batches (except last)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateRequest = await request.json();
    const { sections, voiceId, engine, outputFormat } = body;

    if (!sections?.length || !voiceId || !engine) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate total credits
    const voiceType = getVoiceType(engine as Engine);
    const totalChars = sections.reduce((sum, s) => sum + s.charCount, 0);
    const totalCredits = calculateCreditsRequired(totalChars, voiceType);

    // Check admin or credits
    const isAdmin = isAdminUser(user.email);
    
    if (!isAdmin) {
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      const currentCredits = (userData as { credits: number } | null)?.credits || 0;
      
      if (currentCredits < totalCredits) {
        return NextResponse.json(
          { 
            error: 'Insufficient credits', 
            creditsRequired: totalCredits,
            currentCredits,
          },
          { status: 402 }
        );
      }
    }

    // Determine batch size based on voice type
    const batchSize = CONCURRENCY_LIMITS[voiceType] || 8;
    const format = outputFormat || 'mp3';
    const contentType = format === 'ogg_vorbis' ? 'audio/ogg' : 'audio/mpeg';
    const ext = format === 'ogg_vorbis' ? 'ogg' : 'mp3';

    // Process sections in batches
    const timestamp = Date.now();
    const results = await processBatches(
      sections,
      batchSize,
      async (section, index) => {
        try {
          // Synthesize audio
          const audioStream = await synthesizeSpeech({
            text: section.content,
            voiceId: voiceId as VoiceId,
            engine: engine as Engine,
            outputFormat: format,
          });

          // Upload to S3
          const s3Key = `batch/${user.id}/${timestamp}/section-${index.toString().padStart(3, '0')}.${ext}`;
          await uploadAudio(audioStream, s3Key, contentType);

          // Get presigned URL
          const audioUrl = await getPresignedUrl(s3Key);

          return {
            id: section.id,
            title: section.title,
            charCount: section.charCount,
            s3Key,
            audioUrl,
            success: true,
          };
        } catch (error) {
          console.error(`Failed to process section ${section.id}:`, error);
          return {
            id: section.id,
            title: section.title,
            charCount: section.charCount,
            error: 'Generation failed',
            success: false,
          };
        }
      }
    );

    // Deduct credits (only for successful sections, skip for admin)
    const successfulChars = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.charCount, 0);
    const creditsUsed = isAdmin ? 0 : calculateCreditsRequired(successfulChars, voiceType);

    if (!isAdmin && creditsUsed > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      const currentCredits = (userData as { credits: number } | null)?.credits || 0;
      
      await supabase
        .from('users')
        .update({ credits: currentCredits - creditsUsed } as never)
        .eq('id', user.id);
    }

    // Record in usage history
    for (const result of results.filter(r => r.success)) {
      await supabase.from('usage_history').insert({
        user_id: user.id,
        voice_id: voiceId,
        voice_type: voiceType,
        char_count: result.charCount,
        credits_used: isAdmin ? 0 : calculateCreditsRequired(result.charCount, voiceType),
        s3_key: result.s3Key,
      } as never);
    }

    return NextResponse.json({
      success: true,
      totalSections: sections.length,
      successfulSections: results.filter(r => r.success).length,
      creditsUsed,
      results,
    });
  } catch (error) {
    console.error('Batch generate error:', error);
    return NextResponse.json({ error: 'Batch generation failed' }, { status: 500 });
  }
}
