"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiMoreHorizontal, FiEye, FiChevronDown, FiChevronUp, FiClock, FiStar, FiAlertTriangle } from "react-icons/fi";
import Link from "next/link";
// JAVÍTÁS: A UserProfileRef-et eltávolítottuk, mert az új modellben már nincs rá szükség.
import UserProfile from "@/components/UserProfile";

import PaymentForm from "../../components/PaymentForm";
import CampaignManager from "../../components/CampaignManager";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";
import { usePromotions } from "@/hooks/usePromotions";
import type { PromoCast } from "@/types/promotions";

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface ShareTimer {
  promotionId: number;
  canShare: boolean;
  timeRemaining: number;
}

const formatTimeRemaining = (hours: number): string => {
    if (hours <= 0) return "Ready to share";
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m remaining`;
};

const calculateProgress = (promo: PromoCast): number => {
  if (promo.totalBudget === 0) return 0;
  const spent = promo.totalBudget - promo.remainingBudget;
  return Math.round((spent / promo.totalBudget) * 100);
};

export default function PromotePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCampaignManager, setShowCampaignManager] = useState(false);
  const [managingPromo, setManagingPromo] = useState<PromoCast | null>(null);
  const [userStats, setUserStats] = useState({ totalEarnings: 0, totalShares: 0, pendingRewards: 0 });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [shareTimers, setShareTimers] = useState<Record<string, ShareTimer>>({});
  const [isShareListOpen, setIsShareListOpen] = useState(false);
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const {
    promotions: allPromotions,
    loading: promotionsLoading,
    refetch: refetchPromotions,
  } = usePromotions({
    limit: 50,
    offset: 0,
    status: "all",
  });

  useEffect(() => {
    miniAppSdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setIsAuthenticated(true);
        setProfile(ctx.user as FarcasterUser);
      }
    }).catch(err => console.error("Farcaster context error:", err));
  }, []);

  const currentUser = useMemo(() => {
    if (isAuthenticated && profile) {
      return { 
        fid: profile.fid, 
        username: profile.username || "user", 
        displayName: profile.displayName || "Current User",
        pfpUrl: profile.pfpUrl
      };
    }
    return { fid: 0, username: "guest", displayName: "Guest" };
  }, [isAuthenticated, profile]);

  const fetchShareTimers = useCallback(async () => {
    if (!currentUser.fid) return;
    try {
        const response = await fetch(`/api/share-timers?fid=${currentUser.fid}`);
        if (response.ok) {
            const data = await response.json();
            // JAVÍTÁS: Az API most már `data.timers`-t ad vissza
            if (data.timers) {
              const timersMap = data.timers.reduce((acc: Record<string, ShareTimer>, timer: ShareTimer) => {
                  acc[timer.promotionId.toString()] = timer;
                  return acc;
              }, {});
              setShareTimers(timersMap);
            }
        }
    } catch (error) { console.error("Failed to fetch share timers:", error); }
  }, [currentUser.fid]);
  
  const fetchUserStats = useCallback(async () => {
    if (!currentUser.fid) return;
    try {
      const response = await fetch(`/api/users/${currentUser.fid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUserStats({
            totalEarnings: data.user.total_earnings,
            totalShares: data.user.total_shares,
            pendingRewards: data.user.pending_rewards,
          });
        }
      }
    } catch (error) { console.error("Failed to fetch user stats:", error); }
  }, [currentUser.fid]);
  
  // JAVÍTÁS: A refreshAllData most már stabil függőségekkel rendelkezik.
  const refreshAllData = useCallback(async () => {
      setLoading(true);
      await Promise.all([ refetchPromotions(), fetchUserStats(), fetchShareTimers() ]);
      setLoading(false);
  }, [refetchPromotions, fetchUserStats, fetchShareTimers]);

  // JAVÍTÁS: A fő useEffect függőségeit leegyszerűsítettük, hogy megszüntessük a végtelen ciklust.
  useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      refreshAllData();
      const interval = setInterval(fetchShareTimers, 60000);
      return () => clearInterval(interval);
    }
  // A refreshAllData és a fetchShareTimers már nem függőségek, mert a useCallback stabilizálja őket.
  }, [isAuthenticated, profile]);
  
  const handleCreateSuccess = () => { setShowForm(false); refreshAllData(); };
  const handleManageSuccess = () => { setShowCampaignManager(false); setManagingPromo(null); refreshAllData(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleManageCancel = () => { setShowCampaignManager(false); setManagingPromo(null); };

  const handleViewCast = (castUrl: string) => {
    try {
      const urlParts = castUrl.split('/');
      const castHash = urlParts[urlParts.length - 1];
      if (castHash && castHash.startsWith('0x')) { (miniAppSdk as any).actions.viewCast({ hash: castHash }); } 
      else { window.open(castUrl, '_blank'); }
    } catch (error) { window.open(castUrl, '_blank'); }
  };

  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated || !currentUser.fid) return alert("Please connect your Farcaster account first.");
    setSharingPromoId(promo.id.toString());
    try {
      const castResult = await (miniAppSdk as any).actions.composeCast({ text: promo.shareText || `Check this out!`, embeds: [promo.castUrl] });
      if (!castResult || !castResult.cast || !castResult.cast.hash) {
        setSharingPromoId(null);
        return;
      }
      const response = await fetch('/api/shares', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: Number(promo.id), sharerFid: currentUser.fid,
          sharerUsername: currentUser.username, castHash: castResult.cast.hash,
        }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || "Failed to record share on the backend."); }
      
      alert(`Shared successfully! You earned ${promo.rewardPerShare} $CHESS.`);
      
      await refreshAllData();

    } catch (error) {
      console.error("Error during share process:", error);
      setShareError(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setSharingPromoId(null);
    }
  };

  const myPromos = allPromotions.filter(p => p.author.fid === currentUser.fid);
  const availablePromos = allPromotions.filter(p => {
    if (p.status !== 'active' || p.author.fid === currentUser.fid) return false;
    if (p.remainingBudget < p.rewardPerShare) return false;
    return true;
  });

  const sortedAvailablePromos = useMemo(() => {
    return [...availablePromos].sort((a, b) => {
      const timerA = shareTimers[a.id.toString()];
      const timerB = shareTimers[b.id.toString()];
      const canShareA = timerA?.canShare ?? true;
      const canShareB = timerB?.canShare ?? true;

      if (canShareA && !canShareB) return -1;
      if (!canShareA && canShareB) return 1;
      return b.rewardPerShare - a.rewardPerShare;
    });
  }, [availablePromos, shareTimers]);

  if (loading || (promotionsLoading && allPromotions.length === 0)) {
    return <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center"><div className="text-purple-400 text-2xl font-bold animate-pulse">Loading Promotions...</div></div>
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2">
            <FiStar className="text-purple-300" size={24} />
            <h1 className="text-2xl font-bold text-white text-center">PROMOTIONS</h1>
          </div>
          <div className="flex items-center justify-start mt-1">
            <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors">
              <FiArrowLeft size={20} />
              <span>Back</span>
            </Link>
          </div>
        </div>

        {shareError && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
            <FiAlertTriangle className="text-red-400" />
            <span className="text-red-200">{shareError}</span>
            <button onClick={() => setShareError(null)} className="ml-auto text-red-400 hover:text-red-200">
              <FiX size={16} />
            </button>
          </div>
        )}

        <div className="mb-4">
          <UserProfile
            user={currentUser}
            userStats={userStats}
            onClaimSuccess={refreshAllData}
          />
        </div>


        
        <MyCampaignsDropdown myPromos={myPromos} onManageClick={(promo) => { setManagingPromo(promo); setShowCampaignManager(true); }} />
        
        <div className="flex justify-center my-8">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white shadow-lg"><FiPlus size={20} />Create Promotion</button>
        </div>
        
        {showForm && ( 
          <div id="promo-form" className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79] relative"> 
            <button className="absolute top-3 right-3 text-gray-400 hover:text-white" onClick={handleCreateCancel}>
              <FiX size={24} />
            </button> 
            <PaymentForm user={currentUser} onSuccess={handleCreateSuccess} onCancel={handleCreateCancel} /> 
          </div>
        )}

        <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
            <button onClick={() => setIsShareListOpen(!isShareListOpen)} className="w-full flex items-center p-4 text-left text-white font-semibold text-lg hover:bg-[#2a2f42] transition-colors">
                <FiShare2 className="text-purple-300 w-6" />
                <span className="flex-1 text-center">Share & Earn ({availablePromos.length})</span>
                <div className="w-6">{isShareListOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
            </button>
            {isShareListOpen && (
                <div className="p-4 border-t border-gray-700 space-y-4">
                  {sortedAvailablePromos.length === 0 ? (
                    <div className="text-center py-8"><div className="text-gray-400 text-lg">No other active campaigns right now.</div></div>
                  ) : (
                    sortedAvailablePromos.map((promo) => {
                      const timerInfo = shareTimers[promo.id.toString()];
                      const canShare = timerInfo?.canShare ?? true;
                      return (
                        <div key={promo.id} className="bg-[#181c23] p-4 rounded-lg border border-gray-700 flex flex-col gap-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 overflow-hidden pr-4">
                              <p className="text-white font-semibold truncate">{promo.castUrl}</p><p className="text-purple-300 text-sm">by @{promo.author.username}</p>
                            </div>
                            <div className="relative">
                              <button onClick={() => setOpenMenuId(openMenuId === promo.id.toString() ? null : promo.id.toString())} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"><FiMoreHorizontal size={20} /></button>
                              {openMenuId === promo.id.toString() && ( 
                                <div className="absolute right-0 mt-2 w-56 bg-[#2a2f42] border border-gray-600 rounded-lg shadow-xl z-10"> 
                                  <button onClick={() => handleViewCast(promo.castUrl)} className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-gray-700">
                                    <FiEye size={16} /> View Cast (In-App)
                                  </button> 
                                </div> 
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-white">
                            <div className="p-3 bg-gray-800 rounded-lg"><div className="flex items-center justify-center gap-1.5 mb-1 font-semibold"><FiDollarSign className="text-green-400" />{promo.rewardPerShare}</div><p className="text-xs text-gray-400">Reward/Share</p></div>
                            <div className="p-3 bg-gray-800 rounded-lg"><div className="flex items-center justify-center gap-1.5 mb-1 font-semibold"><FiUsers className="text-blue-400" />{promo.sharesCount}</div><p className="text-xs text-gray-400">Shares</p></div>
                            <div className="p-3 bg-gray-800 rounded-lg"><div className="mb-1 font-semibold">{promo.remainingBudget}</div><p className="text-xs text-gray-400">Remaining</p></div>
                            <div className="p-3 bg-gray-800 rounded-lg"><div className="mb-1 font-semibold">{promo.totalBudget}</div><p className="text-xs text-gray-400">Total Budget</p></div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${calculateProgress(promo)}%` }}></div>
                          </div>
                          <div>
                            {!canShare && timerInfo && (
                               <div className="w-full flex items-center justify-center gap-2 text-center text-yellow-400 font-semibold bg-yellow-900/50 py-2 px-4 rounded-lg mb-2">
                                 <FiClock size={16} /><span>{formatTimeRemaining(timerInfo.timeRemaining)}</span>
                               </div>
                            )}
                            <button onClick={() => handleSharePromo(promo)} disabled={sharingPromoId === promo.id.toString() || !canShare} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed">
                              {sharingPromoId === promo.id.toString() ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <FiShare2 size={18} />}
                              {sharingPromoId === promo.id.toString() ? 'Processing...' : `Share & Earn ${promo.rewardPerShare} $CHESS`}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
            )}
        </div>
        
        {showCampaignManager && managingPromo && (
          <CampaignManager 
            promotionId={managingPromo.id} 
            currentStatus={managingPromo.status}
            castUrl={managingPromo.castUrl} 
            onSuccess={handleManageSuccess} 
            onCancel={handleManageCancel} 
          />
        )}
        
        <div className="mt-8 flex justify-center">
          <ConnectWalletButton />
        </div>
      </div>
    </div>
  );
}