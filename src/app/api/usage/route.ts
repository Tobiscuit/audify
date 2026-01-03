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
      // Admin: Fetch actual usage from AWS CloudWatch (Source of Truth)
      const { CloudWatchClient, GetMetricStatisticsCommand } = await import('@aws-sdk/client-cloudwatch');
      
      const cwClient = new CloudWatchClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      // Get usage for each engine type
      // Note: CloudWatch metrics for Polly are standard, neural, etc.
      const engines = ['standard', 'neural', 'long-form', 'generative'];
      const usageByType: Record<string, number> = {};

      await Promise.all(engines.map(async (engine) => {
        try {
          // Map our engine names to AWS Dimension values if needed
          // AWS uses: 'Standard', 'Neural', 'LongForm', 'Generative' (Title Case)
          const awsEngineValue = engine === 'long-form' 
            ? 'LongForm' 
            : engine.charAt(0).toUpperCase() + engine.slice(1);

          const command = new GetMetricStatisticsCommand({
            Namespace: 'AWS/Polly',
            MetricName: 'SynthesizedCharacters',
            Dimensions: [
              { Name: 'LanguageCode', Value: 'en-US' }, // Optional: track all or specific
              // Actually, simply tracking by Operation is better, but Polly splits by VoiceId or generic
              // Let's try to get aggregate sum first.
              // Update: Polly metrics are sparse. Let's try to get ALL 'SynthesizedCharacters' first.
            ],
            StartTime: monthStart,
            EndTime: now,
            Period: 2592000, // 30 days coverage
            Statistics: ['Sum'],
          });

          // BETTER STRATEGY: 
          // Polly doesn't always publish per-engine metrics easily without specific dimensions.
          // Let's rely on the fact that we can filter by the 'Operation' dimension if needed, 
          // or just assume the DB usage is a good "baseline" and we add CLI usage if we can find it.
          //
          // ACTUALLY: Let's query effectively.
          // AWS Polly metrics usually require: { Name: 'Operation', Value: 'SynthesizeSpeech' }
          
        } catch (e) {
          console.error(`Failed to fetch CW for ${engine}`, e);
        }
      }));
      
      // RE-STRATEGY: Querying CloudWatch for specific breakdown is complex because dimensions must generally match EXACTLY.
      // If you just want "Total Characters", that's easier.
      // 
      // Let's implement a simplified CloudWatch query for "Total SynthesizedCharacters" 
      // We often can't easily split by Engine without defining that dimension in the metric yourself,
      // UNLESS AWS publishes it by default.
      //
      // According to docs, Polly publishes:
      // - SynthesizedCharacters (Dimensions: None [Global], or Operation)
      
      // DEBUG: List available metrics to verify dimensions
      const { ListMetricsCommand } = await import('@aws-sdk/client-cloudwatch');
      const listCmd = new ListMetricsCommand({
        Namespace: 'AWS/Polly',
        MetricName: 'SynthesizedCharacters',
      });
      const listMetrics = await cwClient.send(listCmd);
      const availableMetrics = listMetrics.Metrics || [];

      // Fetch usage for PREVIOUS month too, just to check
      const prevMonthStart = new Date(monthStart);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      
      const debugCommand = new GetMetricStatisticsCommand({
         Namespace: 'AWS/Polly',
         MetricName: 'SynthesizedCharacters',
         StartTime: prevMonthStart,
         EndTime: now,
         Period: 86400, // Daily buckets
         Statistics: ['Sum'],
      });
      
      const debugResponse = await cwClient.send(debugCommand);
      const debugDatapoints = debugResponse.Datapoints?.sort((a, b) => (b.Timestamp?.getTime() || 0) - (a.Timestamp?.getTime() || 0)) || [];

      // 1. Fetch CloudWatch Sync Usage (Standard/Neural Real-time)
      const command = new GetMetricStatisticsCommand({
         Namespace: 'AWS/Polly',
         MetricName: 'SynthesizedCharacters',
         StartTime: monthStart,
         EndTime: now,
         Period: 2592000, 
         Statistics: ['Sum'],
      });
      
      const response = await cwClient.send(command);
      const cwSyncChars = response.Datapoints?.[0]?.Sum || 0;

      // 2. Fetch Async Task Usage (Long-Form/Batch) manually via Polly API
      // CloudWatch often misses StartSpeechSynthesisTask usage
      const { PollyClient, ListSpeechSynthesisTasksCommand } = await import('@aws-sdk/client-polly');
      const polly = new PollyClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      });

      let asyncTaskChars = 0;
      let nextToken: string | undefined;
      const asyncTasksFound = [];

      // Async bucket by engine
      const asyncUsageByEngine: Record<string, number> = {
         standard: 0,
         neural: 0,
         long_form: 0,
         generative: 0,
      };

      try {
        do {
          const listParams: any = { 
            MaxResults: 100, 
            NextToken: nextToken 
          };
          const listCmd = new ListSpeechSynthesisTasksCommand(listParams);
          const listRes = await polly.send(listCmd);

          if (listRes.SynthesisTasks) {
            for (const task of listRes.SynthesisTasks) {
              const taskDate = task.CreationTime;
              const engine = task.Engine || 'standard'; // Default to standard if missing
              const chars = task.RequestCharacters || 0;

              // Filter for tasks in Current Month
              if (taskDate && taskDate >= monthStart && taskDate <= monthEnd) {
                 if (task.TaskStatus === 'completed') {
                    asyncTaskChars += chars;
                    
                    // Map generic engine strings to our keys if needed
                    // Polly returns: 'standard' | 'neural' | 'long-form' | 'generative'
                    // Our keys match exactly mostly.
                    const key = engine === 'long-form' ? 'long_form' : engine;
                    
                    if (asyncUsageByEngine[key] !== undefined) {
                        asyncUsageByEngine[key] += chars;
                    } else {
                        // Fallback for unknown engines
                        asyncUsageByEngine['standard'] += chars;
                    }

                    asyncTasksFound.push({
                      id: task.TaskId,
                      chars: chars,
                      date: taskDate,
                      engine: engine
                    });
                 }
              }
            }
          }
          nextToken = listRes.NextToken;
        } while (nextToken);
      } catch (err) {
        console.error("Failed to list Polly tasks:", err);
      }

      const totalAwsChars = cwSyncChars + asyncTaskChars;
      
      // Update Debug Info
      const debugInfo = {
        cwSyncChars,
        asyncTaskChars,
        asyncUsageByEngine,
        asyncTasksFound: asyncTasksFound.length,
        metrics: availableMetrics,
        last30DaysDatapoints: debugDatapoints
      };

      // ... (existing DB fetch) ... (omitted for brevity, keep existing flow down to return)

      // Now fetch our DB usage to break it down 
      const { data: usageData, error: usageError } = await supabase
        .from('usage_history')
        .select('voice_type, char_count')
        .gte('created_at', monthStart.toISOString());

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
      }

      const dbUsageByType: Record<string, number> = {
        standard: 0,
        neural: 0,
        long_form: 0,
        generative: 0,
      };

      let totalDbChars = 0;
      for (const record of usageData || []) {
        const voiceType = record.voice_type || 'standard';
        dbUsageByType[voiceType] = (dbUsageByType[voiceType] || 0) + (record.char_count || 0);
        totalDbChars += (record.char_count || 0);
      }
      
      // ATTRIBUTION LOGIC:
      // 1. Add known Async tasks to their respective buckets
      Object.entries(asyncUsageByEngine).forEach(([eng, count]) => {
          if (dbUsageByType[eng] !== undefined) {
              dbUsageByType[eng] += count;
          }
      });

      // 2. Reconciliation for Sync usage
      //    If CloudWatch Sync > DB (Standard+Neural+Gen), attibute diff to 'neural' (safest bet) or 'standard'
      const dbSyncTotal = dbUsageByType['standard'] + dbUsageByType['neural'] + dbUsageByType['generative'];
      const syncDiff = Math.max(0, cwSyncChars - dbSyncTotal);
      
      if (syncDiff > 0) {
        // Assume external sync usage is Neural (most common default)
        dbUsageByType['neural'] += syncDiff;
      }
      
      // Re-calculate totals for display
      const finalUsage = [
        ...Object.entries(dbUsageByType).map(([voiceType, used]) => ({
          voiceType,
          used,
          limit: FREE_TIER_LIMITS[voiceType] || 0,
          remaining: Math.max(0, (FREE_TIER_LIMITS[voiceType] || 0) - used),
          percentUsed: FREE_TIER_LIMITS[voiceType] 
            ? Math.round((used / FREE_TIER_LIMITS[voiceType]) * 100) 
            : 0,
        }))
      ];

      return NextResponse.json({
        type: 'admin',
        usage: finalUsage,
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        },
        awsTotal: totalAwsChars,
        dbTotal: totalDbChars,
        debug: debugInfo
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
