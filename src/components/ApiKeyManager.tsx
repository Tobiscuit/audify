'use client';

import { useState } from 'react';
import { generateApiKey, revokeApiKey, getApiKey } from '@/app/actions/api-keys';
import { toast } from 'sonner';
import { Copy, Check, RotateCcw, Trash, Eye, EyeOff, ShieldAlert, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ApiKeyManagerProps {
    initialKey: string | null;
}

export default function ApiKeyManager({ initialKey }: ApiKeyManagerProps) {
    const [apiKey, setApiKey] = useState<string | null>(initialKey);
    const [reveal, setReveal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const result = await generateApiKey();
            setApiKey(result.apiKey);
            toast.success('API Key generated successfully');
        } catch (error) {
            toast.error('Failed to generate key');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        if (!confirm('Are you sure? This will break any apps using this key.')) return;
        setLoading(true);
        try {
            await revokeApiKey();
            setApiKey(null);
            toast.success('API Key revoked');
        } catch (error) {
            toast.error('Failed to revoke key');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-8 max-w-2xl"
            >
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-300 to-white bg-clip-text text-transparent flex items-center gap-2">
                             <Terminal className="w-5 h-5 text-indigo-400" />
                             Developer Access
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Manage your secret key for accessing the Audify API. 
                        </p>
                    </div>
                    {apiKey && (
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                 Active
                             </div>
                        </div>
                    )}
                </div>

                {!apiKey ? (
                    <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl bg-white/5">
                        <ShieldAlert className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                        <h3 className="text-gray-300 font-medium mb-2">No API Key Found</h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                            Generate a key to start integrating Audify natively into your applications.
                        </p>
                        <button 
                            onClick={handleGenerate} 
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {loading ? 'Generating...' : 'Generate New Key'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-black/40 rounded-lg border border-white/10 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <code className="font-mono text-gray-300 text-sm break-all">
                                {reveal ? apiKey : 'sk_live_audify_•••••••••••••••••••••••••••'}
                            </code>
                            <div className="flex items-center gap-1 shrink-0">
                                <button 
                                    onClick={() => setReveal(!reveal)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                    title={reveal ? 'Hide' : 'Reveal'}
                                >
                                    {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button 
                                    onClick={() => copyToClipboard(apiKey)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                    title="Copy"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-end gap-3">
                             <button
                                onClick={handleRevoke}
                                disabled={loading}
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/30 px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5"
                             >
                                <Trash className="w-3.5 h-3.5" />
                                {loading ? 'Revoking...' : 'Revoke Key'}
                             </button>
                             <button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="text-gray-400 hover:text-white hover:bg-white/10 px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5"
                             >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Roll Key
                             </button>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Quick Start Card */}
            {apiKey && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card rounded-xl p-8 max-w-2xl"
                >
                    <h3 className="text-lg font-medium text-white mb-4">Quick Integration</h3>
                    <div className="bg-black/60 rounded-lg p-4 font-mono text-xs text-blue-300 overflow-x-auto border border-white/5 relative group">
                        <button 
                             onClick={() => copyToClipboard(`curl -X POST https://audify.app/api/synthesize \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{ "text": "Hello World", "voiceId": "Matthew", "engine": "neutral" }'`)}
                             className="absolute top-2 right-2 p-1.5 bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                        >
                            <Copy className="w-3 h-3 text-white" />
                        </button>
                        <pre>
{`curl -X POST https://audify.app/api/synthesize \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{ "text": "Hello World", "voiceId": "Matthew", "engine": "standard" }'`}
                        </pre>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
