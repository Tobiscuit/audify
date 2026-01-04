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
              href="/dashboard/library" 
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

            {/* Notification Bell */}
            <button
              onClick={async () => {
                // ... (existing push logic) ...
              }}
              // ... (existing push className) ...
            >
              🔔
            </button>

            {/* Application Settings */}
            <button
               onClick={() => {
                   const newState = confirm('Enable "Auto-Approve AI Costs"?\n\nWhen enabled, we will automatically deduct credits for AI Document Analysis (10 credits/page) without asking for confirmation every time.\n\nClick OK to Enable, Cancel to Disable.');
                   
                   // Update preference in DB
                   const supabase = createClient();
                   supabase.auth.getUser().then(({ data: { user } }) => {
                       if (user) {
                           supabase.from('users').update({ auto_approve_textract: newState }).eq('id', user.id).then(({ error }) => {
                               if (error) alert('Failed to save setting');
                               else alert(newState ? 'Auto-Approve Enabled ⚡' : 'Confirmation Mode Enabled 🛡️');
                           });
                       }
                   });
               }}
               className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
               title="Settings"
            >
                ⚙️
            </button>

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
