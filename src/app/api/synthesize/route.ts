import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import { isAdminUser } from '@/lib/auth/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Domain Services
import { BillingService } from '@/services/billing';
import { AudioService } from '@/services/audio';
import { LoggingService } from '@/services/logging';
import { SynthesizeRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate & Setup Context
    const { user, authType, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      if (authError?.includes('Server misconfigured')) {
          return NextResponse.json({ error: authError }, { status: 500 });
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Initialize Infrastructure (DB Client)
    let supabase;
    if (authType === 'api_key') {
        // Use Admin Client to bypass RLS for API Key auth
        supabase = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    } else {
        // Use Standard Client (Cookies)
        supabase = await createClient();
    }

    // 3. Initialize Domain Services (Dependency Injection)
    const billing = new BillingService(supabase);
    const audio = new AudioService();
    const logger = new LoggingService(supabase);

    // 4. Parse & Validate Input
    const body: SynthesizeRequest = await request.json();
    const { text, voiceId, engine, outputFormat } = body;

    if (!text || !voiceId || !engine) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 5. Calculate Cost
    const cost = audio.calculateCost(text, engine);
    const isAdmin = isAdminUser(user.email || '');

    // 6. Process Liability (Billing Gate)
    let remainingCredits = 0;
    try {
        remainingCredits = await billing.checkAndDeductCredits(user.id, cost, isAdmin);
    } catch (e: any) {
        return NextResponse.json(
            { error: e.message, creditsRequired: cost }, 
            { status: 402 } 
        );
    }

    // 7a. Fetch Active Lexicons
    // We fetch all lexicons for this user to apply globally.
    // In future, we could allow selecting specific ones per request.
    const { data: lexicons } = await supabase
        .from('lexicons')
        .select('name')
        .eq('user_id', user.id);
    
    const lexiconNames = lexicons?.map(l => l.name) || [];

    // 7b. Execute Business Logic (Synthesis)
    const { audioUrl, s3Key, format } = await audio.synthesizeAndStore({
        text,
        voiceId,
        engine,
        outputFormat: outputFormat || 'mp3',
        userId: user.id,
        lexiconNames
    });

    // 8. Audit Logging (Async/Fire-and-forget)
    await logger.logSynthesizeUsage({
        userId: user.id,
        voiceId,
        engine,
        charCount: text.length,
        creditsUsed: isAdmin ? 0 : cost,
        s3Key
    });

    // 9. Return Response
    return NextResponse.json({
      audioUrl,
      audioId: s3Key,
      creditsUsed: isAdmin ? 0 : cost,
      remainingCredits: isAdmin ? remainingCredits + cost : remainingCredits, // Adjust for display if needed
    });

  } catch (error) {
    console.error('Synthesize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
