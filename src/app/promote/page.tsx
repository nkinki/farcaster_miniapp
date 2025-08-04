"use client"

import { useState, useEffect, useCallback, useMemo } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiMoreHorizontal, FiEye, FiChevronDown, FiChevronUp, FiClock } from "react-icons/fi";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import PaymentForm from "../../components/PaymentForm";
import FundingForm from "../../components/FundingForm";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { PromoCast, DatabasePromotion } from "@/types/promotions";
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";

// Típusok és helper függvények
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

const convertDbToPromoCast = (dbPromo: DatabasePromotion): PromoCast => ({
  id: dbPromo.id.toString(),
  castUrl: dbPromo.cast_url,
  author: { fid: dbPromo.fid, username: dbPromo.username, displayName: dbPromo.display_name || dbPromo.username },
  rewardPerShare: dbPromo.reward_per_share,
  totalBudget: dbPromo.total_budget,
  sharesCount: dbPromo.shares_count,
  remainingBudget: dbPromo.remaining_budget,
  shareText: dbPromo.share_text || undefined,
  createdAt: dbPromo.created_at,
  status: dbPromo.status,
  blockchainHash: dbPromo.blockchain_hash || undefined,
  contractCampaignId: dbPromo.contract_campaign_id ?? undefined,
});

const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) return "Ready to share";
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m remaining`;
};

export default function PromotePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFundingForm, setShowFundingForm] = useState(false);
  const [fundingPromo, setFundingPromo] = useState<PromoCast | null>(null);
  const [userStats, setUserStats] = useState({ totalEarnings: 0, totalShares: 0, pendingClaims: 0 });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareTimers, setShareTimers] = useState<Record<string, { canShare: boolean; timeRemaining: number }>>({});
  const [isShareListOpen, setIsShareListOpen] = useState(false);
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null);

  useEffect(() => {
    miniAppSdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setIsAuthenticated(true);
        setProfile(ctx.user as FarcasterUser);
      }
    });
  }, []);

  const currentUser = useMemo(() => {
    if (isAuthenticated && profile) {
      return { fid: profile.fid, username: profile.username || "user", displayName: profile.displayName || "Current User" };
    }
    return { fid: 0, username: "guest", displayName: "Guest" };
  }, [isAuthenticated, profile]);

  const fetchShareTimers = useCallback(async () => {
    if (!currentUser.fid) return;
    try {
        const response = await fetch(`/api/share-timers?fid=${currentUser.fid}`);
        if (response.ok) {
            const data = await response.json();
            const timersMap = data.timers.reduce((acc: any, timer: any) => {
                acc[timer.promotionId] = { canShare: timer.canShare, timeRemaining: timer.timeRemaining };
                return acc;
            }, {});
            setShareTimers(timersMap);
        }
    } catch (error) { console.error("Failed to fetch share timers:", error); }
  }, [currentUser]);
  
  const fetchPromotions = useCallback(async () => { /* ... */ }, []);
  const fetchUserStats = useCallback(async () => { /* ... */ }, [currentUser]);
  
  const refreshAllData = useCallback(async () => {
      setLoading(true);
      await Promise.all([ fetchPromotions(), fetchUserStats(), fetchShareTimers() ]);
      setLoading(false);
  }, [fetchPromotions, fetchUserStats, fetchShareTimers]);

  useEffect(() => {
    if (isAuthenticated && profile) {
      refreshAllData();
      const interval = setInterval(fetchShareTimers, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, profile, refreshAllData, fetchShareTimers]);
  
  const handleCreateSuccess = () => { setShowForm(false); refreshAllData(); };
  const handleFundSuccess = () => { setShowFundingForm(false); setFundingPromo(null); refreshAllData(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleFundCancel = () => { setShowFundingForm(false); setFundingPromo(null); };

  const handleViewCast = (castUrl: string) => {
    try {
      const urlParts = castUrl.split('/');
      const castHash = urlParts[urlParts.length - 1];
      if (castHash && castHash.startsWith('0x')) { miniAppSdk.actions.viewCast({ hash: castHash }); } 
      else { window.open(castUrl, '_blank'); }
    } catch (error) { window.open(castUrl, '_blank'); }
  };

  // JAVÍTÁS: A `handleSharePromo` függvény teljes és helyes logikája
  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated || !currentUser.fid) return alert("Please connect your Farcaster account first.");
    setSharingPromoId(promo.id);
    try {
      const castResult = await miniAppSdk.actions.composeCast({ 
        text: promo.shareText || `Check this out!`, 
        embeds: [promo.castUrl] 
      });
      
      if (!castResult || !castResult.cast || !castResult.cast.hash) {
        console.log("Cast was cancelled by user.");
        setSharingPromoId(null);
        return;
      }
      
      const response = await fetch('/api/shares', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: Number(promo.id), 
          sharerFid: currentUser.fid,
          sharerUsername: currentUser.username, 
          castHash: castResult.cast.hash,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to record share on the backend.");
      }

      alert(`Shared successfully! You earned ${promo.rewardPerShare} $CHESS.`);
      refreshAllData(); // Sikeres megosztás után frissítünk mindent

    } catch (error) {
      console.error("Error during share process:", error);
      alert(`Share failed: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
      setSharingPromoId(null);
    }
  };

  const myPromos = promoCasts.filter(p => p.author.fid === currentUser.fid);
  const availablePromos = promoCasts.filter(p => p.status === 'active' && p.author.fid !== currentUser.fid);

  const sortedAvailablePromos = useMemo(() => {
    return [...availablePromos].sort((a, b) => {
      const canShareA = shareTimers[a.id]?.canShare ?? true;
      const canShareB = shareTimers[b.id]?.canShare ?? true;
      if (canShareA && !canShareB) return -1;
      if (!canShareA && canShareB) return 1;
      return b.rewardPerShare - a.rewardPerShare;
    });
  }, [availablePromos, shareTimers]);

  if (loading && !promoCasts.length) {
    return <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center"><div className="text-purple-400 text-2xl font-bold animate-pulse">Loading Promotions...</div></div>
  }

  // A JSX rész innentől változatlan, mert a logika javítása a függvényen belül történt.
  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}>
      {/* ... a teljes JSX kód itt ... */}
    </div>
  );
}