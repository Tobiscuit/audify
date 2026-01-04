# Audify Environment Variables

## Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

## AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET_NAME=audify-audio
AWS_KMS_KEY_ID=your_kms_key_id (optional, for 'Security Architect' grade encryption)

## Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

## Web Push (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BI9qCQzzM06s2_JQ0ON7MK7FuwHKiARBrLNT-_m44dpaHLOG6m9DMqJK37WovcWeWkOBLZs-XHVOWFHuh74HIVc
VAPID_PRIVATE_KEY=DlDdobhh3p9vT2oozPlMJK59sr_raHIwpDj-GHFQE6A
VAPID_EMAIL=mailto:tobiasramzy@gmail.com
