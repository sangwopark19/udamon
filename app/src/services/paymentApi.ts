export type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

export interface PaymentRequest {
  userId: string;
  amount: number;
  ticketCount: number;
  method: PaymentMethod;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PaymentHistoryRecord {
  id: string;
  userId: string;
  type: 'purchase' | 'refund';
  amount: number;
  ticketCount: number;
  method: PaymentMethod;
  status: 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

export interface RefundRequest {
  transactionId: string;
  userId: string;
  reason?: string;
}

/**
 * Mock payment API — simulates Stripe-like flow.
 * 1.2s delay, 95% success rate.
 */
export async function requestPayment(req: PaymentRequest): Promise<PaymentResult> {
  await delay(1200);

  if (Math.random() < 0.05) {
    return { success: false, error: 'Payment declined. Please try again.' };
  }

  return {
    success: true,
    transactionId: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };
}

export async function getPaymentHistory(userId: string): Promise<PaymentHistoryRecord[]> {
  await delay(400);
  // Returns empty for now — records are managed client-side in TicketContext
  return [];
}

export async function requestRefund(req: RefundRequest): Promise<{ success: boolean; error?: string }> {
  await delay(800);

  if (Math.random() < 0.1) {
    return { success: false, error: 'Refund could not be processed.' };
  }

  return { success: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
