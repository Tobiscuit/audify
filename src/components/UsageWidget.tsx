'use client';

import { useEffect, useState } from 'react';

interface AdminUsage {
  type: 'admin';
  usage: Array<{
    voiceType: string;
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  }>;
  period: { start: string; end: string };
  awsTotal?: number;
  dbTotal?: number;
  debug?: {
    availableMetrics: number;
    metrics: any[];
    last30DaysDatapoints: any[];
  };
}

interface UserUsage {
  type: 'user';
  credits: {
    remaining: number;
    usedThisMonth: number;
  };
  period: { start: string; end: string };
}

type UsageData = AdminUsage | UserUsage;

const VOICE_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  neural: 'Neural',
  long_form: 'Long-Form',
  generative: 'Generative',
};

const VOICE_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-blue-500',
  neural: 'bg-purple-500',
  long_form: 'bg-pink-500',
  generative: 'bg-orange-500',
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toString();
}

export default function UsageWidget() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/usage');
        if (!res.ok) throw new Error('Failed to fetch usage');
        const data = await res.json();
        setUsage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/10 rounded w-1/3"></div>
          <div className="h-2 bg-white/10 rounded"></div>
          <div className="h-2 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20">
        <p className="text-red-400 text-sm">Failed to load usage data</p>
      </div>
    );
  }

  if (usage.type === 'admin') {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">AWS Free Tier Usage</h3>
          <span className="text-xs text-gray-400">
            {new Date(usage.period.start).toLocaleDateString('en-US', { month: 'short' })}
          </span>
        </div>
        <div className="space-y-4">
          {usage.usage.map((item) => (
            <div key={item.voiceType}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">{VOICE_TYPE_LABELS[item.voiceType] || item.voiceType}</span>
                <span className="text-gray-400">
                  {formatNumber(item.used)} / {formatNumber(item.limit)}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${VOICE_TYPE_COLORS[item.voiceType] || 'bg-gray-500'} transition-all duration-500`}
                  style={{ width: `${Math.min(100, item.percentUsed)}%` }}
                />
              </div>
              {item.percentUsed >= 80 && (
                <p className="text-xs text-yellow-400 mt-1">
                  {item.percentUsed >= 100 ? '⚠️ Limit reached!' : '⚠️ Approaching limit'}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Free tier: 12 months from first Polly request
        </p>

        {/* Debug Info */}
        <div className="mt-4 pt-4 border-t border-white/10 text-xs font-mono text-gray-400">
          <p className="font-bold text-gray-300 mb-2">Debug Info:</p>
          <div className="space-y-1">
            <p>AWS Total: {usage.awsTotal?.toLocaleString() ?? '?'}</p>
            <p>DB Total: {usage.dbTotal?.toLocaleString() ?? '?'}</p>
            <p>Metrics Found: {usage.debug?.availableMetrics ?? 0}</p>
            <details>
              <summary className="cursor-pointer hover:text-white">Raw Metrics ({usage.debug?.metrics?.length})</summary>
              <pre className="mt-2 p-2 bg-black/30 rounded overflow-auto max-h-40">
                {JSON.stringify(usage.debug?.metrics, null, 2)}
              </pre>
            </details>
            <details>
              <summary className="cursor-pointer hover:text-white">Daily Datapoints ({usage.debug?.last30DaysDatapoints?.length})</summary>
              <div className="mt-2 space-y-1">
                {usage.debug?.last30DaysDatapoints?.map((dp: any, i: number) => (
                  <p key={i}>
                    {new Date(dp.Timestamp).toLocaleDateString()}: {dp.Sum?.toLocaleString()} chars
                  </p>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Regular user view
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Your Credits</h3>
      <div className="text-center">
        <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          {formatNumber(usage.credits.remaining)}
        </p>
        <p className="text-gray-400 text-sm mt-1">credits remaining</p>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Used this month</span>
          <span className="text-gray-300">{formatNumber(usage.credits.usedThisMonth)}</span>
        </div>
      </div>
      <a
        href="/dashboard/credits"
        className="mt-4 block text-center py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl text-white text-sm font-medium transition-colors"
      >
        Buy More Credits
      </a>
    </div>
  );
}
