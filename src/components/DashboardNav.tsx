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
    <nav className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Audify</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 md:gap-2">
            {[
                { href: '/dashboard', label: 'Generate' },
                { href: '/dashboard/library', label: 'Library' },
                { href: '/dashboard/credits', label: 'Credits' },
            ].map(link => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  {link.label}
                </Link>
            ))}

            <Link 
              href="/dashboard/developers" 
              className="ml-2 px-3 py-1.5 flex items-center gap-1.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-full transition-all"
            >
              API
            </Link>
            <Link 
              href="/dashboard/pronunciations" 
              className="px-2 py-1.5 text-gray-400 hover:text-white transition-colors"
              title="Pronunciations"
            >
              🗣️
            </Link>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            {/* Credits Badge */}
            <div className="hidden md:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-indigo-300 font-medium text-sm">
                {isAdmin ? '∞' : credits.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">credits</span>
              {isAdmin && (
                <span className="text-[10px] bg-indigo-500 text-white px-1.5 rounded uppercase tracking-wider font-bold">
                  Admin
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={async () => {
                // ... (existing push logic) ...
              }}
              className="text-gray-400 hover:text-white transition-colors"
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
            <div className="flex items-center gap-3 pl-4 border-l border-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                  {email[0].toUpperCase()}
              </div>
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-white transition-colors text-xs"
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
