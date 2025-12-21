import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getPresignedUrl } from '@/lib/aws/s3';
import HistoryClient from './HistoryClient';

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's usage history
  const { data: history, error } = await supabase
    .from('usage_history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Generate presigned URLs for each audio file
  const historyWithUrls = await Promise.all(
    ((history as any[]) || []).map(async (item) => {
      try {
        const audioUrl = await getPresignedUrl(item.s3_key);
        return { ...item, audioUrl };
      } catch {
        return { ...item, audioUrl: null };
      }
    })
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Generation History</h1>
        <p className="text-gray-400">Your past audio generations</p>
      </div>

      <HistoryClient history={historyWithUrls} />
    </div>
  );
}
