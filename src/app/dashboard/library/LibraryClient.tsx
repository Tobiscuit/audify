'use client';

import { useState } from 'react';

interface HistoryItem {
  id: string;
  voice_id: string;
  voice_type: string;
  char_count: number;
  credits_used: number;
  s3_key: string;
  created_at: string;
  audioUrl: string | null;
}

interface HistoryClientProps {
  history: HistoryItem[];
}

const VOICE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-blue-500' },
  neural: { label: 'Neural', color: 'bg-purple-500' },
  generative: { label: 'Generative', color: 'bg-orange-500' },
  long_form: { label: 'Long-Form', color: 'bg-pink-500' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function LibraryClient({ history }: HistoryClientProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center">
        <div className="text-6xl mb-4">🎙️</div>
        <h2 className="text-xl font-semibold text-white mb-2">No audio yet</h2>
        <p className="text-gray-400">
          Generate your first audio to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => {
        const voiceInfo = VOICE_TYPE_LABELS[item.voice_type] || { label: item.voice_type, color: 'bg-gray-500' };
        
        return (
          <div
            key={item.id}
            className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${voiceInfo.color} text-white text-xs font-medium px-2 py-1 rounded-full`}>
                    {voiceInfo.label}
                  </span>
                  <span className="text-gray-400 text-sm">{item.voice_id}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatNumber(item.char_count)} chars</span>
                  <span>•</span>
                  <span>{item.credits_used} credits</span>
                  <span>•</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex items-center gap-2">
                {item.audioUrl ? (
                  <>
                    <audio
                      id={`audio-${item.id}`}
                      src={item.audioUrl}
                      onPlay={() => setPlayingId(item.id)}
                      onPause={() => setPlayingId(null)}
                      onEnded={() => setPlayingId(null)}
                      className="hidden"
                    />
                    <button
                      onClick={() => {
                        const audio = document.getElementById(`audio-${item.id}`) as HTMLAudioElement;
                        if (playingId === item.id) {
                          audio.pause();
                        } else {
                          // Pause any currently playing audio
                          document.querySelectorAll('audio').forEach((a) => a.pause());
                          audio.play();
                        }
                      }}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 p-3 rounded-xl transition-colors"
                    >
                      {playingId === item.id ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <a
                      href={item.audioUrl}
                      download
                      className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Expired</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
