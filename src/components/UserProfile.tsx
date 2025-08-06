"use client"

import { useState, useCallback } from "react"
import { useAccount } from "wagmi"
import { useChessToken } from "@/hooks/useChessToken"
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader } from "react-icons/fi"

interface FarcasterUser {
  fid: number
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

// JAVÍTÁS: A komponens most már nem használja a bonyolult useFarcasterPromo hookot.
const UserProfile = ({ user, userStats, onClaimSuccess }: UserProfileProps) => {
  const { address } = useAccount()
  const { balance, formatChessAmount } = useChessToken()

  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // A felvehető jutalom közvetlenül a DB-ből jön a userStats prop-on keresztül.
  const pendingRewards = userStats.totalEarnings
  const hasPendingRewards = pendingRewards > 0

  // A "Claim" gomb logikája egy egyszerű API hívás a backend felé.
  const handleClaim = useCallback(async () => {
    if (!user.fid) {
      setError("Farcaster user not found.")
      return
    }

    setIsClaiming(true)
    setError(null)
    setSuccess(null)

    try {
      // Az új, backend-alapú claim végpontot hívjuk.
      const response = await fetch("/api/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to claim rewards.");
      }

      const txHashShort = data.transactionHash ? `${data.transactionHash.slice(0, 6)}...${data.transactionHash.slice(-4)}` : '';
      setSuccess(`Claim successful! Tx: ${txHashShort}`);
      
      // Szólunk a szülőnek (page.tsx), hogy frissítse az adatokat (pl. a userStats-ot).
      onClaimSuccess();

    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsClaiming(false)
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 7000);
    }
  }, [user.fid, pendingRewards, onClaimSuccess]);

  return (
    <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
          <FiUser className="text-white text-xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{user.displayName || user.username}</h2>
          <p className="text-gray-400">
            @{user.username} • FID: {user.fid}
          </p>
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
          disabled={isClaiming || !hasPendingRewards || !address}
          className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isClaiming ? <FiLoader className="animate-spin" /> : <FiAward />}
          {isClaiming ? "Processing Claim..." : `Claim ${pendingRewards.toFixed(2)} $CHESS`}
        </button>
        
        {error && (
          <div className="p-2 text-sm bg-red-900/50 text-red-300 rounded-md flex items-center gap-2">
            <FiX size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="p-2 text-sm bg-green-900/50 text-green-300 rounded-md flex items-center gap-2">
            <FiCheck size={16} /> {success}
          </div>
        )}
      </div>
    </div>
  );
};

UserProfile.displayName = "UserProfile";

export default UserProfile;