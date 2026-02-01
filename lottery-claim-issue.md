# Lottery Claim Issue - Investigation Report

## Problem Summary
User FID 815252 won 8,630,000 CHESS in lottery Draw #155 but never received the tokens.

## Database Status
- **Winning ID**: 19
- **Amount Won**: 8,630,000 CHESS
- **Claimed At**: 2026-01-19 23:09:15
- **Transaction Hash**: `null` ❌
- **Recipient Address**: `0x53aceDc27fa13e609c74442DC21c35092068ee5e`

## Root Cause
The `lottery_winnings` table shows `transaction_hash: null`, which means:
1. The claim button was clicked
2. The database was updated to mark it as "claimed"
3. **BUT the on-chain CHESS token transfer never happened**

## Why This Happened
Looking at `/src/app/api/lottery/claim-prize/route.ts`:
- Line 56-118: The code tries to send CHESS tokens on-chain
- Line 108-114: If the on-chain payment fails, it returns an error
- **However**, the database shows `claimed_at` is set, which should only happen if the transaction succeeds

This suggests either:
1. The backend wallet private key was not configured when the claim was made
2. The on-chain transaction failed but the error handling didn't work properly
3. There was a bug in the claim process

## Solution Options

### Option 1: Reset the Claim (Recommended)
Reset the `claimed_at` field so the user can claim again:
```sql
UPDATE lottery_winnings 
SET claimed_at = NULL, transaction_hash = NULL
WHERE id = 19;
```

### Option 2: Manual Payout
Manually send 8,630,000 CHESS tokens to the winner's address:
- Recipient: `0x53aceDc27fa13e609c74442DC21c35092068ee5e`
- Amount: 8,630,000 CHESS
- Then update the database with the transaction hash

### Option 3: Use Reset Claim API
There appears to be a `/api/lottery/reset-claim` endpoint that might handle this.

## Next Steps
1. Verify backend wallet is properly configured
2. Reset the claim status
3. User can claim again (this time it should work)
4. Monitor the transaction to ensure it completes
