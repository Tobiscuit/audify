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

// Audio format labels for UI
const FORMAT_LABELS: Record<string, { label: string; description: string; icon: string }> = {
  mp3: { 
    label: 'MP3', 
    description: 'Universal compatibility, smaller files', 
    icon: '🎵' 
  },
  ogg_vorbis: { 
    label: 'OGG', 
    description: 'Higher quality, open format, great for chapters', 
    icon: '🎧' 
  },
};

export default function DashboardPage() {
  // Input mode: 'type' or 'upload'
  const [inputMode, setInputMode] = useState<'type' | 'upload'>('upload');
  const [useAI, setUseAI] = useState(false);
  
  // Text mode states
  const [text, setText] = useState('');
  
  // File upload mode states
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [sections, setSections] = useState<Array<{id: number; title: string; level: number; charCount: number; preview: string}>>([]);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  
  // Voice settings
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string>('generative');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [selectedFormat, setSelectedFormat] = useState<string>('mp3');
  
  // Generation states
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number>(0);
  
  // Preview states
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const engineVoices = voices.filter(v => v.engines?.includes(selectedEngine));
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
          outputFormat: selectedFormat,
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
    const ext = selectedFormat === 'ogg_vorbis' ? 'ogg' : 'mp3';
    link.download = `audify-${Date.now()}.${ext}`;
    link.click();
  }

  async function handleFileUpload(uploadedFile: File) {
    setFile(uploadedFile);
    setParsing(true);
    setError(null);
    setSections([]);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('useAI', useAI.toString());

      const res = await fetch('/api/batch/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to parse file');
        return;
      }

      // Show warning if AI detection fell back
      if (data.warning) {
        setError(data.warning);
      }

      setSections(data.sections);
      setSelectedSections(new Set(data.sections.map((s: {id: number}) => s.id)));
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setParsing(false);
    }
  }

  function toggleSection(id: number) {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSections(newSelected);
  }

  const availableEngines = selectedVoice 
    ? selectedVoice.engines 
    : ['standard', 'neural', 'generative', 'long-form'];

  // Get voices that support the selected engine
  const engineVoices = voices.filter(v => v.engines?.includes(selectedEngine));
  
  // Get unique languages from voices that support the selected engine
  const languages = [...new Set(engineVoices.map(v => v.languageCode))].sort();
  
  // Filter voices by engine AND language
  const filteredVoices = engineVoices.filter(v => v.languageCode === selectedLanguage);

  // Calculate total chars for file mode
  const totalSectionChars = sections
    .filter(s => selectedSections.has(s.id))
    .reduce((sum, s) => sum + s.charCount, 0);
  const fileEstimatedCredits = totalSectionChars * multiplier;

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
            Upload a file or type text to create natural-sounding audio
          </p>
        </div>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
        {/* Input Mode Tabs + AI Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('upload')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                inputMode === 'upload'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
            >
              📁 Upload File
            </button>
            <button
              onClick={() => setInputMode('type')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                inputMode === 'type'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
            >
              ✏️ Type Text
            </button>
          </div>
          
          {/* AI Detection Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">
              {useAI ? '🤖 AI Detection' : '📋 Pattern Detection'}
            </span>
            <button
              onClick={() => setUseAI(!useAI)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useAI ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                useAI ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.pdf"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="hidden"
        />

        {/* Conditional Input Area */}
        {inputMode === 'upload' ? (
          <div className="mb-6">
            {!file ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-12 border-2 border-dashed border-white/20 rounded-2xl hover:border-purple-500/50 transition-colors"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <div className="text-white font-medium mb-2">Drop a file or click to upload</div>
                  <div className="text-gray-400 text-sm">Supports .txt, .md, and .pdf files</div>
                  {useAI && <div className="text-purple-400 text-sm mt-2">AI detection enabled (~$0.015/page for PDFs)</div>}
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="text-white font-medium">{file.name}</div>
                      <div className="text-gray-400 text-sm">{sections.length} sections • {fileEstimatedCredits.toLocaleString()} credits</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFile(null); setSections([]); }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                {parsing && (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <div className="text-gray-400 text-sm">Analyzing document...</div>
                  </div>
                )}

                {/* Error/Warning Alert */}
                {error && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-yellow-400 text-xl">⚠️</span>
                    <div className="flex-1">
                      <div className="text-yellow-200 font-medium">Warning</div>
                      <div className="text-yellow-200/80 text-sm">{error}</div>
                    </div>
                    <button onClick={() => setError(null)} className="text-yellow-400 hover:text-white">✕</button>
                  </div>
                )}

                {sections.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedSections.has(section.id)
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.has(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0" style={{ marginLeft: `${(section.level - 1) * 12}px` }}>
                          <div className="text-white font-medium truncate text-sm">
                            {section.level > 1 && <span className="text-gray-500 mr-1">└</span>}
                            {section.title}
                          </div>
                          <div className="text-gray-500 text-xs">{section.charCount.toLocaleString()} chars</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {sections.length === 0 && !parsing && (
                  <div className="text-center py-4 text-gray-400">
                    No sections detected. Try enabling AI detection for better results.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Text Input Mode */
          <div className="mb-6">
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
        )}

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

        {/* Audio Format Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Audio Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(FORMAT_LABELS).map(([format, { label, description, icon }]) => (
              <button
                key={format}
                onClick={() => setSelectedFormat(format)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  selectedFormat === format
                    ? 'bg-purple-500/20 border-purple-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium">{label}</span>
                </div>
                <div className="text-xs mt-1 opacity-70">{description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang} className="bg-gray-900">
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Selection */}
        <div className="mb-6">
          <label className="block text-gray-300 font-medium mb-2">
            Voice ({filteredVoices.length} available)
          </label>
          {loading ? (
            <div className="text-gray-400">Loading voices...</div>
          ) : (
            <div className="flex gap-3">
              <select
                value={selectedVoice?.voiceId || ''}
                onChange={(e) => {
                  const voice = filteredVoices.find(v => v.voiceId === e.target.value);
                  setSelectedVoice(voice || null);
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {filteredVoices.map((voice) => (
                  <option key={voice.voiceId} value={voice.voiceId} className="bg-gray-900">
                    {voice.name} ({voice.languageName}) - {voice.gender}
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedVoice || previewing) return;
                  setPreviewing(true);
                  
                  // Stop any existing preview
                  if (previewAudio) {
                    previewAudio.pause();
                    previewAudio.src = '';
                  }
                  
                  try {
                    const res = await fetch('/api/preview', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        voiceId: selectedVoice.voiceId,
                        engine: selectedEngine,
                      }),
                    });
                    
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const audio = new Audio(url);
                      setPreviewAudio(audio);
                      setPreviewError(null);
                      audio.onended = () => setPreviewing(false);
                      audio.onerror = () => {
                        setPreviewError('Failed to play audio');
                        setPreviewing(false);
                      };
                      await audio.play();
                    } else {
                      setPreviewError('Preview generation failed');
                      setPreviewing(false);
                    }
                  } catch (err) {
                    console.error('Preview failed:', err);
                    setPreviewError('Preview failed');
                    setPreviewing(false);
                  }
                }}
                disabled={!selectedVoice || previewing}
                className={`bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center gap-2`}
                title="Preview voice"
              >
                {previewing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Loading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="hidden sm:inline">Preview</span>
                  </>
                )}
              </button>
            </div>
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
