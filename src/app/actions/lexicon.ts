'use server';

import { createClient } from '@/lib/supabase/server';
import { PutLexiconCommand, DeleteLexiconCommand, PollyClient } from '@aws-sdk/client-polly';
import { revalidatePath } from 'next/cache';

// Interface for our UI
export interface LexiconMapping {
  word: string;
  replacement: string;
}

// AWS Polly Client (using server credentials)
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Generate W3C PLS V1.0 XML from mappings
 */
function generatePlsXml(name: string, mappings: LexiconMapping[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<lexicon version="1.0" 
      xmlns="http://www.w3.org/2005/01/pronunciation-lexicon"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xsi:schemaLocation="http://www.w3.org/2005/01/pronunciation-lexicon 
        http://www.w3.org/TR/2007/CR-pronunciation-lexicon-20071212/pls.xsd"
      alphabet="ipa" 
      xml:lang="en-US">`;
  
  mappings.forEach(m => {
      // Basic alias replacement
      xml += `
  <lexeme>
    <grapheme>${escapeXml(m.word)}</grapheme>
    <alias>${escapeXml(m.replacement)}</alias>
  </lexeme>`;
  });

  xml += '\n</lexicon>';
  return xml;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function saveLexicon(lexiconId: string | null, name: string, mappings: LexiconMapping[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 1. Generate XML
    // Sanitize name for Polly (alphanumeric only)
    const pollyName = `audify_${name.replace(/[^a-zA-Z0-9]/g, '')}_${user.id.substring(0,8)}`; 
    const content = generatePlsXml(pollyName, mappings);

    // 2. Upload to Polly
    // Note: Polly limits lexicons to 5 per account by default (soft limit?), wait, checking docs...
    // Limits: 4000 chars per lexeme. Max lexicons: 100 per region. 
    // We prefix with user info to avoid collisions, but strictly speaking lexicons are global to the account.
    // This assumes we don't have >100 active users with custom lexicons sharing one AWS account.
    // For MVP/Demo: It's fine. 
    try {
        await pollyClient.send(new PutLexiconCommand({
            Name: pollyName,
            Content: content
        }));
    } catch (e: any) {
        console.error('Polly PutLexicon Error:', e);
        throw new Error(`AWS Polly Error: ${e.message}`);
    }

    // 3. Save to DB
    const payload = {
        user_id: user.id,
        name: pollyName, // Store the actual name used in Polly
        description: `Custom pronunciations for ${name}`,
        mappings: mappings
    };

    let error;
    if (lexiconId) {
        const { error: jwt } = await supabase.from('lexicons').update(payload).eq('id', lexiconId);
        error = jwt;
    } else {
        const { error: jwt } = await supabase.from('lexicons').insert(payload);
        error = jwt;
    }

    if (error) throw new Error(error.message);
    revalidatePath('/dashboard/pronunciations');
    return { success: true, pollyName };
}

export async function deleteLexicon(lexiconId: string, pollyName: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // 1. Delete from Polly
    try {
        await pollyClient.send(new DeleteLexiconCommand({ Name: pollyName }));
    } catch (e) {
        console.warn('Failed to delete from Polly (might not exist):', e);
    }

    // 2. Delete from DB
    const { error } = await supabase.from('lexicons').delete().eq('id', lexiconId);
    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/pronunciations');
    return { success: true };
}

export async function getLexicons() {
    const supabase = await createClient();
    const { data } = await supabase.from('lexicons').select('*').order('created_at', { ascending: false });
    return data || [];
}
