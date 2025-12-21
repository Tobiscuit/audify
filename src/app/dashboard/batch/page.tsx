'use client';

import { useState, useRef } from 'react';
import { VOICE_CREDIT_MULTIPLIERS } from '@/lib/aws/polly';
import type { Voice } from '@/types';

interface ParsedSection {
  id: number;
  title: string;
  charCount: number;
  preview: string;
}

interface GenerationResult {
  id: number;
  title: string;
  audioUrl?: string;
  success: boolean;
  error?: string;
}

export default function BatchUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sections, setSections] = useState<ParsedSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [selectedEngine, setSelectedEngine] = useState('long-form');
  const [selectedFormat, setSelectedFormat] = useState('mp3');
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate estimated credits
  const totalChars = sections
    .filter(s => selectedSections.has(s.id))
    .reduce((sum, s) => sum + s.charCount, 0);
  const voiceType = selectedEngine === 'long-form' ? 'long_form' : selectedEngine;
  const multiplier = VOICE_CREDIT_MULTIPLIERS[voiceType] || 1;
  const estimatedCredits = totalChars * multiplier;

  // Fetch voices on mount
  useState(() => {
    fetch('/api/voices')
      .then(res => res.json())
      .then(data => {
        setVoices(data.voices || []);
        const longFormVoices = (data.voices || []).filter((v: Voice) => 
          v.engines?.includes('long-form')
        );
        if (longFormVoices.length > 0) {
          setSelectedVoice(longFormVoices[0]);
        }
      });
  });

  const filteredVoices = voices.filter(v => v.engines?.includes(selectedEngine));

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setParsing(true);
    setError(null);
    setSections([]);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const res = await fetch('/api/batch/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to parse file');
        return;
      }

      setSections(data.sections);
      setSelectedSections(new Set(data.sections.map((s: ParsedSection) => s.id)));
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setParsing(false);
    }
  }

  async function handleGenerate() {
    if (!selectedVoice || selectedSections.size === 0) return;

    setGenerating(true);
    setError(null);
    setProgress(0);
    setResults([]);

    try {
      // Get full section content from parse response (stored in sessionStorage or refetch)
      const formData = new FormData();
      formData.append('file', file!);

      const parseRes = await fetch('/api/batch/parse', {
        method: 'POST',
        body: formData,
      });
      const parseData = await parseRes.json();

      const sectionsToGenerate = parseData.rawSections
        .filter((_: unknown, i: number) => selectedSections.has(i))
        .map((s: { title: string; content: string; charCount: number }, i: number) => ({
          id: i,
          title: s.title,
          content: s.content,
          charCount: s.charCount,
        }));

      // Generate audio
      const res = await fetch('/api/batch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sectionsToGenerate,
          voiceId: selectedVoice.voiceId,
          engine: selectedEngine,
          outputFormat: selectedFormat,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setError(`Insufficient credits. Need ${data.creditsRequired.toLocaleString()} credits.`);
        } else {
          setError(data.error || 'Generation failed');
        }
        return;
      }

      setResults(data.results);
      setProgress(100);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
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

  function selectAll() {
    setSelectedSections(new Set(sections.map(s => s.id)));
  }

  function deselectAll() {
    setSelectedSections(new Set());
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Batch Upload</h1>
        <p className="text-gray-400">Upload a document and generate audio for each section</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {!file ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-12 border-2 border-dashed border-white/20 rounded-2xl hover:border-purple-500/50 transition-colors"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <div className="text-white font-medium mb-2">Drop a file or click to upload</div>
              <div className="text-gray-400 text-sm">Supports .txt and .md files</div>
            </div>
          </button>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">📄</span>
                <div>
                  <div className="text-white font-medium">{file.name}</div>
                  <div className="text-gray-400 text-sm">{sections.length} sections detected</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setSections([]);
                  setResults([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕ Remove
              </button>
            </div>

            {parsing && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-400">Analyzing document...</div>
              </div>
            )}

            {sections.length > 0 && (
              <>
                {/* Section List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-300 font-medium">Sections to generate</span>
                    <div className="flex gap-2">
                      <button onClick={selectAll} className="text-purple-400 text-sm hover:underline">Select all</button>
                      <button onClick={deselectAll} className="text-gray-400 text-sm hover:underline">Clear</button>
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {sections.map((section) => (
                      <label
                        key={section.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedSections.has(section.id)
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSections.has(section.id)}
                          onChange={() => toggleSection(section.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{section.title}</div>
                          <div className="text-gray-400 text-sm truncate">{section.preview}</div>
                          <div className="text-gray-500 text-xs mt-1">{section.charCount.toLocaleString()} chars</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Voice Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Voice</label>
                    <select
                      value={selectedVoice?.voiceId || ''}
                      onChange={(e) => {
                        const voice = filteredVoices.find(v => v.voiceId === e.target.value);
                        setSelectedVoice(voice || null);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
                    >
                      {filteredVoices.map((voice) => (
                        <option key={voice.voiceId} value={voice.voiceId} className="bg-gray-900">
                          {voice.name} ({voice.languageName})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Format</label>
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white"
                    >
                      <option value="mp3" className="bg-gray-900">MP3</option>
                      <option value="ogg_vorbis" className="bg-gray-900">OGG</option>
                    </select>
                  </div>
                </div>

                {/* Estimate */}
                <div className="bg-white/5 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-gray-400">Estimated credits</span>
                  <span className="text-purple-400 font-bold text-lg">
                    {estimatedCredits.toLocaleString()}
                  </span>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                    <p className="text-red-300">{error}</p>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedSections.size === 0 || !selectedVoice}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {generating ? 'Generating...' : `Generate ${selectedSections.size} Section${selectedSections.size !== 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Generated Audio</h2>
          <div className="space-y-3">
            {results.map((result) => (
              <div
                key={result.id}
                className={`flex items-center justify-between p-4 rounded-xl ${
                  result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                <span className="text-white">{result.title}</span>
                {result.success && result.audioUrl ? (
                  <div className="flex items-center gap-2">
                    <audio src={result.audioUrl} controls className="h-8" />
                    <a
                      href={result.audioUrl}
                      download
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Download
                    </a>
                  </div>
                ) : (
                  <span className="text-red-400 text-sm">{result.error || 'Failed'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
