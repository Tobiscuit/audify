import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';

// Define a unified User type that might include extra fields if needed
// For now, we return the Supabase User object or a mock object if using API key
// Actually, it's better to return the DB User Record since API keys don't have Auth Sessions.

interface AuthResult {
  user: { id: string; email?: string } | null;
  authType: 'session' | 'api_key' | null;
  error?: string;
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  const supabase = await createClient();

  // 1. Check for API Key in Authorization Header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer sk_')) {
    const apiKey = authHeader.split(' ')[1];
    
    // Query DB for user with this key
    // We MUST use the Service Role Key to bypass RLS, because an anonymous client
    // cannot search the users table for a specific API key (RLS restricted).
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY. API Key auth will fail.');
        return { user: null, authType: null, error: 'Server misconfigured (Missing Service Key)' };
    }

    // Create a one-off admin client
    // We import createClient from the raw SDK to avoid Next.js cookie dependency
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
    );

    const { data: userByKey, error } = await adminClient
      .from('users')
      .select('id, email')
      .eq('api_key', apiKey)
      .single();

    if (userByKey && !error) {
      return { 
        user: { id: userByKey.id, email: userByKey.email }, 
        authType: 'api_key' 
      };
    }
    
    if (error) {
        // console.error('API Key Lookup Error:', error.message);
    }
    
    return { user: null, authType: null, error: 'Invalid API Key' };
  }

  // 2. Fallback to Standard Supabase Session (Cookies)
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (user && !error) {
    return { user, authType: 'session' };
  }

  return { user: null, authType: null };
}
