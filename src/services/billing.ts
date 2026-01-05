import { SupabaseClient } from '@supabase/supabase-js';

export class BillingService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if user has sufficient credits and optionally deduce them.
   * Returns true if successful, throws error if insufficient.
   */
  async checkAndDeductCredits(userId: string, amount: number, isAdmin: boolean): Promise<number> {
    if (isAdmin) return 0; // Admins are free

    // ATOMIC TRANSACTION (RPC)
    // We call the database function which locks the row and updates it atomically.
    const { data: newBalance, error } = await this.supabase
      .rpc('deduct_credits', {
        row_id: userId,
        amount: amount
      });

    if (error) {
        console.error('Billing RPC Error:', error);
        // Map common errors
        if (error.message.includes('Insufficient credits')) {
            // We need to fetch current balance for the error message (sadly 2nd call, but only on failure)
            const { data } = await this.supabase.from('users').select('credits').eq('id', userId).single();
            throw new Error(`Insufficient credits. Required: ${amount}, Balance: ${data?.credits ?? 0}`);
        }
        // Fallback
        throw new Error('Transaction failed: ' + error.message);
    }

    return newBalance;
  }

  private async initializeUser(userId: string) {
      // Emergency initialization if user somehow doesn't exist
      await this.supabase.from('users').insert({ id: userId, credits: 0 });
  }
}
