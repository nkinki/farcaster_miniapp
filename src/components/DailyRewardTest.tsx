"use client"

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { FiGift, FiLoader, FiCheck, FiX } from "react-icons/fi";
import type { Hash } from "viem";

// DailyReward szerződés adatai
const DAILY_REWARD_ADDRESS = '0xa5c59fb76f3e2012dfd572739b9d5516034f1ff8' as const;

// Egyszerűsített DailyReward ABI
const DAILY_REWARD_ABI = [
  {
    "inputs": [
      {"name": "recipient", "type": "address"},
      {"name": "amount", "type": "uint256"},
      {"name": "nonce", "type": "uint256"},
      {"name": "signature", "type": "bytes"}
    ],
    "name": "claimWithSignature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
}

interface DailyRewardTestProps {
  user: FarcasterUser;
}

const DailyRewardTest = ({ user }: DailyRewardTestProps) => {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [claimTxHash, setClaimTxHash] = useState<Hash | undefined>();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash: claimTxHash,
  });

  const handleDailyRewardClaim = useCallback(async () => {
    if (!user.fid || !address) {
      setError("Farcaster user or wallet not found.");
      return;
    }
    
    setIsClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🎁 Starting DailyReward claim...');
      
      // Lekérjük a signature-t a meglévő API-ból
      const sigResponse = await fetch("/api/generate-claim-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fid: user.fid, 
          recipientAddress: address,
          // DailyReward specifikus paraméterek
          contractAddress: DAILY_REWARD_ADDRESS,
          amount: "10000" // Fix 10,000 CHESS
        }),
      });
      
      const sigData = await sigResponse.json();
      console.log('Signature response:', sigData);
      
      if (!sigResponse.ok) {
        throw new Error(sigData.error || "Could not get claim signature.");
      }

      const { signature, amount, nonce } = sigData;
      
      console.log('Calling DailyReward claimWithSignature...');
      console.log('Recipient:', address);
      console.log('Amount:', amount);
      console.log('Nonce:', nonce);
      console.log('Signature length:', signature?.length);

      // DailyReward szerződés hívása
      const hash = await writeContractAsync({
        address: DAILY_REWARD_ADDRESS,
        abi: DAILY_REWARD_ABI,
        functionName: 'claimWithSignature',
        args: [address, BigInt(amount), BigInt(nonce || 0), signature],
        gas: BigInt(300000), // Magasabb gas limit
      });
      
      setClaimTxHash(hash);
      setSuccess(`DailyReward claim transaction sent! Hash: ${hash}`);
      console.log('Transaction hash:', hash);

    } catch (err: any) {
      console.error('DailyReward claim error:', err);
      let errorMessage = "DailyReward claim failed.";
      
      if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Specifikus hibák kezelése
      if (err.message?.includes('insufficient funds')) {
        errorMessage = "Insufficient funds for gas fee.";
      } else if (err.message?.includes('execution reverted')) {
        errorMessage = "DailyReward contract rejected the claim. Check signature or daily limit.";
      } else if (err.message?.includes('Invalid signature')) {
        errorMessage = "Invalid signature. Backend wallet might not be authorized.";
      }
      
      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  }, [user.fid, address, writeContractAsync]);

  const isLoading = isClaiming || isConfirming;

  return (
    <div className="bg-[#1a1f2e] rounded-xl p-4 border border-[#3d4f7a] mb-4">
      <div className="flex items-center gap-3 mb-4">
        <FiGift className="text-yellow-400 text-xl" />
        <div>
          <h3 className="text-lg font-bold text-white">DailyReward Test</h3>
          <p className="text-sm text-gray-400">Test the DailyReward contract (10,000 CHESS)</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-[#23283a] p-3 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Contract Address:</p>
          <p className="text-xs text-white font-mono">{DAILY_REWARD_ADDRESS}</p>
        </div>
        
        <div className="bg-[#23283a] p-3 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Daily Reward Amount:</p>
          <p className="text-lg font-bold text-yellow-400">10,000 CHESS</p>
        </div>

        <button
          onClick={handleDailyRewardClaim}
          disabled={isLoading || !address}
          className="w-full px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <FiLoader className="animate-spin" /> : <FiGift />}
          {isClaiming ? "Claiming..." : isConfirming ? "Confirming..." : "Claim Daily Reward (10k CHESS)"}
        </button>

        {error && (
          <div className="p-3 text-sm bg-red-900/50 text-red-300 rounded-md flex items-center gap-2">
            <FiX size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 text-sm bg-green-900/50 text-green-300 rounded-md flex items-center gap-2">
            <FiCheck size={16} /> {success}
          </div>
        )}

        {isSuccess && (
          <div className="p-3 text-sm bg-blue-900/50 text-blue-300 rounded-md flex items-center gap-2">
            <FiCheck size={16} /> DailyReward claim confirmed! 10,000 CHESS transferred.
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyRewardTest;