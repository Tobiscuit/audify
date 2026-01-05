'use client';

import { useState } from 'react';
import { saveLexicon, deleteLexicon, LexiconMapping } from '@/app/actions/lexicon';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash, Edit2, Check, X, ArrowRight } from 'lucide-react';

interface Lexicon {
    id: string;
    name: string;
    mappings: LexiconMapping[];
}

interface LexiconManagerProps {
    initialLexicons: Lexicon[];
}

export default function LexiconManager({ initialLexicons }: LexiconManagerProps) {
    const [lexicons, setLexicons] = useState(initialLexicons);
    const [editing, setEditing] = useState<Lexicon | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formName, setFormName] = useState('');
    const [formMappings, setFormMappings] = useState<LexiconMapping[]>([{ word: '', replacement: '' }]);

    const startCreate = () => {
        setEditing(null);
        setFormName('');
        setFormMappings([{ word: '', replacement: '' }]);
        setIsCreating(true);
    };

    const startEdit = (lex: Lexicon) => {
        setEditing(lex);
        setFormName(lex.name.includes('_') ? lex.name.split('_').slice(1,-1).join('') : lex.name);
        setFormMappings(lex.mappings && lex.mappings.length > 0 ? lex.mappings : [{ word: '', replacement: '' }]);
        setIsCreating(true);
    };

    const addRow = () => {
        setFormMappings([...formMappings, { word: '', replacement: '' }]);
    };

    const removeRow = (index: number) => {
        if (formMappings.length === 1) {
            setFormMappings([{ word: '', replacement: '' }]);
            return;
        }
        setFormMappings(formMappings.filter((_, i) => i !== index));
    };

    const updateRow = (index: number, field: 'word' | 'replacement', value: string) => {
        const newMappings = [...formMappings];
        newMappings[index][field] = value;
        setFormMappings(newMappings);
    };

    const handleSave = async () => {
        if (!formName) {
            toast.error('Lexicon Name is required');
            return;
        }
        
        const validMappings = formMappings.filter(m => m.word.trim() && m.replacement.trim());
        if (validMappings.length === 0) {
            toast.error('Add at least one pronunciation mapping');
            return;
        }

        setLoading(true);
        try {
            await saveLexicon(editing?.id || null, formName, validMappings);
            toast.success(editing ? 'Lexicon updated!' : 'Lexicon created!');
            // Optimistic reload is acceptable for MVP
            window.location.reload(); 
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (lex: Lexicon) => {
        if(!confirm(`Delete lexicon "${lex.name}"?`)) return;
        setLoading(true);
        try {
            await deleteLexicon(lex.id, lex.name);
            toast.success('Lexicon deleted');
            window.location.reload();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    // Modal / Form UI
    if (isCreating) {
        return (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-2xl p-6 md:p-8"
            >
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {editing ? 'Edit Lexicon' : 'New Pronunciation List'}
                        </h2>
                        <p className="text-sm text-gray-400">Define custom pronunciations for your audio</p>
                    </div>
                    <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">List Name</label>
                        <input 
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            placeholder="e.g. MyTechTerms"
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        />
                         <p className="text-xs text-gray-500 mt-1.5 ml-1">Alphanumeric only. Used to identify this list.</p>
                    </div>

                    <div className="space-y-3">
                         <div className="flex justify-between items-end">
                            <label className="block text-sm font-medium text-gray-300">Mappings</label>
                         </div>
                         
                         <AnimatePresence>
                             {formMappings.map((m, i) => (
                                 <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex items-center gap-2 group"
                                  >
                                     <input 
                                         placeholder="Original (e.g. SQL)"
                                         value={m.word}
                                         onChange={(e) => updateRow(i, 'word', e.target.value)}
                                         className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500/50 outline-none transition-colors"
                                     />
                                     <ArrowRight className="w-4 h-4 text-gray-600" />
                                     <input 
                                         placeholder="Spoken (e.g. Sequel)"
                                         value={m.replacement}
                                         onChange={(e) => updateRow(i, 'replacement', e.target.value)}
                                         className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500/50 outline-none transition-colors"
                                     />
                                     <button 
                                        onClick={() => removeRow(i)} 
                                        className="text-gray-600 hover:text-red-400 p-2 rounded-md hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                                     >
                                        <Trash className="w-4 h-4" />
                                     </button>
                                 </motion.div>
                             ))}
                         </AnimatePresence>
                    </div>

                    <button 
                        onClick={addRow} 
                        className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors px-1"
                    >
                        <Plus className="w-4 h-4" /> Add Word
                    </button>

                    <div className="pt-6 border-t border-white/10 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsCreating(false)} 
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Syncing...' : 'Save Lexicon'} 
                            {!loading && <Check className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </motion.div>
        )
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {lexicons.map(lex => (
                     <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={lex.id} 
                        className="glass-card rounded-xl p-5 hover:border-indigo-500/30 transition-all group"
                     >
                         <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                     <span className="text-lg font-serif italic">Aa</span>
                                 </div>
                                 <h3 className="font-bold text-white text-lg">{lex.name}</h3>
                             </div>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => startEdit(lex)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md">
                                     <Edit2 className="w-4 h-4" />
                                 </button>
                                 <button onClick={() => handleDelete(lex)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-md">
                                     <Trash className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                         
                         <div className="bg-black/40 rounded-lg p-3 border border-white/5 min-h-[60px]">
                             <div className="flex flex-wrap gap-2">
                                 {lex.mappings?.slice(0, 3).map((m, i) => (
                                     <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded text-gray-300 border border-white/5">
                                         <span className="text-gray-500">{m.word}</span> <span className="text-gray-600">→</span> <span className="text-indigo-200">{m.replacement}</span>
                                     </span>
                                 ))}
                                 {(lex.mappings?.length || 0) > 3 && (
                                     <span className="text-xs text-gray-500 py-1 pl-1">
                                         +{lex.mappings.length - 3} more
                                     </span>
                                 )}
                             </div>
                             {(!lex.mappings || lex.mappings.length === 0) && (
                                 <p className="text-xs text-gray-600 italic">No mappings yet.</p>
                             )}
                         </div>
                     </motion.div>
                 ))}

                 <button 
                    onClick={startCreate}
                    className="border border-dashed border-white/10 rounded-xl p-5 flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all min-h-[160px] group"
                 >
                     <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-indigo-500/10 flex items-center justify-center mb-3 transition-colors">
                        <Plus className="w-5 h-5" />
                     </div>
                     <span className="font-medium text-sm">Create New List</span>
                 </button>
            </div>
        </div>
    );
}
