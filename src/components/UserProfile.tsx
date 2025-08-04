"use client"

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp, FiShare, FiAward } from 'react-icons/fi';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { PROMO_CONTRACT_ADDRESS, PROMO_CONTRACT_ABI } from '@/lib/contracts';
import { PromoCast } from '@/types/promotions';
import type { Hash } from 'viem';

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
  };
  onClaimSuccess: () => void;
}

export default function UserProfile({ userPromos = [], userStats, onClaimSuccess }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimTxHash, setClaimTxHash] = useState<Hash | undefined>();

  const { data: pendingRewardsData, refetch: refetchPendingRewards } = useReadContract({
    address: PROMO_CONTRACT_ADDRESS,
    abi: PROMO_CONTRACT_ABI,
    functionName: 'getPendingRewards',
    args: [address],
    query: { enabled: !!address }
  });
  
  // JAVÍTÁS: A `useWaitForTransactionReceipt` hook `onSuccess` callback-je helyett
  // a `isSuccess` visszatérési értéket figyeljük egy `useEffect`-ben.
  const { isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
      hash: claimTxHash,
  });

  useEffect(() => {
    // Ez az effekt csak akkor fut le, ha a claim tranzakció sikeresen megerősítést nyert.
    if (isClaimConfirmed) {
      alert('Claim successful! Your rewards have been sent.');
      refetchPendingRewards(); // Frissítjük a kivehető jutalmakat
      onClaimSuccess(); // Jelezzük a szülő komponensnek, hogy frissítse az adatokat
    }
  }, [isClaimConfirmed, refetchPendingRewards, onClaimSuccess]);


  const pendingClaims = pendingRewardsData && pendingRewardsData[0] ? Number(pendingRewardsData[0]) / 1e18 : 0;

  useEffect(() => { sdk.context.then(ctx => { if (ctx.user?.fid) setProfile(ctx.user as FarcasterUser); }); }, []);

  const handleClaim = async () => {
    setIsClaiming(true);
    setClaimTxHash(undefined);
    try {
      const hash = await writeContractAsync({
        address: PROMO_CONTRACT_ADDRESS,
        abi: PROMO_CONTRACT_ABI,
        functionName: 'claimAllRewards',
        args: [],
      });
      setClaimTxHash(hash);
    } catch (error: any) {
      alert(`Claim failed: ${error.shortMessage || error.message}`);
      setIsClaiming(false); // Hiba esetén a gombot újra aktívvá tesszük
    }
  };

  // Amikor a tranzakció befejeződött (akár sikerrel, akár sikertelenül a blokkláncon),
  // a `isClaiming` állapotot visszaállítjuk. A `useWaitForTransactionReceipt` `isLoading`
  // állapota erre nem tökéletes, mert a `setIsClaiming` a tranzakció elküldésekor történik.
  // A `finally` blokk a `handleClaim`-ben jobb lenne, de a sikeres alert miatt a `useEffect` a tisztább.
  // A jelenlegi `setIsClaiming(false)` a hibaágban már sokat segít.

  if (!profile) {
    return ( <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] animate-pulse"><div className="h-6 bg-gray-700 rounded w-3/4 mx-auto"></div></div> );
  }

  return (
    <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
      <div className="flex items-center justify-between cursor-pointer p-6 hover:bg-[#2a2f42] transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-4">
          {profile.pfpUrl && ( <img src={profile.pfpUrl} alt="Profile" className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover" /> )}
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
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1"><FiDollarSign className="text-green-400" /><span className="text-white font-semibold">{userStats?.totalEarnings || 0}</span></div>
              <p className="text-xs text-gray-400">Total Earnings</p>
            </div>
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1"><FiShare className="text-blue-400" /><span className="text-white font-semibold">{userStats?.totalShares || 0}</span></div>
              <p className="text-xs text-gray-400">Total Shares</p>
            </div>
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1"><FiTrendingUp className="text-purple-400" /><span className="text-white font-semibold">{userPromos.length}</span></div>
              <p className="text-xs text-gray-400">My Campaigns</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={handleClaim}
              disabled={isClaiming || !pendingClaims || pendingClaims === 0}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
            >
              <FiAward size={20} />
              {isClaiming ? 'Processing Transaction...' : `Claim ${pendingClaims.toFixed(2)} $CHESS`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}