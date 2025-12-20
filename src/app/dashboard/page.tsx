'use client';

import { useState, useEffect, useRef } from 'react';
import type { Voice } from '@/types';
import { VOICE_CREDIT_MULTIPLIERS } from '@/lib/aws/polly';
import UsageWidget from '@/components/UsageWidget';

// Voice type labels for UI
const VOICE_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  standard: { label: 'Standard', description: 'Basic TTS, lowest cost' },
  neural: { label: 'Neural', description: 'Natural-sounding voices' },
  generative: { label: 'Generative', description: 'Most expressive, conversational' },
  'long-form': { label: 'Long-Form', description: 'Optimized for audiobooks' },
};

export default function DashboardPage() {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string>('generative');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Calculate estimated credits
  const charCount = text.length;
  const voiceType = selectedEngine === 'long-form' ? 'long_form' : selectedEngine;
  const multiplier = VOICE_CREDIT_MULTIPLIERS[voiceType] || 1;
  const estimatedCredits = charCount * multiplier;

  // Fetch voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Filter voices when engine changes
  useEffect(() => {
    if (voices.length > 0 && selectedEngine) {
      const engineVoices = voices.filter(v => v.engines.includes(selectedEngine));
      if (!selectedVoice || !engineVoices.find(v => v.voiceId === selectedVoice.voiceId)) {
        setSelectedVoice(engineVoices[0] || null);
      }
    }
  }, [selectedEngine, voices]);

  async function fetchVoices() {
    setLoading(true);
    try {
      const res = await fetch('/api/voices');
      const data = await res.json();
      setVoices(data.voices || []);
    } catch (err) {
      console.error('Failed to fetch voices:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!text.trim() || !selectedVoice) return;

    setGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.voiceId,
          engine: selectedEngine,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient credits. You need ${data.creditsRequired.toLocaleString()} credits but have ${data.currentCredits.toLocaleString()}.`);
        } else {
          setError(data.error || 'Failed to generate audio');
        }
        return;
      }

      setAudioUrl(data.audioUrl);
      setCreditsUsed(data.creditsUsed);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!audioUrl) return;
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `audify-${Date.now()}.mp3`;
    link.click();
  }

  const availableEngines = selectedVoice 
    ? selectedVoice.engines 
    : ['standard', 'neural', 'generative', 'long-form'];

  const filteredVoices = voices.filter(v => v.engines.includes(selectedEngine));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar - Usage Widget */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="sticky top-8">
          <UsageWidget />
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 order-1 lg:order-2 space-y-8">
        {/* Header */}
        <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Generate Audio
        </h1>
        <p className="text-gray-400">
          Enter your text and choose a voice to create natural-sounding audio
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
        {/* Text Input */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Your Text
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the text you want to convert to speech..."
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
          <div className="flex justify-between mt-2 text-sm text-gray-400">
            <span>{charCount.toLocaleString()} characters</span>
            <span>Estimated: {estimatedCredits.toLocaleString()} credits</span>
          </div>
        </div>

        {/* Voice Type Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Voice Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(VOICE_TYPE_LABELS).map(([engine, { label, description }]) => (
              <button
                key={engine}
                onClick={() => setSelectedEngine(engine)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedEngine === engine
                    ? 'bg-purple-500/20 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                <div className="font-medium">{label}</div>
                <div className="text-xs mt-1 opacity-70">{description}</div>
                <div className="text-xs mt-2 text-purple-400">
                  {VOICE_CREDIT_MULTIPLIERS[engine === 'long-form' ? 'long_form' : engine]}x credits
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Voice
          </label>
          {loading ? (
            <div className="text-gray-400">Loading voices...</div>
          ) : (
            <select
              value={selectedVoice?.voiceId || ''}
              onChange={(e) => {
                const voice = filteredVoices.find(v => v.voiceId === e.target.value);
                setSelectedVoice(voice || null);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {filteredVoices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId} className="bg-gray-900">
                  {voice.name} ({voice.languageName}) - {voice.gender}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !text.trim() || !selectedVoice}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating...' : 'Generate Audio'}
        </button>

        {/* Audio Player */}
        {audioUrl && (
          <div className="mt-6 bg-white/5 rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300 font-medium">Generated Audio</span>
              <span className="text-purple-400 text-sm">
                {creditsUsed.toLocaleString()} credits used
              </span>
            </div>
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              className="w-full"
            />
            <button
              onClick={handleDownload}
              className="mt-4 w-full bg-white/10 text-white font-medium py-3 px-4 rounded-xl hover:bg-white/20 transition-colors"
            >
              Download MP3
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
