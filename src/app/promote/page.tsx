"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiMoreHorizontal, FiEye, FiChevronDown, FiChevronUp, FiClock, FiStar, FiAlertTriangle } from "react-icons/fi";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import PaymentForm from "../../components/PaymentForm";
import CampaignManager from "../../components/CampaignManager";
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";
import { usePromotions } from "@/hooks/usePromotions";
import type { PromoCast } from "@/types/promotions";

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

// Csak Home Feed - nincs csatorna tagság probléma
const SELECTED_CHANNELS = [
  { id: '', name: 'Home Feed', weight: 100, description: 'Mindenki látja, nincs tagság szükséges' }
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

// Fallback csatornák listája hiba esetén
const getChannelFallbacks = (failedChannel: string): string[] => {
  // Minden csatorna kivéve a sikertelen
  return SELECTED_CHANNELS
    .filter(ch => ch.id !== failedChannel)
    .map(ch => ch.id);
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
  
  const handleCreateSuccess = () => { setShowForm(false); refreshAllData(); };
  const handleManageSuccess = () => { setShowCampaignManager(false); setManagingPromo(null); refreshAllData(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleManageCancel = () => { setShowCampaignManager(false); setManagingPromo(null); };

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
      
      if (shortHash && shortHash.startsWith('0x') && shortHash.length < 66) {
        try {
          // Próbáljuk meg lekérni a teljes hash-t Neynar API-ból
          const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/cast?identifier=${shortHash}&type=hash`, {
            headers: {
              'api_key': 'NEYNAR_API_DOCS' // Publikus demo key
            }
          });
          
          if (neynarResponse.ok) {
            const castData = await neynarResponse.json();
            if (castData.cast && castData.cast.hash) {
              castHash = castData.cast.hash;
              console.log(`🔍 Full hash retrieved: ${shortHash} → ${castHash}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch full hash for ${shortHash}:`, error);
        }
      }
      
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
      console.log(`📝 Cast options:`, castOptions);
      
      // Fallback rendszer: próbáljuk meg különböző csatornákkal
      let castResult = null;
      let attemptedChannels = [randomChannel];
      
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
      </div>
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