import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from '@/components/DashboardNav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user credits
  const { data: userData } = await supabase
    .from('users')
    .select('credits, is_admin')
    .eq('id', user.id)
    .single();

  const credits = (userData as { credits: number; is_admin: boolean } | null)?.credits || 0;
  const isAdmin = (userData as { credits: number; is_admin: boolean } | null)?.is_admin || false;

  return (
    <div className="min-h-screen">
      <DashboardNav 
        email={user.email || ''} 
        credits={credits} 
        isAdmin={isAdmin} 
      />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
