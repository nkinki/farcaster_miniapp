"use client"

import { useState, useCallback } from "react"
import { useAccount } from "wagmi"
import { useChessToken } from "@/hooks/useChessToken"
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader } from "react-icons/fi"

interface FarcasterUser {
  fid: number
  username?: string; // Legyenek opcionálisak
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

// JAVÍTÁS: A `forwardRef`-et és a `UserProfileRef`-et teljesen eltávolítottuk,
// mert az új, egyszerűsített logikában már nincs rájuk szükség.
// A komponens most egy sima, standard React komponens.
const UserProfile = ({ user, userStats, onClaimSuccess }: UserProfileProps) => {
  const { address } = useAccount()
  const { balance, formatChessAmount } = useChessToken()

  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const pendingRewards = userStats.totalEarnings
  const hasPendingRewards = pendingRewards > 0

  const handleClaim = useCallback(async () => {
    if (!user.fid) {
      setError("Farcaster user not found.")
      return
    }

    setIsClaiming(true)
    setError(null)
    setSuccess(null)

    try {
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
      setSuccess(`Successfully claimed ${pendingRewards.toFixed(2)} $CHESS! Tx: ${txHashShort}`);
      
      // Meghívjuk a szülőtől kapott függvényt, hogy frissítse az összes adatot az oldalon
      onClaimSuccess();

    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
    } finally {
      setIsClaiming(false)
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 7000); // Hagyjunk több időt az üzenet olvasására
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <FiDollarSign className="text-green-400" />
            <span className="text-sm text-gray-400">Total Shares</span>
          </div>
          <p className="text-lg font-bold text-white">{userStats.totalShares}</p>
        </div>
        
        <div className="bg-[#181c23] p-4 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FiTrendingUp className="text-purple-400" />
            <span className="text-sm text-gray-400">Pending Rewards</span>
          </div>
          <p className="text-lg font-bold text-white">{pendingRewards.toFixed(2)}</p>
        </div>

        <div className="bg-[#181c23] p-4 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FiDollarSign className="text-green-400" />
            <span className="text-sm text-gray-400">CHESS Balance</span>
          </div>
          <p className="text-lg font-bold text-white">{formatChessAmount(balance)}</p>
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
}; // JAVÍTÁS: Itt záródik a komponens egy pontosvesszővel.

UserProfile.displayName = "UserProfile";

export default UserProfile;