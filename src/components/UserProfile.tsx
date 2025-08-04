"use client"

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp, FiShare, FiAward } from 'react-icons/fi';
import { PromoCast } from '@/types/promotions';

// FarcasterUser típust ideiglenesen itt hagyjuk
interface FarcasterUser {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
}

interface UserProfileProps {
  userPromos: PromoCast[];
  userStats: {
    totalEarnings: number;
    totalShares: number;
    pendingClaims: number;
  };
}

export default function UserProfile({ userPromos = [], userStats }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Alapból legyen nyitva, hogy a felhasználó lássa a statisztikáit
  const [profile, setProfile] = useState<FarcasterUser | null>(null);

  useEffect(() => {
    sdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setProfile(ctx.user as FarcasterUser);
      }
    });
  }, []);

  const handleClaim = () => {
    // TODO: A `claimReward` smart contract függvény meghívása.
    // Mivel a jelenlegi contract kampányonkénti kifizetést támogat (`claimReward(campaignId)`),
    // egy "Claim All" funkcióhoz vagy egy új contract függvényre, vagy egy frontend oldali
    // iterációra lenne szükség, ami több tranzakciót indít.
    // Egyelőre egy üzenetet jelenítünk meg.
    alert(`Claiming ${userStats.pendingClaims} $CHESS... (Functionality coming soon!)`);
  };

  if (!profile) {
    return (
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-3/4 mx-auto"></div>
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
          <span>My Stats</span>
          {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-700 pt-4">
          {/* JAVÍTÁS: A grid most már mindig 3 oszlopos a szimmetria érdekében. */}
          <div className="grid grid-cols-3 gap-4">
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
          
          {/* JAVÍTÁS: Új "Claim" gomb a statisztikák alatt */}
          <div className="mt-4">
            <button
              onClick={handleClaim}
              disabled={!userStats.pendingClaims || userStats.pendingClaims === 0}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
            >
              <FiAward size={20} />
              Claim {userStats.pendingClaims || 0} $CHESS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}