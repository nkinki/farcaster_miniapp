"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiMoreHorizontal, FiEye, FiChevronDown, FiChevronUp, FiClock, FiStar, FiAlertTriangle } from "react-icons/fi";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import PaymentForm from "../../components/PaymentForm";
import CampaignManager from "../../components/CampaignManager";
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";
import LuckyBox from "@/components/LuckyBox";
import { usePromotions } from "@/hooks/usePromotions";
import type { PromoCast } from "@/types/promotions";
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import { SignInButton, useProfile } from '@farcaster/auth-kit';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { formatUnits } from 'viem';

// Share szövegek promótereknek - AppRank lehetőségek népszerűsítése
const SHARE_TEXTS = [
  "🚀 Want to promote your content? Try AppRank for free and reach thousands!",
  "⭐ Content creators! AppRank offers free promotion opportunities - check it out!",
  "🌐 Need more visibility? AppRank helps you promote for free - give it a try!",
  "♟️ Promote your project on AppRank! Free trial available - why not test it?",
  "🎯 Looking for promotion? AppRank is your solution - try it free today!",
  "💸 Boost your reach with AppRank! Free promotion available - test it now!",
  "🎮 Level up your marketing with AppRank! Free trial - what do you have to lose?",
  "👀 Want alpha promotion results? Try AppRank for free and see the difference!",
  "🔥 Ready to promote? AppRank offers free opportunities - give it a shot!",
  "🏆 Serious about promotion? AppRank delivers results - try it free first!",
  "🚀 Promote smarter with AppRank! Free trial available - test the waters!",
  "💰 Need promotion that works? AppRank offers free testing - why wait?",
  "✨ Discover AppRank's promotion power! Free trial available - try it today!",
  "⚡ Quick promotion results? AppRank delivers - free trial, no risk!",
  "🎁 Gift yourself better promotion! AppRank offers free trials - start now!"
];

// New Channel Distribution: 80% Home Feed + 20% targeted channels
const SELECTED_CHANNELS = [
  { id: '', name: 'Home Feed', weight: 80, description: 'Maximum safety and reach' },
  { id: 'crypto', name: 'Crypto', weight: 3, description: 'Crypto discussions' },
  { id: 'web3', name: 'Web3', weight: 3, description: 'Web3 technologies' },
  { id: 'farcaster', name: 'Farcaster', weight: 3, description: 'Farcaster platform' },
  { id: 'founders', name: 'Founders', weight: 3, description: 'Startup founders' },
  { id: 'builders', name: 'Builders', weight: 3, description: 'Builder community' },
  { id: 'airdrop', name: 'Airdrop', weight: 3, description: 'Airdrop community' },
  { id: 'onchain', name: 'Onchain', weight: 2, description: 'Onchain activity' }
];

// Súlyozott véletlenszerű csatorna kiválasztás
const getRandomChannel = (): string => {
  const totalWeight = SELECTED_CHANNELS.reduce((sum, channel) => sum + channel.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const channel of SELECTED_CHANNELS) {
    random -= channel.weight;
    if (random <= 0) {
      return channel.id;
    }
  }
  
  return ''; // Fallback: Home Feed
};



// Fallback csatornák listája hiba esetén - prioritás szerint
const getChannelFallbacks = (failedChannel: string): (string | null)[] => {
  // Prioritás: Home Feed → nagyobb súlyú csatornák → kisebbek
  const fallbacks = SELECTED_CHANNELS
    .filter(ch => ch.id !== failedChannel)
    .sort((a, b) => b.weight - a.weight) // Súly szerint csökkenő sorrendben
    .map(ch => ch.id === '' ? null : ch.id); // Home Feed = null
  
  // Mindig legyen Home Feed az utolsó fallback
  if (!fallbacks.includes(null)) {
    fallbacks.push(null);
  }
  
  return fallbacks;
};

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
  // Wallet hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Farcaster Auth hooks
  const { isAuthenticated: fcAuthenticated, profile: fcProfile } = useProfile();
  
  // $CHESS token balance
  const { data: chessBalance, isLoading: balanceLoading } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000, // Refresh every 10 seconds
    }
  });
  
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
  
  // Lucky Box state
  const [showLuckyBox, setShowLuckyBox] = useState(false);
  const [luckyBoxReward, setLuckyBoxReward] = useState<number>(0);


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
  
  const refreshAllData = useCallback(async () => {
      setLoading(true);
      await Promise.all([ refetchPromotions(), fetchUserStats(), fetchShareTimers() ]);
      setLoading(false);
  }, [refetchPromotions, fetchUserStats, fetchShareTimers]);

  useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      refreshAllData();
      const interval = setInterval(fetchShareTimers, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, profile]);
  
  const handleCreateSuccess = () => { 
    setShowForm(false); 
    refreshAllData(); 
    // Trigger Lucky Box after successful campaign creation
    setShowLuckyBox(true);
  };
  const handleManageSuccess = () => { setShowCampaignManager(false); setManagingPromo(null); refreshAllData(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleManageCancel = () => { setShowCampaignManager(false); setManagingPromo(null); };

  // Lucky Box handlers
  const handleLuckyBoxClaim = async (amount: number) => {
    try {
      // Update user stats with the reward
      setUserStats(prev => ({
        ...prev,
        totalEarnings: prev.totalEarnings + amount,
        pendingRewards: prev.pendingRewards + amount
      }));
      
      setLuckyBoxReward(amount);
      
      // Optional: Send to backend to track rewards
      await fetch('/api/user/lucky-box-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fid: profile?.fid, 
          amount,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log(`🎁 Lucky Box reward claimed: ${amount} CHESS`);
    } catch (error) {
      console.error('Failed to process lucky box reward:', error);
    }
  };

  const handleLuckyBoxClose = () => {
    setShowLuckyBox(false);
    setLuckyBoxReward(0);
  };

  const handleDeleteCampaign = async (promo: PromoCast) => {
    try {
      const response = await fetch(`/api/promotions/${promo.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }

      console.log('✅ Campaign deleted successfully!');
      setShowCampaignManager(false);
      setManagingPromo(null);
      refreshAllData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      console.error('❌ Failed to delete campaign:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleViewCast = (castUrl: string) => {
    try {
      const urlParts = castUrl.split('/');
      const castHash = urlParts[urlParts.length - 1];
      if (castHash && castHash.startsWith('0x')) { (miniAppSdk as any).actions.viewCast({ hash: castHash }); } 
      else { window.open(castUrl, '_blank'); }
    } catch (error) { window.open(castUrl, '_blank'); }
  };



  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated || !currentUser.fid) {
      console.error("❌ Please connect your Farcaster account first.");
      return;
    }
    
    setShareError(null);
    setSharingPromoId(promo.id.toString());
    
    try {
      // Minden megosztásnál új random AppRank szöveg generálása
      const randomAppRankText = SHARE_TEXTS[Math.floor(Math.random() * SHARE_TEXTS.length)];
      
      // Premium check: ha a promo 5M+ budget volt, akkor nincs AppRank szöveg
      const isPremium = promo.totalBudget >= 5000000;
      const finalText = isPremium 
        ? (promo.shareText || ``) // Premium: csak user szöveg, ha nincs akkor üres
        : (promo.shareText 
            ? `${randomAppRankText} ${promo.shareText}` // Normál: random AppRank + user szöveg
            : randomAppRankText // Normál: csak random AppRank szöveg
          );
      
      // Véletlenszerű csatorna kiválasztása minden megosztásnál
      const randomChannel = getRandomChannel();
      
      // URL típus felismerés és kezelés
      console.log(`🔍 Original URL: ${promo.castUrl}`);
      
      const castOptions: any = { 
        text: finalText
      };
      
      // URL típus ellenőrzése és cast hash kinyerése
      const shortHash = promo.castUrl.split('/').pop();
      const isWarpcastUrl = promo.castUrl.includes('warpcast.com');
      const isFarcasterUrl = promo.castUrl.includes('farcaster.xyz');
      const isConversationUrl = promo.castUrl.includes('/conversations/');
      
      // Teljes cast hash lekérése API-ból (ha rövid hash)
      let castHash: string | undefined = shortHash;
      let hasValidCastHash: boolean = false;
      
      // Egyszerű megközelítés: csak akkor quote cast, ha már hosszú hash van
      // Rövid hash-ek → embed (biztonságosabb és stabil)
      
      // Farcaster cast hash validáció: 256-bit Blake2B = 64 hex chars + 0x = 66 chars total
      // VAGY 42 karakteres hash is elfogadható (gyakori formátum)
      hasValidCastHash = Boolean(castHash && castHash.startsWith('0x') && (castHash.length === 66 || castHash.length === 42));
      
      console.log(`🔍 URL Analysis:`, {
        isWarpcastUrl,
        isFarcasterUrl, 
        isConversationUrl,
        shortHash,
        castHash,
        hashLength: castHash?.length || 0,
        hasValidCastHash
      });
      
      if (hasValidCastHash) {
        // Valid 256-bit cast hash - quote cast + AppRank miniapp link
        castOptions.parent = { 
          type: 'cast', 
          hash: castHash 
        };
        // Hozzáadjuk az AppRank miniapp linket is
        castOptions.embeds = ['https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank'];
        console.log(`🔗 Creating quote cast with hash: ${castHash} + AppRank embed`);
      } else {
        // Rövid hash vagy nincs hash - csak embed (biztonságosabb)
        castOptions.embeds = [promo.castUrl];
        console.log(`📎 Creating embed with URL: ${promo.castUrl} (hash: ${castHash}, length: ${castHash?.length || 0} chars)`);
      }
      
      // Ha nem Home Feed, akkor hozzáadjuk a csatornát
      if (randomChannel) {
        castOptions.channelKey = randomChannel;
      }
      
      console.log(`🎯 Selected channel: "${randomChannel || 'Home Feed'}"`);
      console.log(`📊 New Channel Distribution: Home Feed (80%), Crypto (3%), Web3 (3%), Farcaster (3%), Founders (3%), Builders (3%), Airdrop (3%), Onchain (2%)`);
      console.log(`📝 Cast options:`, castOptions);
      
      // Fallback rendszer: próbáljuk meg különböző csatornákkal
      let castResult = null;
      let attemptedChannels: (string | null)[] = [randomChannel];
      
      try {
        castResult = await (miniAppSdk as any).actions.composeCast(castOptions);
      } catch (channelError) {
        console.log(`❌ Channel "${randomChannel}" failed, trying fallbacks...`);
        
        // Fallback csatornák lekérése
        const fallbackChannels = getChannelFallbacks(randomChannel);
        
        for (const fallbackChannel of fallbackChannels) {
          if (attemptedChannels.includes(fallbackChannel)) continue;
          
          try {
            const fallbackOptions = { ...castOptions };
            if (fallbackChannel) {
              fallbackOptions.channelKey = fallbackChannel;
            } else {
              delete fallbackOptions.channelKey; // Home Feed
            }
            
            console.log(`🔄 Trying fallback channel: "${fallbackChannel || 'Home Feed'}"`);
            castResult = await (miniAppSdk as any).actions.composeCast(fallbackOptions);
            
            if (castResult && castResult.cast && castResult.cast.hash) {
              console.log(`✅ Success with fallback channel: "${fallbackChannel || 'Home Feed'}"`);
              break;
            }
          } catch (fallbackError) {
            console.log(`❌ Fallback channel "${fallbackChannel || 'Home Feed'}" also failed`);
            attemptedChannels.push(fallbackChannel);
            continue;
          }
        }
      }
      
      if (!castResult || !castResult.cast || !castResult.cast.hash) {
        console.error(`❌ All channels failed. Attempted: ${attemptedChannels.join(', ')}`);
        throw new Error(`Failed to share in any channel. Tried: ${attemptedChannels.map(ch => ch || 'Home Feed').join(', ')}`);
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
      
      console.log(`✅ Shared successfully! You earned ${promo.rewardPerShare} $CHESS.`);
      
      await refreshAllData();

    } catch (error) {
      console.error("Error during share process:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setShareError(errorMessage);
      
      if (errorMessage.includes('can share this campaign again in')) {
        console.error(`❌ Share error: ${errorMessage}`);
      }
    } finally {
      setSharingPromoId(null);
    }
  };

  const myPromos = allPromotions.filter(
    p => p.author.fid === currentUser.fid
  );
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
          <div className="flex items-center justify-center">
            <div className="bg-[#23283a] border border-[#a64d79] rounded-2xl px-6 py-3 flex items-center gap-2 shadow-sm mx-auto pulse-glow">
              <FiStar className="text-purple-300" size={24} />
              <h1 className="text-2xl font-bold text-white text-center tracking-wide">PROMOTIONS</h1>
              <FiStar className="text-purple-300" size={24} />
            </div>
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

        <MyCampaignsDropdown myPromos={myPromos} onManageClick={(promo) => { setManagingPromo(promo); setShowCampaignManager(true); }} onDeleteClick={handleDeleteCampaign} />
        
        <div className="flex justify-center my-8">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg pulse-glow"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <FiPlus size={20} />Create Promotion
            </button>
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
            onDeleteClick={handleDeleteCampaign}
          />
        )} 

        {/* Lucky Box Success Message */}
        {luckyBoxReward > 0 && (
          <div className="flex justify-center mt-4 mb-6">
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-white font-bold">Lucky Box Opened!</div>
              <div className="text-yellow-300 text-lg font-bold">+{luckyBoxReward.toLocaleString()} CHESS</div>
              <div className="text-gray-300 text-sm">Added to your earnings!</div>
            </div>
          </div>
        )}

        {/* AppRank Group gomb közelebb a Share & Earn szekcióhoz */}
        <div className="flex justify-center mt-6 mb-8">
          <button
            onClick={() => {
              try {
                (miniAppSdk as any).actions.openUrl('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw');
              } catch (error) {
                console.log('SDK openUrl error:', error);
                // Fallback to window.open if SDK fails
                window.open('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw', '_blank');
              }
            }}
            className="flex items-center gap-4 px-8 py-4 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-xl transition-all duration-300"
          >
            👥 Join AppRank Group
          </button>
        </div>

        {/* Wallet Connection Section - Szolidabb design */}
        <div className="flex flex-col items-center gap-3 mt-6 mb-4 p-4 bg-black/20 rounded-lg border border-gray-600/30">
          
          {/* Wallet Status */}
          <div className="flex flex-col items-center gap-2">
            {isConnected ? (
              <div className="flex flex-col items-center gap-1">
                <div className="text-gray-400 text-sm opacity-80">
                  wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
                <div className="text-gray-300 text-xs opacity-70">
                  chess: {
                    balanceLoading ? 'loading...' : 
                    chessBalance ? `${parseFloat(formatUnits(chessBalance, 18)).toFixed(2)}` : 
                    '0.00'
                  }
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded border border-gray-500/30 transition-all duration-300"
                >
                  disconnect
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="text-gray-400 text-xs opacity-60">
                  connect wallet for chess balance & approvals
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      className="px-2 py-1 text-xs bg-gray-700/40 hover:bg-gray-600/40 text-gray-300 rounded border border-gray-500/20 transition-all duration-300"
                    >
                      {connector.name.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Farcaster Auth Status */}
          {!fcAuthenticated && (
            <div className="flex flex-col items-center gap-1 pt-2 border-t border-gray-600/20">
              <div className="text-gray-400 text-xs opacity-60">
                farcaster auth for full features
              </div>
              <div className="scale-75">
                <SignInButton
                  onSuccess={({ fid, username }) => {
                    console.log(`Farcaster signed in: ${username} (${fid})`);
                  }}
                />
              </div>
            </div>
          )}
          
          {fcAuthenticated && (
            <div className="text-gray-400 text-xs opacity-70 pt-1 border-t border-gray-600/20">
              farcaster: {fcProfile?.username || 'connected'}
            </div>
          )}
        </div>
      </div>

      {/* Lucky Box Modal */}
      <LuckyBox
        isOpen={showLuckyBox}
        onClose={handleLuckyBoxClose}
        onClaim={handleLuckyBoxClaim}
      />

      <style jsx global>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
          50% {
            box-shadow: 0 0 8px #a259ff, 0 0 16px #a259ff, 0 0 24px #a259ff;
            filter: brightness(1.1) saturate(1.2);
          }
          100% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
        }
        .pulse-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
          border: 2px solid #a259ff;
        }
      `}</style>
    </div>
  );
}