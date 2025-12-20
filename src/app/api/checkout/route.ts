import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getPackageById } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { packageId } = await request.json();

    const creditPackage = getPackageById(packageId);
    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${creditPackage.name} - ${creditPackage.credits.toLocaleString()} Credits`,
              description: creditPackage.description,
            },
            unit_amount: creditPackage.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        packageId: creditPackage.id,
        credits: creditPackage.credits.toString(),
      },
      success_url: `${request.headers.get('origin')}/dashboard?success=true`,
      cancel_url: `${request.headers.get('origin')}/dashboard/credits?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
