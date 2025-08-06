"use client"

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useChessToken } from "@/hooks/useChessToken";
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader } from "react-icons/fi";
// Már nem használjuk a szerződést, csak az API-t

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

  const pendingRewards = userStats.totalEarnings;
  const hasPendingRewards = pendingRewards > 0;

  const handleClaim = useCallback(async () => {
    if (!user.fid) {
      setError("Farcaster user not found.");
      return;
    }
    setIsClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      // Használjuk a claim-rewards API-t (approve mechanizmus)
      const claimResponse = await fetch("/api/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid }),
      });
      
      const claimData = await claimResponse.json();
      
      if (!claimResponse.ok) {
        throw new Error(claimData.error || "Claim failed.");
      }

      // Sikeres claim
      setSuccess(`Claim successful! Transaction hash: ${claimData.transactionHash}`);
      onClaimSuccess(); // Adatok újratöltése

    } catch (err: any) {
      console.error('Claim error:', err);
      let errorMessage = "An unknown error occurred.";
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Specifikus hibák kezelése
      if (err.message?.includes('No rewards to claim')) {
        errorMessage = "No rewards available to claim.";
      } else if (err.message?.includes('Could not find a valid wallet')) {
        errorMessage = "Please connect a verified wallet to your Farcaster account.";
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = "Backend wallet has insufficient funds. Please contact support.";
      }
      
      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  }, [user.fid, onClaimSuccess]);

  const isLoading = isClaiming;

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
          disabled={isLoading || !hasPendingRewards}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? <FiLoader className="animate-spin" /> : <FiAward />}
          {isClaiming ? "Processing..." : `Claim ${pendingRewards.toFixed(2)} $CHESS`}
        </button>
        {error && <div className="p-2 text-sm bg-red-900/50 text-red-300 rounded-md flex items-center gap-2"><FiX size={16} /> {error}</div>}
        {success && <div className="p-2 text-sm bg-green-900/50 text-green-300 rounded-md flex items-center gap-2"><FiCheck size={16} /> {success}</div>}
      </div>
    </div>
  );
};

UserProfile.displayName = "UserProfile";

export default UserProfile;