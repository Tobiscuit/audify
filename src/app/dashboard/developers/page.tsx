import { getApiKey } from '@/app/actions/api-keys';
import ApiKeyManager from '@/components/ApiKeyManager';

export default async function DevelopersPage() {
  const apiKey = await getApiKey();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
           Audify for Developers 👩‍💻
        </h1>
        <p className="text-gray-400">
          Build voice-enabled applications with our powerful TTS engine
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-8">
        <ApiKeyManager initialKey={apiKey} />
        
        {/* Comparison Table / Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="text-white font-bold mb-1">Fast Integration</h3>
                <p className="text-gray-400 text-sm">Drop-in replacement for complex AWS pipelines. Just one API call.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-2xl mb-2">💎</div>
                <h3 className="text-white font-bold mb-1">Unified Billing</h3>
                <p className="text-gray-400 text-sm">API calls tap into your existing credit balance. No separate subscription.</p>
            </div>
             <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="text-2xl mb-2">🔐</div>
                <h3 className="text-white font-bold mb-1">Secure by Design</h3>
                <p className="text-gray-400 text-sm">Scoped permissions. Revoke instantly if compromised.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
