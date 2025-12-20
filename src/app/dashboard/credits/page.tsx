'use client';

import { useState } from 'react';
import { CREDIT_PACKAGES } from '@/lib/stripe';

export default function CreditsPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(packageId: string) {
    setLoading(packageId);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-white mb-2">
          Buy Credits
        </h1>
        <p className="text-gray-400">
          Choose a credit package to power your audio generation
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {CREDIT_PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white/5 backdrop-blur-xl rounded-3xl p-8 border transition-all ${
              pkg.id === 'pro'
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-white/10 hover:border-white/30'
            }`}
          >
            {pkg.id === 'pro' && (
              <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                POPULAR
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{pkg.description}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                ${(pkg.priceCents / 100).toFixed(0)}
              </span>
            </div>

            <div className="mb-6 text-purple-400 font-medium">
              {pkg.credits.toLocaleString()} credits
            </div>

            {/* What you can do */}
            <ul className="space-y-2 mb-8 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {Math.floor(pkg.credits / 10000).toLocaleString()}K chars Generative
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {Math.floor(pkg.credits / 35000).toLocaleString()}K chars Long-Form
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Credits never expire
              </li>
            </ul>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading !== null}
              className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
                pkg.id === 'pro'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                  : 'bg-white/10 text-white hover:bg-white/20'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === pkg.id ? 'Redirecting...' : 'Buy Now'}
            </button>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-12 bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-medium mb-3">How credits work</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-400">
          <div>
            <span className="text-purple-400 font-medium">Standard voices:</span> 1 credit per character
          </div>
          <div>
            <span className="text-purple-400 font-medium">Neural voices:</span> 4 credits per character
          </div>
          <div>
            <span className="text-purple-400 font-medium">Generative voices:</span> 10 credits per character
          </div>
        </div>
        <div className="text-sm text-gray-400 mt-3">
          <span className="text-purple-400 font-medium">Long-Form voices:</span> 35 credits per character (best for audiobooks)
        </div>
      </div>
    </div>
  );
}
