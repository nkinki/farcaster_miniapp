"use client"

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp, FiCreditCard, FiShare } from 'react-icons/fi';
import { useAccount } from 'wagmi';
import { PromoCast } from '@/types/promotions';

// ... (FarcasterUser, FarcasterContext interfészek változatlanok)

interface UserProfileProps {
  userPromos: PromoCast[]; // Ezt a prop-ot meghagyjuk, hogy a számot ki tudjuk írni
  userStats?: {
    totalEarnings: number;
    totalShares: number;
    pendingClaims: number;
  };
}

export default function UserProfile({ userPromos = [], userStats }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    sdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setProfile(ctx.user);
      }
    });
  }, []);

  if (!profile) {
    return (
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
      <div 
        className="flex items-center justify-between cursor-pointer p-6 hover:bg-[#2a2f42] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {profile.pfpUrl && (
            <img src={profile.pfpUrl} alt="Profile" className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-white">{profile.displayName}</h3>
            <p className="text-purple-300 text-sm">@{profile.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-purple-400">
          <span>Stats</span>
          {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiDollarSign className="text-green-400" />
                <span className="text-white font-semibold">{userStats?.totalEarnings || 0}</span>
              </div>
              <p className="text-xs text-gray-400">Total Earnings</p>
            </div>
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiShare className="text-blue-400" />
                <span className="text-white font-semibold">{userStats?.totalShares || 0}</span>
              </div>
              <p className="text-xs text-gray-400">Total Shares</p>
            </div>
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiTrendingUp className="text-purple-400" />
                <span className="text-white font-semibold">{userPromos.length}</span>
              </div>
              <p className="text-xs text-gray-400">My Campaigns</p>
            </div>
          </div>
          {/* JAVÍTÁS: A "My Promotions" lista eltávolítva innen */}
        </div>
      )}
    </div>
  );
}