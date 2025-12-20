# Audify - Text to Speech SaaS

A SaaS wrapper around Amazon Polly for converting text to natural speech with credit-based billing.

## Features

- 🎙️ **100+ Voices** - Access all Amazon Polly voices (Standard, Neural, Generative, Long-Form)
- 💳 **Credit System** - Pay-as-you-go with Stripe integration
- 🔐 **Google SSO** - Secure authentication via Supabase
- 📱 **PWA Ready** - Progressive Web App with offline support
- ⚡ **Instant Generation** - Stream audio directly to users
- 👑 **Admin Bypass** - Free synthesis for admin accounts

## Tech Stack

- **Framework**: Next.js 16.1 (App Router)
- **UI**: Tailwind CSS
- **Auth & DB**: Supabase (PostgreSQL + Auth)
- **TTS**: Amazon Polly
- **Storage**: AWS S3
- **Payments**: Stripe

## Environment Variables

Create a `.env.local` file with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=audify-audio

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Web Push (optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:you@example.com
```

## Setup

### 1. Supabase

1. Create a new Supabase project
2. Run the SQL in `supabase-schema.sql`
3. Enable Google OAuth in Authentication > Providers
4. Copy URL and keys to `.env.local`

### 2. AWS

1. Create IAM user with `AmazonPollyFullAccess` and `AmazonS3FullAccess`
2. Create S3 bucket for audio storage
3. Copy credentials to `.env.local`

### 3. Stripe

1. Create products for credit packages
2. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Copy keys to `.env.local`

### 4. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/audify)

1. Connect your repository
2. Add environment variables
3. Deploy!

## Development

```bash
npm install
npm run dev
```

## Credit Pricing

| Voice Type | Credit Multiplier |
|------------|-------------------|
| Standard   | 1x               |
| Neural     | 4x               |
| Generative | 10x              |
| Long-Form  | 35x              |

## Admin Access

Add your email to `src/lib/auth/admin.ts` for free synthesis:

```typescript
const ADMIN_EMAILS = new Set([
  'your.email@example.com',
]);
```

## License

MIT
