import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';

// Configure web-push with your VAPID keys
// In a real app, these should be environment variables
// VAPID keys should be generated only once.
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:test@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For this demo, we'll send a notification to the current user
    // In production, this would likely be triggered by a background job
    // and target a specific userId passed in the body or looked up.
    
    // Get user's subscription from DB
    const { data: userData, error: dbError } = await supabase
        .from('users')
        .select('push_subscription')
        .eq('id', user.id)
        .single();
        
    if (dbError || !userData?.push_subscription) {
        return NextResponse.json({ error: 'No subscription found for user' }, { status: 404 });
    }
    
    const subscription = userData.push_subscription;
    
    // Parse body for custom message
    const body = await request.json().catch(() => ({}));
    const message = body.message || 'Your audio generation is complete! 🎧';
    const title = body.title || 'Audify';
    
    const payload = JSON.stringify({
        title,
        body: message,
        icon: '/icons/icon-192x192.png',
        url: '/dashboard/library'
    });

    try {
        await webpush.sendNotification(subscription as any, payload);
        return NextResponse.json({ success: true });
    } catch (pushError: any) {
        console.error('WebPush Error:', pushError);
        // 410 Gone means the subscription is no longer valid
        if (pushError.statusCode === 410) {
            // Cleanup invalid subscription
            await supabase.from('users').update({ push_subscription: null }).eq('id', user.id);
            return NextResponse.json({ error: 'Subscription expired', code: 'GONE' }, { status: 410 });
        }
        throw pushError;
    }

  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
