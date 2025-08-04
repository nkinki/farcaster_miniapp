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
    } catch (error) {
        console.error("Failed to fetch share timers:", error);
    }
  }, [currentUser]);
  
  const fetchPromotions = useCallback(async () => { /* ... változatlan ... */ }, []);
  const fetchUserStats = useCallback(async () => { /* ... változatlan ... */ }, [currentUser]);
  
  const refreshAllData = useCallback(async () => {
      setLoading(true);
      await Promise.all([ fetchPromotions(), fetchUserStats(), fetchShareTimers() ]);
      setLoading(false);
  }, [fetchPromotions, fetchUserStats, fetchShareTimers]);

  useEffect(() => {
    if (isAuthenticated && profile) {
      refreshAllData();
      const interval = setInterval(fetchShareTimers, 60000); // Percenként frissítjük az időzítőket
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, profile, refreshAllData, fetchShareTimers]);
  
  const handleCreateSuccess = () => { setShowForm(false); refreshAllData(); };
  const handleFundSuccess = () => { setShowFundingForm(false); setFundingPromo(null); refreshAllData(); };
  // ... a többi handler és logika változatlan ...
  const handleSharePromo = async (promo: PromoCast) => {
    // ...
    if (response.ok) {
      // ...
      refreshAllData(); // Sikeres megosztás után frissítünk mindent
    }
    // ...
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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}>
      <div className="max-w-4xl mx-auto">
        {/* ... (Header, UserProfile, MyCampaignsDropdown, Create gomb és Form változatlan) ... */}

        <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
            <button
                onClick={() => setIsShareListOpen(!isShareListOpen)}
                className="w-full flex items-center p-4 text-left text-white font-semibold text-lg hover:bg-[#2a2f42] transition-colors"
            >
                <div className="w-6"></div><span className="flex-1 text-center">Share & Earn ({availablePromos.length})</span><div className="w-6">{isShareListOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
            </button>

            {isShareListOpen && (
                <div className="p-4 border-t border-gray-700 space-y-4">
                  {sortedAvailablePromos.length === 0 ? (
                    <div className="text-center py-8"><div className="text-gray-400 text-lg">No other active campaigns right now.</div></div>
                  ) : (
                    sortedAvailablePromos.map((promo) => {
                      // JAVÍTÁS: Lekérjük a timer adatokat az adott promócióhoz a proaktív megjelenítéshez
                      const timerInfo = shareTimers[promo.id];
                      const canShare = timerInfo?.canShare ?? true; // Ha nincs adat, feltételezzük, hogy osztható

                      return (
                        <div key={promo.id} className="bg-[#181c23] p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
                          {/* ... (felső szekció info + "..." menü változatlan) ... */}
                          {/* ... (statisztika rács változatlan) ... */}
                          
                          {/* JAVÍTÁS: A Share gomb és a felette lévő időzítő sáv */}
                          <div>
                            {/* A sáv csak akkor jelenik meg, ha a limit aktív */}
                            {!canShare && timerInfo && (
                               <div className="w-full flex items-center justify-center gap-2 text-center text-yellow-400 font-semibold bg-yellow-900/50 py-2 px-4 rounded-lg mb-2">
                                 <FiClock size={16} />
                                 <span>{formatTimeRemaining(timerInfo.timeRemaining)}</span>
                               </div>
                            )}
                            <button
                               onClick={() => handleSharePromo(promo)}
                               // A gomb letiltása most már a `canShare` változótól függ
                               disabled={sharingPromoId === promo.id || !canShare}
                               className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed"
                            >
                              {sharingPromoId === promo.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <FiShare2 size={18} />}
                              {sharingPromoId === promo.id ? 'Processing...' : `Share & Earn ${promo.rewardPerShare} $CHESS`}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
            )}
        </div>
      </div>
      {/* ... (FundingForm Modal változatlan) ... */}
    </div>
  );
}