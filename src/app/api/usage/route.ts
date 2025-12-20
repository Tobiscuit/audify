import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/admin';

// AWS Polly Free Tier limits (per month, 12 months from first use)
const FREE_TIER_LIMITS: Record<string, number> = {
  standard: 5_000_000,
  neural: 1_000_000,
  long_form: 500_000,
  generative: 100_000,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = isAdminUser(user.email);

    // Get current month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (isAdmin) {
      // Admin: Show usage against AWS free tier limits (all users combined for this AWS account)
      const { data: usageData, error: usageError } = await supabase
        .from('usage_history')
        .select('voice_type, char_count')
        .gte('created_at', monthStart.toISOString());

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
      }

      // Aggregate by voice type
      const usageByType: Record<string, number> = {
        standard: 0,
        neural: 0,
        long_form: 0,
        generative: 0,
      };

      for (const record of usageData || []) {
        const voiceType = record.voice_type || 'standard';
        usageByType[voiceType] = (usageByType[voiceType] || 0) + (record.char_count || 0);
      }

      return NextResponse.json({
        type: 'admin',
        usage: Object.entries(usageByType).map(([voiceType, used]) => ({
          voiceType,
          used,
          limit: FREE_TIER_LIMITS[voiceType] || 0,
          remaining: Math.max(0, (FREE_TIER_LIMITS[voiceType] || 0) - used),
          percentUsed: FREE_TIER_LIMITS[voiceType] 
            ? Math.round((used / FREE_TIER_LIMITS[voiceType]) * 100) 
            : 0,
        })),
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        },
      });
    } else {
      // Regular user: Show credit balance and this month's usage
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single();

      const credits = (userData as { credits: number } | null)?.credits || 0;

      // Get user's monthly usage
      const { data: usageData, error: usageError } = await supabase
        .from('usage_history')
        .select('credits_used')
        .eq('user_id', user.id)
        .gte('created_at', monthStart.toISOString());

      const monthlyCreditsUsed = (usageData || []).reduce(
        (sum, record) => sum + ((record as { credits_used: number }).credits_used || 0), 
        0
      );

      return NextResponse.json({
        type: 'user',
        credits: {
          remaining: credits,
          usedThisMonth: monthlyCreditsUsed,
        },
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        },
      });
    }
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
