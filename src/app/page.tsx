import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Audify
          </h1>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/login" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-2 px-6 rounded-full hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Transform Text Into
          <br />
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Natural Speech
          </span>
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Powered by Amazon Polly's state-of-the-art AI voices. Create audiobooks, 
          podcasts, and voiceovers with lifelike speech in seconds.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/login" 
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-10 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Start Creating Free
          </Link>
          <Link 
            href="#pricing" 
            className="text-gray-300 font-medium py-4 px-10 rounded-full border border-white/20 hover:bg-white/5 transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">100+ Voices</h3>
            <p className="text-gray-400">
              Choose from over 100 lifelike voices across 30+ languages. From casual to professional tones.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <div className="w-14 h-14 bg-pink-500/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Instant Generation</h3>
            <p className="text-gray-400">
              Generate high-quality audio in seconds. No waiting, no queues - just paste and play.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Pay As You Go</h3>
            <p className="text-gray-400">
              Only pay for what you use. No subscriptions, no commitments. Credits never expire.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Simple Pricing</h2>
          <p className="text-gray-400">Start for free, scale as you grow</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
            <div className="text-4xl font-bold text-white mb-4">$5</div>
            <p className="text-purple-400 mb-6">100,000 credits</p>
            <p className="text-gray-400 text-sm">~10,000 chars with Generative voices</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-purple-500 ring-2 ring-purple-500/20">
            <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
              POPULAR
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
            <div className="text-4xl font-bold text-white mb-4">$15</div>
            <p className="text-purple-400 mb-6">350,000 credits</p>
            <p className="text-gray-400 text-sm">~35,000 chars with Generative voices</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-2">Studio</h3>
            <div className="text-4xl font-bold text-white mb-4">$40</div>
            <p className="text-purple-400 mb-6">1,000,000 credits</p>
            <p className="text-gray-400 text-sm">~100,000 chars with Generative voices</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl rounded-3xl p-12 border border-purple-500/30 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to bring your text to life?
          </h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Join thousands of creators using Audify to create professional audio content.
          </p>
          <Link 
            href="/login" 
            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-10 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-white/10">
        <div className="flex items-center justify-between text-gray-400 text-sm">
          <span>© 2025 Audify. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
