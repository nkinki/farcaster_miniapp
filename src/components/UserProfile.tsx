// FÁJL: /src/components/UserProfile.tsx

"use client"

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useChessToken } from "@/hooks/useChessToken";
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader } from "react-icons/fi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { rewardsClaimAddress, rewardsClaimABI } from "@/abis/rewardsClaim";
import type { Hash } from "viem";

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
}

interface UserProfileProps {
  user: FarcasterUser;
  userStats: {
    totalEarnings: number;
    totalShares: number;
  };
  onClaimSuccess: () => void;
}

const UserProfile = ({ user, userStats, onClaimSuccess }: UserProfileProps) => {
  const { address } = useAccount();
  const { balance, formatChessAmount } = useChessToken();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [claimTxHash, setClaimTxHash] = useState<Hash | undefined>();
  const { writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ 
    hash: claimTxHash,
    onSuccess: () => {
        setSuccess("Transaction confirmed! Your rewards are on the way.");
        onClaimSuccess(); // Adatok újratöltése
    }
  });

  const pendingRewards = userStats.totalEarnings;
  const hasPendingRewards = pendingRewards > 0;

  const handleClaim = useCallback(async () => {
    if (!user.fid || !address) {
      setError("Farcaster user or wallet not found.");
      return;
    }
    setIsClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Aláírás kérése a backendtől
      const sigResponse = await fetch("/api/generate-claim-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid, recipientAddress: address }),
      });
      const sigData = await sigResponse.json();
      if (!sigResponse.ok) throw new Error(sigData.error || "Could not get claim signature.");

      const { signature, amount, nonce } = sigData;

      // 2. A smart contract `claim` függvényének meghívása az aláírással
      const hash = await writeContractAsync({
          address: rewardsClaimAddress,
          abi: rewardsClaimABI,
          functionName: 'claim',
          args: [address, BigInt(amount), signature],
      });
      setClaimTxHash(hash);
      setSuccess("Claim transaction sent! Waiting for confirmation...");

      // A `useWaitForTransactionReceipt` `onSuccess` callback-je fogja a többit intézni.

    } catch (err: any) {
      setError(err.shortMessage || err.message || "An unknown error occurred.");
      setIsClaiming(false);
    } 
    // A `finally` blokk itt nem kell, mert a `isConfirming` kezeli a betöltést
  }, [user.fid, address, writeContractAsync, onClaimSuccess]);

  const isLoading = isClaiming || isConfirming;

  return (
    <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <FiUser className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.displayName || user.username}</h2>
          <p className="text-gray-400">@{user.username} • FID: {user.fid}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#181c23] p-4 rounded-lg text-center">
          <p className="text-sm text-gray-400 mb-2">Total Shares</p>
          <p className="text-lg font-bold text-white">{userStats.totalShares}</p>
        </div>
        <div className="bg-[#181c23] p-4 rounded-lg text-center">
          <p className="text-sm text-gray-400 mb-2">Pending Rewards</p>
          <p className="text-lg font-bold text-white">{pendingRewards.toFixed(2)} $CHESS</p>
        </div>
        <div className="bg-[#181c23] p-4 rounded-lg text-center">
          <p className="text-sm text-gray-400 mb-2">Your Balance</p>
          <p className="text-lg font-bold text-white">{formatChessAmount(balance)} $CHESS</p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleClaim}
          disabled={isLoading || !hasPendingRewards || !address}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <FiLoader className="animate-spin" /> : <FiAward />}
          {isClaiming ? "Preparing..." : isConfirming ? "Confirming..." : `Claim ${pendingRewards.toFixed(2)} $CHESS`}
        </button>
        {error && <div className="p-2 text-sm bg-red-900/50 text-red-300 rounded-md flex items-center gap-2"><FiX size={16} /> {error}</div>}
        {success && <div className="p-2 text-sm bg-green-900/50 text-green-300 rounded-md flex items-center gap-2"><FiCheck size={16} /> {success}</div>}
      </div>
    </div>
  );
};

UserProfile.displayName = "UserProfile";

export default UserProfile;