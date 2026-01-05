// User type from Supabase
export interface User {
  id: string;
  email: string;
  credits: number;
  is_admin: boolean;
  push_subscription: PushSubscription | null;
  created_at: string;
}

// Voice pricing from database
export interface VoicePricing {
  id: string;
  voice_type: 'standard' | 'neural' | 'generative' | 'long_form';
  credit_multiplier: number;
  aws_cost_per_million: number;
}

// Usage history record
export interface UsageHistory {
  id: string;
  user_id: string;
  voice_id: string;
  voice_type: string;
  char_count: number;
  credits_used: number;
  s3_key: string;
  created_at: string;
}

// Synthesize request body
export interface SynthesizeRequest {
  text: string;
  voiceId: string;
  engine: 'standard' | 'neural' | 'generative' | 'long-form';
  outputFormat?: 'mp3' | 'ogg_vorbis';
  lexiconNames?: string[];
}

// Synthesize response
export interface SynthesizeResponse {
  audioUrl: string;
  audioId: string;
  creditsUsed: number;
  remainingCredits: number;
}

// Voice info for voice selector
export interface Voice {
  voiceId: string;
  name: string;
  languageCode: string;
  languageName: string;
  gender: string;
  engines: string[];
}

// Credit package
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  description: string;
}

// Push subscription from browser
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
