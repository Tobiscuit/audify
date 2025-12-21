'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DashboardNavProps {
  email: string;
  credits: number;
  isAdmin: boolean;
}

export default function DashboardNav({ email, credits, isAdmin }: DashboardNavProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-white/5 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Audify
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Generate
            </Link>
            <Link 
              href="/dashboard/history" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Library
            </Link>
            <Link 
              href="/dashboard/credits" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Buy Credits
            </Link>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            {/* Credits Badge */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-4 py-2 rounded-full border border-purple-500/30">
              <span className="text-purple-300 font-medium">
                {isAdmin ? '∞' : credits.toLocaleString()} credits
              </span>
              {isAdmin && (
                <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                  ADMIN
                </span>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm hidden md:block">{email}</span>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
