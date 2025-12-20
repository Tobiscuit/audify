import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';
import { synthesizeSpeech, calculateCreditsRequired, getVoiceType } from '@/lib/aws/polly';
import { uploadAudio, getPresignedUrl, generateAudioKey } from '@/lib/aws/s3';
import type { SynthesizeRequest, SynthesizeResponse } from '@/types';
import { VoiceId, Engine } from '@aws-sdk/client-polly';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SynthesizeRequest = await request.json();
    const { text, voiceId, engine } = body;

    if (!text || !voiceId || !engine) {
      return NextResponse.json(
        { error: 'Missing required fields: text, voiceId, engine' },
        { status: 400 }
      );
    }

    // Calculate character count and credits required
    const charCount = text.length;
    const voiceType = getVoiceType(engine as Engine);
    const creditsRequired = calculateCreditsRequired(charCount, voiceType);

    // Check if user is admin (free bypass)
    const isAdmin = isAdminUser(user.email);

    // Get user's current credits from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (userError) {
      // User doesn't exist in our table yet, create them
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          credits: 0,
          is_admin: isAdmin,
        } as never);

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json(
          { error: 'Failed to initialize user account' },
          { status: 500 }
        );
      }

      // If not admin and no credits, return payment required
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Insufficient credits', creditsRequired, currentCredits: 0 },
          { status: 402 }
        );
      }
    }

    const currentCredits = (userData as { credits: number } | null)?.credits || 0;

    // Check credits (skip for admin)
    if (!isAdmin && currentCredits < creditsRequired) {
      return NextResponse.json(
        { error: 'Insufficient credits', creditsRequired, currentCredits },
        { status: 402 }
      );
    }

    // Synthesize speech with AWS Polly
    const audioStream = await synthesizeSpeech({
      text,
      voiceId: voiceId as VoiceId,
      engine: engine as Engine,
    });

    // Generate unique key for S3
    const timestamp = Date.now();
    const s3Key = generateAudioKey(user.id, timestamp);

    // Upload to S3
    await uploadAudio(audioStream, s3Key);

    // Get presigned URL for playback
    const audioUrl = await getPresignedUrl(s3Key);

    // Deduct credits (skip for admin)
    if (!isAdmin) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: currentCredits - creditsRequired } as never)
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating credits:', updateError);
      }
    }

    // Log usage history
    const { error: historyError } = await supabase
      .from('usage_history')
      .insert({
        user_id: user.id,
        voice_id: voiceId,
        voice_type: voiceType,
        char_count: charCount,
        credits_used: isAdmin ? 0 : creditsRequired,
        s3_key: s3Key,
      } as never);

    if (historyError) {
      console.error('Error logging usage:', historyError);
    }

    const response: SynthesizeResponse = {
      audioUrl,
      audioId: s3Key,
      creditsUsed: isAdmin ? 0 : creditsRequired,
      remainingCredits: isAdmin ? currentCredits : currentCredits - creditsRequired,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Synthesize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
