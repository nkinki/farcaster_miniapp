"use client"

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useChessToken } from "@/hooks/useChessToken";
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader } from "react-icons/fi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { rewardsClaimAddress, rewardsClaimABI } from "@/abis/rewardsClaim"; // Győződj meg róla, hogy az útvonal helyes
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
  
  const [isClaiming, setIsClaiming] = useState(false); // Amíg az API-tól várjuk az aláírást
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [claimTxHash, setClaimTxHash] = useState<Hash | undefined>();
  const { writeContractAsync } = useWriteContract();

  // JAVÍTÁS: A `useWaitForTransactionReceipt` hooknak nincs `onSuccess` callbackje.
  // Ehelyett a `isSuccess` változót figyeljük egy külön `useEffect`-ben.
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash: claimTxHash,
  });

  // JAVÍTÁS: Ez a `useEffect` fut le, amikor a tranzakció sikeresen megerősítésre kerül.
  useEffect(() => {
    if (isSuccess) {
      setSuccess("Transaction confirmed! Your rewards are on the way.");
      onClaimSuccess(); // Adatok újratöltése
      // Reseteljük a tranzakció hash-t, hogy ne fusson le újra a useEffect
      setClaimTxHash(undefined); 
    }
  }, [isSuccess, onClaimSuccess]);

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
      // Először lekérjük a claim adatokat
      const sigResponse = await fetch("/api/generate-claim-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid, recipientAddress: address }),
      });
      const sigData = await sigResponse.json();
      if (!sigResponse.ok) throw new Error(sigData.error || "Could not get claim signature.");

      const { signature, amount, nonce } = sigData;

      const hash = await writeContractAsync({
          address: rewardsClaimAddress,
          abi: rewardsClaimABI,
          functionName: 'claim',
          args: [address, BigInt(amount), signature],
          gas: BigInt(200000), // Explicit gas limit beállítása
      });
      setClaimTxHash(hash);
      setSuccess("Claim transaction sent! Waiting for confirmation...");

    } catch (err: any) {
      console.error('Claim error:', err);
      let errorMessage = "An unknown error occurred.";
      
      if (err.shortMessage) {
        errorMessage = err.shortMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Specifikus gas fee hibák kezelése
      if (err.message?.includes('insufficient funds') || err.message?.includes('gas')) {
        errorMessage = "Insufficient funds for gas fee. Please ensure you have enough ETH in your wallet.";
      }
      
      if (err.message?.includes('execution reverted')) {
        errorMessage = "Transaction failed. The contract may not have enough tokens or there's an issue with the signature.";
      }
      
      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
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