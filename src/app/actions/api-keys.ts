'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function generateApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Generate a secure random key
  // Format: sk_live_audify_<random_hex>
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const apiKey = `sk_live_audify_${randomBytes}`;

  const { error } = await supabase
    .from('users')
    .update({ api_key: apiKey })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to generate API key:', error);
    throw new Error('Failed to generate API key');
  }

  revalidatePath('/dashboard/developers');
  return { success: true, apiKey };
}

export async function revokeApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('users')
    .update({ api_key: null })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to revoke API key:', error);
    throw new Error('Failed to revoke API key');
  }

  revalidatePath('/dashboard/developers');
  return { success: true };
}

export async function getApiKey() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) return null;
  
    const { data } = await supabase
      .from('users')
      .select('api_key')
      .eq('id', user.id)
      .single();
  
    return data?.api_key || null;
}
