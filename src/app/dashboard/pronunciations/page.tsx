import { getLexicons } from '@/app/actions/lexicon';
import LexiconManager from '@/components/LexiconManager';

export default async function PronunciationsPage() {
    const lexicons = await getLexicons();

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Custom Pronunciations 🗣️</h1>
                <p className="text-gray-400 max-w-2xl">
                    Teach the AI how to say specific words properly. Values are saved as W3C PLS lexicons and
                    applied automatically to your synthesis jobs.
                </p>
            </div>

            <LexiconManager initialLexicons={lexicons} />
        
            <div className="mt-12 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <h3 className="text-blue-300 font-bold mb-2">💡 Pro Tip</h3>
                <ul className="text-sm text-blue-200/80 space-y-2 list-disc pl-4">
                    <li>Use simple phonetic spelling: <strong>"Jrami" → "Jay-Rami"</strong></li>
                    <li>Expand acronyms: <strong>"SQL" → "Sequel"</strong></li>
                    <li>Changes take effect immediately for all new jobs.</li>
                </ul>
            </div>
        </div>
    );
}
