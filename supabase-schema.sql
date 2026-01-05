-- Supabase SQL Schema for Audify
-- Run this in your Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  credits INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT false,
  push_subscription JSONB,
  auto_approve_textract BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Voice pricing configuration
CREATE TABLE public.voice_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_type TEXT UNIQUE NOT NULL,
  credit_multiplier INTEGER NOT NULL,
  aws_cost_per_million DECIMAL(10,4)
);

-- Insert default pricing
INSERT INTO public.voice_pricing (voice_type, credit_multiplier, aws_cost_per_million) VALUES
  ('standard', 1, 4.00),
  ('neural', 4, 16.00),
  ('generative', 10, 30.00),
  ('long_form', 35, 100.00);

-- Usage history
CREATE TABLE public.usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL,
  voice_type TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,
  s3_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions (credit purchases)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  package_id TEXT,
  stripe_session_id TEXT,
  credits_added INTEGER NOT NULL,
  amount_cents INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can read/update own row
CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (true);

-- Voice pricing: everyone can read
CREATE POLICY "Anyone can read voice pricing" ON public.voice_pricing
  FOR SELECT USING (true);

-- Usage history: users can read own history
CREATE POLICY "Users can read own history" ON public.usage_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history" ON public.usage_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions: users can read own transactions
CREATE POLICY "Users can read own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_usage_history_user_id ON public.usage_history(user_id);
CREATE INDEX idx_usage_history_created_at ON public.usage_history(created_at);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);


-- LEXICONS (Custom Pronunciations)
CREATE TABLE IF NOT EXISTS public.lexicons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    mappings JSONB DEFAULT '[]'::JSONB, -- Array of { word: string, replacement: string, type: 'alias'|'phoneme' }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, name)
);

-- RLS for Lexicons
ALTER TABLE public.lexicons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lexicons" ON public.lexicons
    FOR ALL USING (auth.uid() = user_id);

-- RPC: Atomic Credit Deduction (Bank-Grade Transaction)
CREATE OR REPLACE FUNCTION deduct_credits(row_id uuid, amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_credits int;
BEGIN
  UPDATE public.users
  SET credits = credits - amount
  WHERE id = row_id AND credits >= amount
  RETURNING credits INTO new_credits;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  RETURN new_credits;
END;
$$;
