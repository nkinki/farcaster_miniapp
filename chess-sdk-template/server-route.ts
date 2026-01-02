import { requireChessPayment } from '@chess/x402-server';

/**
 * Next.js API Route example using x402 for $CHESS-gated actions.
 */
export async function POST(req: Request) {
    // 1. Enforce a 1000 $CHESS payment
    const payment = await requireChessPayment(req, {
        amount: 1000,
        recipient: '0x...YourTreasuryWallet...',
        reason: 'Premium Action Fee'
    });

    // 2. If payment isn't verified, requireChessPayment returns the 402 response
    if (payment.status === 'required') {
        return payment.response;
    }

    // 3. Payment verified! Continue with premium logic...
    return Response.json({
        success: true,
        msg: "Premium action executed successfully! 🏁"
    });
}
