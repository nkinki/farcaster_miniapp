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

// Share szövegek promótereknek - $CHESS token és ingyenes promóció
const SHARE_TEXTS = [
  "🚀 Free promotion + earn $CHESS tokens! Try AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "⭐ Promote for FREE & get $CHESS rewards! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "🌐 Free promo + $CHESS earnings! Check AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "♟️ Earn $CHESS while promoting FREE! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "🎯 Free promotion + $CHESS tokens! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "💸 Get $CHESS for FREE promotion! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "🎮 Free promo + earn $CHESS! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "👀 $CHESS rewards + free promotion! Check: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "🔥 Promote FREE & earn $CHESS! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "🏆 Free promotion + $CHESS earnings! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "💰 Earn $CHESS with free promo! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  "✨ Free promotion + $CHESS tokens! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank"
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
  const [isLuckyBoxPreview, setIsLuckyBoxPreview] = useState(false);
  
  // Filter state for promotion types
  const [promotionFilter, setPromotionFilter] = useState<'all' | 'quote' | 'like_recast' | 'comment'>('all');
  
  // Track completed actions for each promotion
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  
  // 10-second countdown timer for share/like buttons
  const [buttonCountdowns, setButtonCountdowns] = useState<Record<string, number>>({});
  
  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedCommentPromo, setSelectedCommentPromo] = useState<PromoCast | null>(null);
  const [selectedCommentTemplate, setSelectedCommentTemplate] = useState<string>('');
  const [showCommentTemplates, setShowCommentTemplates] = useState(false);

  // Comment templates - same as in PaymentForm
  const COMMENT_TEMPLATES = [
    "🚀 This is amazing!",
    "💯 Totally agree with this!",
    "🔥 This is fire!",
    "💎 Great content!",
    "💎 Diamond hands!",
    "🎯 Spot on!",
    "⚡ This hits different!",
    "🌟 Absolutely brilliant!",
    "🚀 Love this energy!",
    "💪 This is the way!",
    "🎉 Amazing work!",
    "⭐ Perfect!"
  ];

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

  // 10-second countdown effect for buttons
  useEffect(() => {
    const intervals: Record<string, NodeJS.Timeout> = {};
    
    Object.keys(buttonCountdowns).forEach(promoId => {
      if (buttonCountdowns[promoId] > 0) {
        intervals[promoId] = setInterval(() => {
          setButtonCountdowns(prev => {
            const newCount = prev[promoId] - 1;
            if (newCount <= 0) {
              const { [promoId]: _, ...rest } = prev;
              return rest;
            }
            return { ...prev, [promoId]: newCount };
          });
        }, 1000);
      }
    });
    
    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [buttonCountdowns]);

  // Start countdown when user clicks on campaign
  const startButtonCountdown = (promoId: string) => {
    setButtonCountdowns(prev => ({ ...prev, [promoId]: 10 }));
  };

  // Fetch completed actions for current user
  const fetchCompletedActions = useCallback(async () => {
    if (!currentUser.fid) return;
    try {
      const response = await fetch(`/api/users/${currentUser.fid}/completed-actions`);
      if (response.ok) {
        const data = await response.json();
        const completed: Record<string, boolean> = {};
        data.completedActions?.forEach((action: any) => {
          completed[action.promotion_id] = true;
        });
        setCompletedActions(completed);
      }
    } catch (error) { 
      console.error("Failed to fetch completed actions:", error); 
    }
  }, [currentUser.fid]);
  
  const refreshAllData = useCallback(async () => {
      setLoading(true);
      await Promise.all([ refetchPromotions(), fetchUserStats(), fetchShareTimers(), fetchCompletedActions() ]);
      setLoading(false);
  }, [refetchPromotions, fetchUserStats, fetchShareTimers, fetchCompletedActions]);

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
    // Trigger REAL Lucky Box after successful campaign creation - TEMPORARILY DISABLED
    // setIsLuckyBoxPreview(false);
    // setShowLuckyBox(true);
  };
  const handleManageSuccess = () => { setShowCampaignManager(false); setManagingPromo(null); refreshAllData(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleManageCancel = () => { setShowCampaignManager(false); setManagingPromo(null); };

  // Lucky Box handlers
  const handleLuckyBoxClaim = async (amount: number) => {
    try {
      // Only update stats if it's NOT a preview
      if (!isLuckyBoxPreview) {
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
      } else {
        console.log(`👀 Lucky Box preview: ${amount} CHESS (not claimed)`);
      }
    } catch (error) {
      console.error('Failed to process lucky box reward:', error);
    }
  };

  const handleLuckyBoxClose = () => {
    setShowLuckyBox(false);
    if (!isLuckyBoxPreview) {
      setLuckyBoxReward(0);
    }
    setIsLuckyBoxPreview(false);
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

  const handleLikeRecastAction = async (promo: PromoCast, actionType: 'like' | 'recast') => {
    if (!isAuthenticated || !currentUser.fid) {
      setShareError("Please connect your Farcaster account first.");
      return;
    }
    
    setShareError(null);
    setSharingPromoId(promo.id.toString());
    
    try {
      // Extract cast hash from URL
      const castHash = promo.castUrl.split('/').pop() || '';
      
      // Submit the action to our API
      const response = await fetch('/api/like-recast-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: promo.id,
          userFid: currentUser.fid,
          username: currentUser.username,
          actionType,
          castHash,
          rewardAmount: promo.rewardPerShare,
          proofUrl: promo.castUrl // For manual verification
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to submit ${actionType} action`);
      }

      // Show success message
      setShareError(null);
      console.log(`✅ ${actionType} action submitted successfully!`);
      
      // Refresh data
      await refreshAllData();
      
    } catch (error: any) {
      console.error(`❌ ${actionType} action failed:`, error);
      setShareError(error.message || `Failed to submit ${actionType} action`);
    } finally {
      setSharingPromoId(null);
    }
  };

           // Like & Recast combined action with timer and verification
  const handleLikeRecastBoth = async (promo: PromoCast, e?: React.MouseEvent) => {
    console.log('🚀 handleLikeRecastBoth called!');
    console.log('📊 Promo:', promo);
    console.log('📱 Event:', e);
    
    // Prevent default behavior to avoid page reload
    if (e) {
      console.log('🛑 Preventing default behavior...');
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Default behavior prevented');
    }
    
    if (!isAuthenticated || !currentUser.fid) {
      setShareError("Please connect your Farcaster account first.");
      return;
    }
    
    setShareError(null);
    setSharingPromoId(promo.id.toString());
    
    try {
      console.log('🚀 Starting like & recast actions for promo:', promo.id);
      
      // Extract cast hash from URL
      const castHash = promo.castUrl.split('/').pop() || '';
      
      if (!castHash || !castHash.startsWith('0x')) {
        throw new Error('Invalid cast hash. Please check the cast URL.');
      }
      
      console.log('🔍 Using cast hash:', castHash);
      
      // First, open the cast so user can see it
      console.log('📱 Opening cast for user to view...');
      try {
        await (miniAppSdk as any).actions.viewCast({ hash: castHash });
        console.log('✅ Cast opened successfully');
      } catch (viewError) {
        console.log('⚠️ Could not open cast, continuing with like/recast...');
      }
      
      // Show instruction message
      setShareError('📱 Cast opened! Please like & recast it, then wait for verification...');
      
      // Wait 5 seconds for user to complete actions
      console.log('⏳ Waiting 5 seconds for user to complete like/recast...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Now submit to our backend for reward verification
      console.log('💰 Submitting actions for reward...');
      const response = await fetch('/api/like-recast-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: promo.id,
          userFid: currentUser.fid,
          username: currentUser.username,
          actionType: 'both',
          castHash,
          rewardAmount: promo.rewardPerShare,
          proofUrl: promo.castUrl
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit actions for reward');
      }

      console.log('✅ Like & recast actions completed successfully');
      setShareError(null);
      
      // Mark this promotion as completed
      setCompletedActions(prev => ({
        ...prev,
        [promo.id]: true
      }));
      
      // Show success message
      setShareError('🎉 Like & Recast completed! Reward will be credited soon.');
      
      // Refresh data
      await refreshAllData();
      
    } catch (error: any) {
      console.error('❌ Like & recast actions failed:', error);
      setShareError(error.message || 'Failed to complete like & recast actions');
    } finally {
      setSharingPromoId(null);
    }
  };

  const handleCommentAction = async (promo: PromoCast, e?: React.MouseEvent) => {
    console.log('🚀 handleCommentAction called!');
    console.log('📊 Promo:', promo);
    console.log('📱 Event:', e);
    
    // Prevent default behavior to avoid page reload
    if (e) {
      console.log('🛑 Preventing default behavior...');
      e.preventDefault();
      e.stopPropagation();
      console.log('✅ Default behavior prevented');
    }
    
    if (!isAuthenticated || !currentUser.fid) {
      setShareError("Please connect your Farcaster account first.");
      return;
    }
    
    // Open comment frame instead of direct action
    setSelectedCommentPromo(promo);
    setShowCommentModal(true);
  };

  const handleCommentSubmit = async () => {
    if (!selectedCommentPromo || !selectedCommentTemplate) {
      setShareError("Please select a comment template first.");
      return;
    }

    setShareError(null);
    setSharingPromoId(selectedCommentPromo.id.toString());
    
    try {
      // Combine selected template with original cast URL
      const finalText = `${selectedCommentTemplate}\n\n${selectedCommentPromo.castUrl}`;
      
      console.log('📝 Final comment text:', finalText);
      
      // Use same logic as quote sharing
      const castOptions: any = { 
        text: finalText
      };
      
      // URL típus ellenőrzése és cast hash kinyerése
      const shortHash = selectedCommentPromo.castUrl.split('/').pop();
      const isWarpcastUrl = selectedCommentPromo.castUrl.includes('warpcast.com');
      const isFarcasterUrl = selectedCommentPromo.castUrl.includes('farcaster.xyz');
      const isConversationUrl = selectedCommentPromo.castUrl.includes('/conversations/');
      
      // Teljes cast hash lekérése API-ból (ha rövid hash)
      let castHash: string | undefined = shortHash;
      let hasValidCastHash: boolean = false;
      
      // Farcaster cast hash validáció: 256-bit Blake2B = 64 hex chars + 0x = 66 chars total
      // VAGY 42 karakteres hash is elfogadható (gyakori formátum)
      hasValidCastHash = Boolean(castHash && castHash.startsWith('0x') && (castHash.length === 66 || castHash.length === 42));
      
      console.log(`🔍 URL Analysis:`, {
        originalUrl: selectedCommentPromo.castUrl,
        shortHash,
        isWarpcastUrl,
        isFarcasterUrl,
        isConversationUrl,
        hasValidCastHash,
        castHash
      });
      
      // Cast hash alapú comment (ha van érvényes hash)
      if (hasValidCastHash && castHash) {
        console.log(`📤 Using cast hash for comment: ${castHash}`);
        castOptions.parent = { 
          type: 'cast', 
          hash: castHash 
        };
      } else {
        // Embed alapú comment (biztonságosabb)
        console.log(`📤 Using embed for comment: ${selectedCommentPromo.castUrl}`);
        castOptions.embeds = [{ url: selectedCommentPromo.castUrl }];
      }
      
      // Véletlenszerű csatorna kiválasztása
      const randomChannel = getRandomChannel();
      if (randomChannel) {
        castOptions.channel = randomChannel;
        console.log(`📺 Using random channel: ${randomChannel}`);
      }
      
      console.log('🚀 Final cast options:', castOptions);
      
      // Keep modal open and show comment input interface
      console.log('📝 Comment template selected:', selectedCommentTemplate);
      console.log('🔗 Original post URL:', selectedCommentPromo.castUrl);
      
      // Show instruction message
      setShareError('📱 Comment ready! Please post it in the Farcaster app, then click "Verify Comment" below.');
      
      // Don't close modal - keep it open for comment verification
      // setShowCommentModal(false);
      // setSelectedCommentPromo(null);
      // setSelectedCommentTemplate('');
      
      // Don't wait automatically - let user click verify when ready
      // The verification is now handled by the "Verify Comment" button
      
    } catch (error: any) {
      console.error('❌ Comment action failed:', error);
      setShareError(error.message || 'Failed to complete comment action');
    } finally {
      setSharingPromoId(null);
    }
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
    
    // Debug logging
    console.log(`🔍 Filtering promo ${p.id}: actionType="${p.actionType}", filter="${promotionFilter}"`);
    
    // Apply promotion type filter
    if (promotionFilter !== 'all') {
      const promoActionType = p.actionType || 'quote'; // Use mapped actionType field
      console.log(`  📊 Action type check: ${promoActionType} === ${promotionFilter}? ${promoActionType === promotionFilter}`);
      
      if (promotionFilter === 'quote' && promoActionType !== 'quote') return false;
      if (promotionFilter === 'like_recast' && promoActionType !== 'like_recast') return false;
      if (promotionFilter === 'comment' && promoActionType !== 'comment') return false;
    }
    
    return true;
  });

  const sortedAvailablePromos = useMemo(() => {
    return [...availablePromos].sort((a, b) => {
      const timerA = shareTimers[a.id.toString()];
      const timerB = shareTimers[b.id.toString()];
      const canShareA = timerA?.canShare ?? true;
      const canShareB = timerB?.canShare ?? true;
      
      // Check if like_recast actions are completed
      const isCompletedA = completedActions[a.id] || false;
      const isCompletedB = completedActions[b.id] || false;
      
      // Priority levels: 1=Active, 2=48h Quote Wait, 3=Completed Like/Recast
      const getPriority = (promo: any, canShare: boolean, isCompleted: boolean) => {
        if (promo.actionType === 'like_recast' && isCompleted) return 3; // Completed like/recast - bottom
        if (promo.actionType === 'quote' && !canShare) return 2; // 48h quote wait - middle
        return 1; // Active (both quote available and like/recast available) - top
      };
      
      const priorityA = getPriority(a, canShareA, isCompletedA);
      const priorityB = getPriority(b, canShareB, isCompletedB);
      
      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Within same priority, sort by reward amount (highest first)
      return b.rewardPerShare - a.rewardPerShare;
    });
  }, [availablePromos, shareTimers, completedActions]);

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
          <div id="promo-form" className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79] relative pulse-glow"> 
            <button className="absolute top-3 right-3 text-gray-400 hover:text-white" onClick={handleCreateCancel}>
              <FiX size={24} />
            </button> 
            <PaymentForm user={currentUser} onSuccess={handleCreateSuccess} onCancel={handleCreateCancel} /> 
          </div>
        )}

        <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden pulse-glow">
            <button onClick={() => setIsShareListOpen(!isShareListOpen)} className="w-full flex items-center p-4 text-left text-white font-semibold text-lg hover:bg-[#2a2f42] transition-colors">
                <FiShare2 className="text-purple-300 w-6" />
                <span className="flex-1 text-center">Share & Earn ({availablePromos.length})</span>
                <div className="w-6">{isShareListOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
            </button>
            {isShareListOpen && (
                <div className="p-4 border-t border-gray-700 space-y-4">
                  {/* Promotion Type Filter */}
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => setPromotionFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                        promotionFilter === 'all'
                          ? 'bg-slate-700 text-white border border-slate-500'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      All Types
                    </button>
                    <button
                      onClick={() => setPromotionFilter('quote')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                        promotionFilter === 'quote'
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      💬 Quote
                    </button>
                    <button
                      onClick={() => setPromotionFilter('like_recast')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                        promotionFilter === 'like_recast'
                          ? 'bg-emerald-600 text-white border border-emerald-500'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      👍 Like & Recast
                    </button>
                    <button
                      onClick={() => setPromotionFilter('comment')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                        promotionFilter === 'comment'
                          ? 'bg-green-600 text-white border border-green-500'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                    >
                      💬 Comment
                    </button>
                  </div>
                  {sortedAvailablePromos.length === 0 ? (
                    <div className="text-center py-8"><div className="text-gray-400 text-lg">No other active campaigns right now.</div></div>
                  ) : (
                    sortedAvailablePromos.map((promo) => {
                      const timerInfo = shareTimers[promo.id.toString()];
                      const canShare = timerInfo?.canShare ?? true;
                      return (
                        <div key={promo.id} className="bg-[#181c23] p-3 rounded-lg border border-gray-700 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                              <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-md min-w-[2rem] text-center">
                                #{promo.id}
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <p className="text-white text-sm font-medium truncate">{promo.castUrl}</p>
                                <p className="text-purple-300 text-xs">@{promo.author.username}</p>
                              </div>
                            </div>
                            <div className="relative">
                              <button onClick={() => setOpenMenuId(openMenuId === promo.id.toString() ? null : promo.id.toString())} className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-700"><FiMoreHorizontal size={16} /></button>
                              {openMenuId === promo.id.toString() && ( 
                                <div className="absolute right-0 mt-2 w-48 bg-[#2a2f42] border border-gray-600 rounded-lg shadow-xl z-10"> 
                                  <button onClick={() => handleViewCast(promo.castUrl)} className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-gray-700">
                                    <FiEye size={14} /> view cast
                                  </button> 
                                </div> 
                              )}
                            </div>
                          </div>
                          
                          {/* Content Preview - SEO Optimized */}
                          <div className="bg-gray-900 rounded-lg p-2">
                            <div className="text-xs text-gray-400 mb-2">📱 Content Preview:</div>
                            <div className="bg-white rounded overflow-hidden h-40 sm:h-48 lg:h-56 relative">
                              {/* Loading Skeleton */}
                              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                                <div className="text-gray-500 text-sm">Loading preview...</div>
                              </div>
                              <iframe 
                                src={promo.castUrl} 
                                className="w-full h-full border-0 relative z-10" 
                                title={`Preview of campaign #${promo.id}`}
                                loading="lazy"
                                sandbox="allow-scripts allow-same-origin"
                                onLoad={(e) => {
                                  // Hide loading skeleton when iframe loads
                                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                                  if (skeleton) skeleton.style.display = 'none';
                                }}
                                onError={(e) => {
                                  // Show error message if iframe fails to load
                                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                                  if (skeleton) {
                                    skeleton.innerHTML = '<div class="text-red-500 text-sm">❌ Preview unavailable</div>';
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-center text-white">
                            <div className="p-2 bg-gray-800 rounded"><div className="flex items-center justify-center gap-1 mb-0.5 text-sm font-semibold"><FiDollarSign className="text-green-400" size={12} />{promo.rewardPerShare}</div><p className="text-xs text-gray-400">reward</p></div>
                            <div className="p-2 bg-gray-800 rounded"><div className="flex items-center justify-center gap-1 mb-0.5 text-sm font-semibold"><FiUsers className="text-blue-400" size={12} />{promo.sharesCount}</div><p className="text-xs text-gray-400">shares</p></div>
                            <div className="p-2 bg-gray-800 rounded"><div className="mb-0.5 text-sm font-semibold">{promo.remainingBudget}</div><p className="text-xs text-gray-400">left</p></div>
                            <div className="p-2 bg-gray-800 rounded"><div className="mb-0.5 text-sm font-semibold">{promo.totalBudget}</div><p className="text-xs text-gray-400">total</p></div>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${calculateProgress(promo)}%` }}></div>
                          </div>
                          <div>
                            {!canShare && timerInfo && (
                               <div className="w-full flex items-center justify-center gap-2 text-center text-yellow-400 font-semibold bg-yellow-900/50 py-2 px-4 rounded-lg mb-2">
                                 <FiClock size={16} /><span>{formatTimeRemaining(timerInfo.timeRemaining)}</span>
                               </div>
                            )}
                            
                            {/* Different buttons based on promotion type */}
                            {(() => {
                              console.log(`🔍 Rendering button for promo ${promo.id}:`, {
                                actionType: promo.actionType,
                                canShare,
                                sharingPromoId,
                                promoId: promo.id.toString(),
                                isDisabled: sharingPromoId === promo.id.toString() || !canShare
                              });
                              
                              if (promo.actionType === 'quote') {
                                const countdown = buttonCountdowns[promo.id.toString()];
                                const isCountingDown = countdown > 0;
                                const isDisabled = sharingPromoId === promo.id.toString() || !canShare || isCountingDown;
                                
                                return (
                                  <button 
                                    onClick={() => {
                                      if (!isCountingDown) {
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleSharePromo(promo), 10000);
                                      }
                                    }} 
                                    disabled={isDisabled} 
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {sharingPromoId === promo.id.toString() ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : isCountingDown ? (
                                      <FiClock size={14} />
                                    ) : (
                                      <FiShare2 size={14} />
                                    )}
                                    {sharingPromoId === promo.id.toString() 
                                      ? 'Processing...' 
                                      : isCountingDown 
                                        ? `⏳ Wait ${countdown}s to Quote` 
                                        : `💬 Quote & Earn ${promo.rewardPerShare} $CHESS`
                                    }
                                  </button>
                                );
                              } else if (promo.actionType === 'like_recast') {
                                // Check if user already completed this action
                                const isCompleted = completedActions[promo.id];
                                
                                if (isCompleted) {
                                  return (
                                    <div className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm">
                                      <span>✅</span>
                                      <span>Completed! Earned {promo.rewardPerShare} $CHESS</span>
                                    </div>
                                  );
                                }
                                
                                const countdown = buttonCountdowns[promo.id.toString()];
                                const isCountingDown = countdown > 0;
                                const isDisabled = sharingPromoId === promo.id.toString() || !canShare || isCountingDown;
                                
                                return (
                                  <button 
                                    onClick={(e) => {
                                      if (!isCountingDown) {
                                        console.log('🔘 Button clicked!');
                                        console.log('📱 Event:', e);
                                        console.log('🎯 Promo:', promo);
                                        console.log('🧪 Simple test - button works!');
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleLikeRecastBoth(promo, e), 10000);
                                      }
                                    }} 
                                    disabled={isDisabled} 
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {sharingPromoId === promo.id.toString() ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : isCountingDown ? (
                                      <FiClock size={14} />
                                    ) : (
                                      '👍'
                                    )}
                                    {sharingPromoId === promo.id.toString() 
                                      ? 'Processing...' 
                                      : isCountingDown 
                                        ? `⏳ Wait ${countdown}s to Like & Recast` 
                                        : `Like & Recast & Earn ${promo.rewardPerShare} $CHESS`
                                    }
                                  </button>
                                );
                              } else if (promo.actionType === 'comment') {
                                // Check if user already completed this action
                                const isCompleted = completedActions[promo.id];
                                
                                if (isCompleted) {
                                  return (
                                    <div className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-medium rounded-lg shadow-sm">
                                      <span>✅</span>
                                      <span>Completed! Earned {promo.rewardPerShare} $CHESS</span>
                                    </div>
                                  );
                                }
                                
                                const countdown = buttonCountdowns[promo.id.toString()];
                                const isCountingDown = countdown > 0;
                                const isDisabled = sharingPromoId === promo.id.toString() || !canShare || isCountingDown;
                                
                                return (
                                  <button 
                                    onClick={(e) => {
                                      if (!isCountingDown) {
                                        console.log('🔘 Comment button clicked!');
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleCommentAction(promo, e), 10000);
                                      }
                                    }} 
                                    disabled={isDisabled} 
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {sharingPromoId === promo.id.toString() ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : isCountingDown ? (
                                      <FiClock size={14} />
                                    ) : (
                                      '💬'
                                    )}
                                    {sharingPromoId === promo.id.toString() 
                                      ? 'Processing...' 
                                      : isCountingDown 
                                        ? `⏳ Wait ${countdown}s to Comment` 
                                        : `🚧 Comment & Earn ${promo.rewardPerShare} $CHESS (Under Development)`
                                    }
                                  </button>
                                );
                              } else {
                                // Fallback for unknown types - default to quote with countdown
                                const countdown = buttonCountdowns[promo.id.toString()];
                                const isCountingDown = countdown > 0;
                                const isDisabled = sharingPromoId === promo.id.toString() || !canShare || isCountingDown;
                                
                                return (
                                  <button 
                                    onClick={() => {
                                      if (!isCountingDown) {
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleSharePromo(promo), 10000);
                                      }
                                    }} 
                                    disabled={isDisabled} 
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {sharingPromoId === promo.id.toString() ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : isCountingDown ? (
                                      <FiClock size={14} />
                                    ) : (
                                      <FiShare2 size={14} />
                                    )}
                                    {sharingPromoId === promo.id.toString() 
                                      ? 'Processing...' 
                                      : isCountingDown 
                                        ? `⏳ Wait ${countdown}s to Quote` 
                                        : `💬 Quote & Earn ${promo.rewardPerShare} $CHESS`
                                    }
                                  </button>
                                );
                              }
                            })()}
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
            className="flex items-center gap-4 px-8 py-4 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-xl transition-all duration-300 pulse-glow"
          >
            👥 Join AppRank Group
          </button>
        </div>

        {/* Lucky Box Preview - TEMPORARILY DISABLED */}
        {false && (
          <div className="flex justify-center mt-4 mb-6">
            <div className="bg-[#23283a] border border-[#a64d79] rounded-xl p-4 text-center max-w-sm">
              <div className="text-3xl mb-2 animate-bounce">🎁</div>
              <div className="text-white font-bold mb-2">Lucky Box</div>
              
              <div className="bg-gray-800/50 rounded-lg p-3 mb-3">
                <div className="text-yellow-300 font-bold text-lg">
                  500 - 10,000 CHESS
                </div>
                <div className="text-gray-300 text-xs mt-1">
                  Every campaign = reward!
                </div>
              </div>

              <button
                onClick={() => {
                  setIsLuckyBoxPreview(true);
                  setShowLuckyBox(true);
                }}
                className="bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                🎁 Try Lucky Box
              </button>
            </div>
          </div>
        )}

        {/* Lucky Box Success Message - TEMPORARILY DISABLED */}
        {false && luckyBoxReward > 0 && (
          <div className="flex justify-center mt-4 mb-6">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4 text-center pulse-glow">
              <div className="text-2xl mb-2">🎉</div>
              <div className="text-white font-bold">Lucky Box Opened!</div>
              <div className="text-yellow-300 text-lg font-bold">+{luckyBoxReward.toLocaleString()} CHESS</div>
              <div className="text-gray-300 text-sm">Added to your earnings!</div>
            </div>
          </div>
        )}

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

      {/* Lucky Box Modal - TEMPORARILY DISABLED */}
      {false && (
        <LuckyBox
          isOpen={showLuckyBox}
          onClose={handleLuckyBoxClose}
          onClaim={handleLuckyBoxClaim}
          isPreview={isLuckyBoxPreview}
        />
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedCommentPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Choose Comment Template</h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedCommentPromo(null);
                  setSelectedCommentTemplate('');
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Original Post Preview */}
            <div className="mb-4 p-3 bg-slate-700 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Original Post:</p>
              <p className="text-sm text-white break-all">{selectedCommentPromo.castUrl}</p>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-300 mb-2">
                Select a comment template to use:
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {COMMENT_TEMPLATES.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedCommentTemplate(template)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                      selectedCommentTemplate === template
                        ? 'bg-green-600 text-white border border-green-500'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {selectedCommentTemplate && (
              <div className="mb-4 p-3 bg-slate-700 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Selected template:</p>
                <p className="text-sm text-white">{selectedCommentTemplate}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedCommentPromo(null);
                  setSelectedCommentTemplate('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!selectedCommentTemplate || sharingPromoId === selectedCommentPromo.id.toString()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {sharingPromoId === selectedCommentPromo.id.toString() ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && selectedCommentPromo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Comment on Post</h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedCommentPromo(null);
                  setSelectedCommentTemplate('');
                  setShowCommentTemplates(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Original Post Preview with iframe */}
            <div className="mb-6 p-4 bg-slate-700 rounded-lg">
              <p className="text-sm text-gray-300 mb-2">📱 Original Post:</p>
              
              {/* Original Post iframe */}
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-64 relative">
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-gray-500 text-sm">Loading preview...</div>
                  </div>
                  <iframe 
                    src={selectedCommentPromo.castUrl} 
                    className="w-full h-full border-0 relative z-10" 
                    title={`Preview of post for commenting`}
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      const parent = iframe.parentElement;
                      if (parent) {
                        parent.querySelector('.absolute')?.remove();
                      }
                    }}
                  />
                </div>
              </div>
              
              {/* Instruction */}
              <div className="mt-3 p-3 bg-blue-900 border border-blue-600 rounded-lg">
                <p className="text-blue-300 text-sm">
                  👇 <strong>Choose a comment template below</strong> to add your comment to this post
                </p>
              </div>
            </div>

            {/* Comment Templates - always show */}
            <div className="mb-6">
                <p className="text-sm text-gray-300 mb-3">Choose a comment template:</p>
                <div className="grid grid-cols-1 gap-2">
                  {COMMENT_TEMPLATES.slice(0, 3).map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedCommentTemplate(template)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                        selectedCommentTemplate === template
                          ? 'bg-green-600 text-white border border-green-500'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                      }`}
                    >
                      {template}
                    </button>
                  ))}
                </div>
                
                {/* Selected Template Preview */}
                {selectedCommentTemplate && (
                  <div className="mt-4 p-3 bg-green-900 border border-green-600 rounded-lg">
                    <p className="text-green-300 text-sm mb-2">💬 Your comment:</p>
                    <div className="bg-slate-800 p-2 rounded border">
                      <p className="text-white text-sm break-words">
                        {selectedCommentTemplate}
                      </p>
                    </div>
                  </div>
                )}
              </div>



            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setSelectedCommentPromo(null);
                  setSelectedCommentTemplate('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              
              {/* Simple Share Button - only show when template is selected */}
              {selectedCommentTemplate && (
                <button
                  onClick={async () => {
                    if (!selectedCommentPromo || !selectedCommentTemplate) return;
                    
                    console.log('🚀 Sharing comment...');
                    setShareError('🚀 Sharing comment...');
                    
                    try {
                      // Submit to backend for reward verification
                      const response = await fetch('/api/comment-actions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          promotionId: selectedCommentPromo.id,
                          userFid: currentUser.fid,
                          username: currentUser.username,
                          actionType: 'comment',
                          castHash: selectedCommentPromo.castUrl.split('/').pop() || '',
                          rewardAmount: selectedCommentPromo.rewardPerShare,
                          proofUrl: selectedCommentTemplate
                        })
                      });

                      const data = await response.json();
                      
                      if (!response.ok) {
                        throw new Error(data.error || 'Failed to share comment');
                      }

                      console.log('✅ Comment shared successfully');
                      setShareError('✅ Comment shared! Reward credited successfully!');
                      
                      // Close modal after successful sharing
                      setTimeout(() => {
                        setShowCommentModal(false);
                        setSelectedCommentPromo(null);
                        setSelectedCommentTemplate('');
                        setShareError(null);
                      }, 2000);
                      
                    } catch (error: any) {
                      console.error('❌ Comment sharing failed:', error);
                      setShareError(`❌ Sharing failed: ${error.message}`);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  🚀 Share Comment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Access Button */}
      <div className="mt-12 pt-8 border-t border-gray-700">
        <div className="text-center">
          <button
            onClick={() => {
              const code = prompt("Enter admin code:");
              if (code === "admin123") {
                window.open("/admin", "_blank");
              } else if (code) {
                alert("Invalid admin code");
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Admin Access
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