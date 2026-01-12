"use client"

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiPlus, FiX, FiMoreHorizontal, FiEye, FiChevronDown, FiChevronUp, FiClock, FiStar, FiAlertTriangle, FiCalendar, FiInfo, FiCheck, FiGift, FiZap } from "react-icons/fi";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import UserProfile from "@/components/UserProfile";
import PaymentForm from "../../components/PaymentForm";
import CampaignManager from "../../components/CampaignManager";
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";
import LuckyBox from "@/components/LuckyBox";
import SeasonModal from "@/components/SeasonModal";
import { usePromotions } from "@/hooks/usePromotions"
import { usePromotionsWithComments } from "@/hooks/usePromotionsWithComments";
import type { PromoCast } from "@/types/promotions";
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SignInButton, useProfile } from '@farcaster/auth-kit';
import { toast } from 'react-hot-toast';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { DIAMOND_VIP_ADDRESS, DIAMOND_VIP_ABI } from '@/abis/diamondVip';
import { formatUnits } from 'viem';

// --- Helper Components ---
const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + Math.floor(distance / (1000 * 60 * 60 * 24)) * 24; // Total hours
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex justify-center gap-2 text-white font-mono font-bold text-xl">
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.hours).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">HOURS</span>
      </div>
      <div className="py-2 text-gray-500">:</div>
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.minutes).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">MINS</span>
      </div>
      <div className="py-2 text-gray-500">:</div>
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.seconds).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">SECS</span>
      </div>
    </div>
  );
};

// Share texts for promoters - $CHESS token and free promotion
// TEMPORARILY DISABLED - No promotional messages
const SHARE_TEXTS: string[] = [
  // "🚀 Free promotion + earn $CHESS tokens! Try AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "⭐ Promote for FREE & get $CHESS rewards! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "🚀 Free promo + $CHESS earnings! Check AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "♟️ Earn $CHESS while promoting FREE! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "🎯 Free promotion + $CHESS tokens! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "💸 Get $CHESS for FREE promotion! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "🎮 Free promo + earn $CHESS! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "👀 $CHESS rewards + free promotion! Check: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "🔥 Promote FREE & earn $CHESS! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "🏆 Free promotion + $CHESS earnings! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "💰 Earn $CHESS with free promo! Try: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank",
  // "✨ Free promotion + $CHESS tokens! AppRank: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank"
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

// Weighted random channel selection
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



// Fallback channel list in case of error - by priority
const getChannelFallbacks = (failedChannel: string): (string | null)[] => {
  // Priority: Home Feed → larger weight channels → smaller ones
  const fallbacks = SELECTED_CHANNELS
    .filter(ch => ch.id !== failedChannel)
    .sort((a, b) => b.weight - a.weight) // Descending order by weight
    .map(ch => ch.id === '' ? null : ch.id); // Home Feed = null

  // Always have Home Feed as the last fallback
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

function PromotePageContent() {
  // Wallet hooks
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Farcaster Auth hooks
  const { isAuthenticated: fcAuthenticated, profile: fcProfile } = useProfile();

  // Search Params for deep linking
  const searchParams = useSearchParams();

  // $CHESS token balance
  const { data: chessBalance, isLoading: balanceLoading } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
      refetchInterval: 10000,
    }
  });

  const { data: vipBalance } = useReadContract({
    address: DIAMOND_VIP_ADDRESS,
    abi: DIAMOND_VIP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    }
  });

  const isVip = useMemo(() => vipBalance ? Number(vipBalance) > 0 : false, [vipBalance]);

  // Diamond VIP NFT Data
  const { data: presaleActive } = useReadContract({
    address: DIAMOND_VIP_ADDRESS,
    abi: DIAMOND_VIP_ABI,
    functionName: 'presaleActive',
    query: { enabled: isConnected }
  });

  const { data: presalePrice } = useReadContract({
    address: DIAMOND_VIP_ADDRESS,
    abi: DIAMOND_VIP_ABI,
    functionName: 'PRESALE_MINT_PRICE',
    query: { enabled: isConnected }
  });

  const { data: publicPrice } = useReadContract({
    address: DIAMOND_VIP_ADDRESS,
    abi: DIAMOND_VIP_ABI,
    functionName: 'PUBLIC_MINT_PRICE',
    query: { enabled: isConnected }
  });

  const { data: chessAllowance, refetch: refetchAllowance } = useReadContract({
    address: CHESS_TOKEN_ADDRESS,
    abi: CHESS_TOKEN_ABI,
    functionName: 'allowance',
    args: address ? [address, DIAMOND_VIP_ADDRESS] : undefined,
    query: { enabled: !!address && isConnected }
  });

  const currentPrice = publicPrice || BigInt("10000000000000000000000000"); // Fallback to 10M if call fails
  const hasAllowance = (chessAllowance !== undefined && currentPrice !== undefined) ? BigInt(chessAllowance as any) >= BigInt(currentPrice as any) : false;

  const { data: approveHash, writeContract: writeApprove, isPending: approvePending } = useWriteContract();
  const { data: mintHash, writeContract: writeMint, isPending: mintPending } = useWriteContract();

  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isWaitingMint, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      toast.success("CHESS Approved!");
    }
  }, [isApproveSuccess, refetchAllowance]);

  useEffect(() => {
    if (isMintSuccess) {
      refreshAllData();
      toast.success("Diamond VIP Minted!");
    }
  }, [isMintSuccess]);

  const handleMintNft = async () => {
    if (!address || !currentPrice) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      if (!hasAllowance) {
        writeApprove({
          address: CHESS_TOKEN_ADDRESS,
          abi: CHESS_TOKEN_ABI,
          functionName: 'approve',
          args: [DIAMOND_VIP_ADDRESS, currentPrice],
        });
      } else {
        writeMint({
          address: DIAMOND_VIP_ADDRESS,
          abi: DIAMOND_VIP_ABI,
          functionName: 'mint',
        });
      }
    } catch (error: any) {
      console.error("Mint error:", error);
      toast.error(error.message || "Transaction failed");
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const [username, setUsername] = useState<string>("user")
  const [displayName, setDisplayName] = useState<string>("Farcaster User")
  const [pfpUrl, setPfpUrl] = useState<string | undefined>(undefined)
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
  const [showFollowToast, setShowFollowToast] = useState(false);
  const [followToastMessage, setFollowToastMessage] = useState('');

  // Lucky Box state
  const [showLuckyBox, setShowLuckyBox] = useState(false);
  const [luckyBoxReward, setLuckyBoxReward] = useState<number>(0);
  const [isLuckyBoxPreview, setIsLuckyBoxPreview] = useState(false);

  // Season modal state
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonData, setSeasonData] = useState<any>(null);

  // Filter state for promotion types
  const [promotionFilter, setPromotionFilter] = useState<'all' | 'quote' | 'like_recast' | 'comment' | 'follow'>('all');

  // Track completed actions for each promotion
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});
  // Track pending actions for each promotion
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});


  // 10-second countdown timer for share/like buttons
  const [buttonCountdowns, setButtonCountdowns] = useState<Record<string, number>>({});

  // Comment modal state
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedCommentPromo, setSelectedCommentPromo] = useState<PromoCast | null>(null);
  const [selectedCommentTemplate, setSelectedCommentTemplate] = useState<string>('');
  const [templateSortOrder, setTemplateSortOrder] = useState<'default' | 'random' | 'compact'>('default');
  const [showCommentTemplates, setShowCommentTemplates] = useState(false);

  // Follow modal state
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedFollowPromo, setSelectedFollowPromo] = useState<PromoCast | null>(null);

  // Daily Code state
  const [showDailyCodeModal, setShowDailyCodeModal] = useState(false);
  const [dailyCode, setDailyCode] = useState('');
  const [dailyCodeRewardPerShare, setDailyCodeRewardPerShare] = useState(5000);
  const [dailyCodeCastUrl, setDailyCodeCastUrl] = useState('');
  const [dailyCodeError, setDailyCodeError] = useState<string | null>(null);
  const [dailyCodeSuccess, setDailyCodeSuccess] = useState<string | null>(null);
  const [activeDailyCodeTab, setActiveDailyCodeTab] = useState<'standard' | 'vip'>('standard');

  const handleRedeemCode = async () => {
    const canRedeem = (isVip || dailyCode) && dailyCodeCastUrl;
    if (!canRedeem) {
      setDailyCodeError(isVip ? "Please enter a Cast URL" : "Please fill in all fields");
      return;
    }

    setLoading(true);
    setDailyCodeError(null);
    setDailyCodeSuccess(null);

    try {
      const response = await fetch('/api/promotions/daily-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: dailyCode,
          castUrl: dailyCodeCastUrl,
          rewardPerShare: dailyCodeRewardPerShare,
          fid: currentUser.fid,
          username: currentUser.username,
          displayName: currentUser.displayName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem code');
      }

      setDailyCodeSuccess(data.message);
      setDailyCode('');
      setDailyCodeCastUrl('');

      // Refresh data after short delay
      setTimeout(() => {
        setShowDailyCodeModal(false);
        setDailyCodeSuccess(null);
        refreshAllData();
      }, 2000);

    } catch (error: any) {
      setDailyCodeError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Comment templates - same as in PaymentForm
  const COMMENT_TEMPLATES = [
    "🚀 This is amazing!",
    "💯 Totally agree with this!",
    "🔥 This is fire!",
    "💎 Great content!",
    "🎯 Spot on!",
    "🛡️ This hits different!",
    "🌟 Absolutely brilliant!",
    "🚀 Love this energy!",
    "💪 This is the way!",
    "🎉 Amazing work!",
    "â­ Perfect!",
    "👏 Well said!",
    "🏆 Top tier content!",
    "💫 Mind blown!",
    "🎨 Beautiful work!",
    "💎 Pure gold!",
    "Love this insight!",
    "Totally agree, well said.",
    "This adds real value, thanks!",
    "Sharp take. Following.",
    "Saving this for later.",
    "Important point, appreciate the share.",
    "Great breakdown!",
    "Clear and concise. Nice.",
    "Thanks for the alpha!",
    "Signal > noise. Bookmarked.",
    "This aged well.",
    "Context matters — this nails it.",
    "Data-backed and practical. +1",
    "Learned something new today.",
    "Useful for builders.",
    "Quality over hype. Respect.",
    "Actionable and clean.",
    "Mind opening perspective."
  ];

  // Template management functions
  const getSortedTemplates = (templates: string[]) => {
    switch (templateSortOrder) {
      case 'random':
        return [...templates].sort(() => Math.random() - 0.5);
      case 'compact':
        return templates.slice(0, 8); // Show only first 8 templates
      default:
        return templates;
    }
  };

  const toggleTemplateSort = () => {
    const order = templateSortOrder === 'default' ? 'random' :
      templateSortOrder === 'random' ? 'compact' : 'default';
    setTemplateSortOrder(order);
  };

  // Display mode toggle removed - only compact view

  const {
    promotions: allPromotions,
    loading: promotionsLoading,
    refetch: refetchPromotions,
  } = usePromotions({
    limit: 50,
    offset: 0,
    status: "all",
  });

  const {
    promotions: commentPromotions,
    loading: commentPromotionsLoading,
    refetch: refetchCommentPromotions,
  } = usePromotionsWithComments({
    limit: 50,
    offset: 0,
    status: "active",
  });

  useEffect(() => {
    miniAppSdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setIsAuthenticated(true);
        const u = ctx.user as FarcasterUser;
        setProfile(u);
        if (u.username) setUsername(u.username);
        if (u.displayName) setDisplayName(u.displayName);
        if (u.pfpUrl) setPfpUrl(u.pfpUrl);
      }
    }).catch(err => console.error("Farcaster context error:", err));

    // Temporarily static season name to reduce DB usage on start
    // TODO: Remember to update or restore fetch for the next season!
    setSeasonData({
      id: 1,
      name: "Growth Galaxy",
      status: "active",
      start_date: "2024-01-01",
      end_date: "2026-12-31",
      total_rewards: "10000000"
    });
  }, []);

  // Handle deep linking to Redeem Code modal
  useEffect(() => {
    const redeem = searchParams.get('redeem');
    if (redeem === 'true') {
      setShowDailyCodeModal(true);
    }
  }, [searchParams]);

  const currentUser = useMemo(() => {
    if (isAuthenticated && profile) {
      return {
        fid: profile.fid,
        username: profile.username || username || "user",
        displayName: profile.displayName || displayName || "Current User",
        pfpUrl: profile.pfpUrl || pfpUrl
      };
    }
    return {
      fid: profile?.fid || 0,
      username: username || "user",
      displayName: displayName || "Farcaster User",
      pfpUrl: pfpUrl
    };
  }, [isAuthenticated, profile, username, displayName, pfpUrl]);

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

        // Set completed actions (verified/rewarded)
        const completed: Record<string, boolean> = {};
        data.completedActionsOnly?.forEach((action: any) => {
          completed[action.promotion_id] = true;
        });
        setCompletedActions(completed);

        // Set pending actions (awaiting approval)
        const pending: Record<string, boolean> = {};
        data.pendingActions?.forEach((action: any) => {
          pending[action.promotion_id] = true;
        });
        console.log('🔍 Setting pending actions:', pending);
        setPendingActions(pending);
      }
    } catch (error) {
      console.error("Failed to fetch completed actions:", error);
    }
  }, [currentUser.fid]);

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([refetchPromotions(), fetchUserStats(), fetchShareTimers(), fetchCompletedActions()]);
    setLoading(false);
  }, [refetchPromotions, fetchUserStats, fetchShareTimers, fetchCompletedActions]);

  useEffect(() => {
    if (isAuthenticated && profile?.fid) {
      refreshAllData();
      const interval = setInterval(fetchShareTimers, 300000); // Every 5 minutes instead of 1 minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, profile, fetchShareTimers, refreshAllData]);

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

        console.log(`đźŽ Lucky Box reward claimed: ${amount} CHESS`);
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
      console.error('✖️ Failed to delete campaign:', error instanceof Error ? error.message : 'Unknown error');
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
      console.error(`✖️ ${actionType} action failed:`, error);
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
      console.error('✖️ Like & recast actions failed:', error);
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

    setShareError(null);
    setSelectedCommentPromo(promo);
    setShowCommentModal(true);
    setSelectedCommentTemplate('');
  };

  const handleFollowAction = async (promo: PromoCast, e?: React.MouseEvent) => {
    console.log('🚀 handleFollowAction called!');
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
      console.log('🚀 Starting follow action for promo:', promo.id);

      // Extract target username from cast URL
      const targetUsername = promo.castUrl.split('/').pop() || '';

      if (!targetUsername) {
        throw new Error('Invalid target username. Please check the cast URL.');
      }

      console.log('🔍 Target username:', targetUsername);

      // Profile already opened in modal, just show instruction
      console.log('📱 Profile should already be opened from modal');
      setShareError('📱 Profile opened! Please follow the user, then the action will be verified automatically...');

      // Now submit the follow action
      console.log('📝 Submitting follow action...');
      const response = await fetch('/api/follow-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionId: promo.id,
          userFid: currentUser.fid,
          username: currentUser.username,
          actionType: 'follow',
          targetUserFid: targetUsername,
          rewardAmount: promo.rewardPerShare,
          proofUrl: promo.castUrl
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setFollowToastMessage(`✅ You already completed this follow action! (Status: ${data.status || 'completed'})`);
          setShowFollowToast(true);

          // Mark as completed immediately
          setCompletedActions(prev => ({
            ...prev,
            [promo.id]: true
          }));

          // Also mark as pending if it's pending
          if (data.status === 'pending') {
            setPendingActions(prev => ({
              ...prev,
              [promo.id]: true
            }));
          }

          // Don't call refreshAllData() here as it might override our state changes
          return;
        }
        throw new Error(data.error || 'Failed to complete follow action');
      }

      // Mark this promotion as pending (not completed yet)
      setPendingActions(prev => ({
        ...prev,
        [promo.id]: true
      }));

      // Show success message
      if (data.message?.includes('admin approval')) {
        setFollowToastMessage('✅ Follow submitted for admin approval! Reward credited immediately.');
      } else {
        setFollowToastMessage('✅ Follow verified! Reward will be credited soon.');
      }
      setShowFollowToast(true);

      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShowFollowToast(false);
      }, 5000);

      // Refresh all data to update pending state
      await refreshAllData();

      console.log(`✅ Follow action completed successfully! You earned ${promo.rewardPerShare} $CHESS.`);

    } catch (error: any) {
      console.error('✖️ Follow action failed:', error);
      setShareError(error.message || 'Failed to complete follow action');
    } finally {
      setSharingPromoId(null);
    }
  };


  const handleCommentSubmit = async () => {
    if (!selectedCommentPromo || !selectedCommentTemplate) {
      setShareError("Please select a comment template first.");
      return;
    }

    setShareError(null);
    setSharingPromoId(selectedCommentPromo.id.toString());

    try {
      console.log('📝 Comment template selected:', selectedCommentTemplate);
      console.log('🔗 Original post URL:', selectedCommentPromo.castUrl);

      // Extract cast hash from URL
      const shortHash = selectedCommentPromo.castUrl.split('/').pop();
      let castHash: string | undefined = shortHash;

      console.log(`🔍 Cast hash analysis:`, {
        originalUrl: selectedCommentPromo.castUrl,
        shortHash,
        castHash
      });

      // Try to open the original cast for manual commenting
      try {
        await (miniAppSdk as any).actions.viewCast({ hash: castHash || shortHash });
        console.log('✅ Cast opened for manual comment');

        setShareError('📱 Cast opened! Please copy the comment template above, paste it as a reply, then click "Verify Comment" below.');

        // Keep modal open for manual verification
        // User can click "Verify Comment" button when ready

      } catch (viewError) {
        console.log('⚠️ Could not open cast');
        setShareError('📱 Please manually navigate to the post and comment. Then click "Verify Comment" below.');
      }

    } catch (error: any) {
      console.error('✖️ Comment action failed:', error);
      setShareError(error.message || 'Failed to complete comment action');
    } finally {
      setSharingPromoId(null);
    }
  };

  {/* Daily Code Modal */ }
  {
    showDailyCodeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#1e2330] rounded-2xl border border-purple-500/30 w-full max-w-md p-6 shadow-2xl relative">
          <button
            onClick={() => setShowDailyCodeModal(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>

          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <FiGift className="text-purple-400" />
            Redeem Daily Code
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter the daily secret code to get a free 10,000 point promotion!
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Daily Code</label>
              <input
                type="text"
                value={dailyCode}
                onChange={(e) => setDailyCode(e.target.value)}
                placeholder="Enter code..."
                className="w-full bg-[#151921] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cast URL to Promote</label>
              <input
                type="text"
                value={dailyCodeCastUrl}
                onChange={(e) => setDailyCodeCastUrl(e.target.value)}
                placeholder="https://warpcast.com/..."
                className="w-full bg-[#151921] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reward per Share: <span className="text-purple-400">{dailyCodeRewardPerShare} pts</span>
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={dailyCodeRewardPerShare}
                onChange={(e) => setDailyCodeRewardPerShare(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100 pts</span>
                <span>2000 pts</span>
              </div>
            </div>

            {dailyCodeError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
                <FiAlertTriangle />
                {dailyCodeError}
              </div>
            )}

            {dailyCodeSuccess && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-3 flex items-center gap-2 text-green-400 text-sm">
                <FiCheck />
                {dailyCodeSuccess}
              </div>
            )}

            <button
              onClick={handleRedeemCode}
              disabled={loading || !dailyCode || !dailyCodeCastUrl}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Verifying...' : 'Redeem Code'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated || !currentUser.fid) {
      console.error("✖️ Please connect your Farcaster account first.");
      return;
    }

    setShareError(null);
    setSharingPromoId(promo.id.toString());

    try {
      // Generate a new random AppRank text for each share
      const randomAppRankText = SHARE_TEXTS[Math.floor(Math.random() * SHARE_TEXTS.length)];

      // Premium check: if the promo budget was 5M+, there is no AppRank text
      const isPremium = promo.totalBudget >= 5000000;
      const finalText = isPremium
        ? (promo.shareText || ``) // Premium: only user text, if none then empty
        : (promo.shareText
          ? `${randomAppRankText} ${promo.shareText}` // Normal: random AppRank + user text
          : randomAppRankText // Normal: only random AppRank text
        );

      // Choose a random channel for each share
      const randomChannel = getRandomChannel();

      // URL type recognition and handling
      console.log(`🔍 Original URL: ${promo.castUrl}`);

      const castOptions: any = {
        text: finalText
      };

      // Verify URL type and extract cast hash
      const shortHash = promo.castUrl.split('/').pop();
      const isWarpcastUrl = promo.castUrl.includes('warpcast.com');
      const isFarcasterUrl = promo.castUrl.includes('farcaster.xyz');
      const isConversationUrl = promo.castUrl.includes('/conversations/');

      // Retrieve full cast hash from API (if short hash)
      let castHash: string | undefined = shortHash;
      let hasValidCastHash: boolean = false;

      // Simple approach: only use quote cast if we have a full hash
      // Short hashes → embed (safer and more stable)

      // Farcaster cast hash validation: 256-bit Blake2B = 64 hex chars + 0x = 66 chars total
      // OR 42 character hash is also acceptable (common format)
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
        // Also add the AppRank miniapp link
        castOptions.embeds = ['https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank'];
        console.log(`🔗 Creating quote cast with hash: ${castHash} + AppRank embed`);
      } else {
        // Short hash or no hash - only embed (safer)
        castOptions.embeds = [promo.castUrl];
        console.log(`📎 Creating embed with URL: ${promo.castUrl} (hash: ${castHash}, length: ${castHash?.length || 0} chars)`);
      }

      // If not Home Feed, add the channel
      if (randomChannel) {
        castOptions.channelKey = randomChannel;
      }

      console.log(`🎯 Selected channel: "${randomChannel || 'Home Feed'}"`);
      console.log(`📊 New Channel Distribution: Home Feed (80%), Crypto (3%), Web3 (3%), Farcaster (3%), Founders (3%), Builders (3%), Airdrop (3%), Onchain (2%)`);
      console.log(`📝 Cast options:`, castOptions);

      // Fallback system: try with different channels
      let castResult = null;
      let attemptedChannels: (string | null)[] = [randomChannel];

      try {
        castResult = await (miniAppSdk as any).actions.composeCast(castOptions);
      } catch (channelError) {
        console.log(`✖️ Channel "${randomChannel}" failed, trying fallbacks...`);

        // Retrieve fallback channels
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
            console.log(`✖️ Fallback channel "${fallbackChannel || 'Home Feed'}" also failed`);
            attemptedChannels.push(fallbackChannel);
            continue;
          }
        }
      }

      if (!castResult || !castResult.cast || !castResult.cast.hash) {
        console.error(`✖️ All channels failed. Attempted: ${attemptedChannels.join(', ')}`);
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
        console.error(`✖️ Share error: ${errorMessage}`);
      }
    } finally {
      setSharingPromoId(null);
    }
  };

  const myPromos = allPromotions.filter(
    p => p.author.fid === currentUser.fid
  );

  // Combine regular promotions and comment promotions
  const allCombinedPromotions = [...allPromotions, ...commentPromotions];

  const availablePromos = allCombinedPromotions.filter(p => {
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
      if (promotionFilter === 'follow' && promoActionType !== 'follow') return false;
    }

    return true;
  });

  // Separate promotions into available and countdown sections
  const { availablePromos: trulyAvailable, countdownPromos } = useMemo(() => {
    const available: any[] = [];
    const countdown: any[] = [];

    availablePromos.forEach(promo => {
      const timerInfo = shareTimers[promo.id.toString()];
      const canShare = timerInfo?.canShare ?? true;
      const isCompleted = completedActions[promo.id] || false;

      // Check if this should be in countdown section
      // For comment: only show in countdown if not completed yet (can be done again after 48h)
      // For quote: show in countdown if in 48h cooldown
      // For follow: show in countdown if in 48h cooldown OR if completed (pending status)
      const shouldBeInCountdown = !canShare && timerInfo && timerInfo.timeRemaining > 0 &&
        ((promo.actionType === 'comment' && !isCompleted) || promo.actionType === 'quote' || promo.actionType === 'follow');

      // For follow actions: if completed (pending status), move to countdown section
      const isFollowCompleted = promo.actionType === 'follow' && isCompleted;

      // For follow actions: if completed, don't show in available section at all
      const isFollowAndCompleted = promo.actionType === 'follow' && isCompleted;

      if (shouldBeInCountdown || isFollowCompleted) {
        countdown.push(promo);
      } else if (!isFollowAndCompleted) {
        // Only add to available if it's not a completed follow
        available.push(promo);
      }

      // Debug logging for follow actions
      if (promo.actionType === 'follow') {
        console.log(`🔍 Follow action ${promo.id}: isCompleted=${isCompleted}, shouldBeInCountdown=${shouldBeInCountdown}, isFollowCompleted=${isFollowCompleted}`);
      }
    });

    return {
      availablePromos: available,
      countdownPromos: countdown
    };
  }, [availablePromos, shareTimers, completedActions]);

  const sortedAvailablePromos = useMemo(() => {
    return [...trulyAvailable].sort((a, b) => {
      const timerA = shareTimers[a.id.toString()];
      const timerB = shareTimers[b.id.toString()];
      const canShareA = timerA?.canShare ?? true;
      const canShareB = timerB?.canShare ?? true;

      // Check if like_recast actions are completed
      const isCompletedA = completedActions[a.id] || false;
      const isCompletedB = completedActions[b.id] || false;

      // Priority levels: 1=Active, 2=Completed Like/Recast, 3=Completed Comment/Follow
      const getPriority = (promo: any, canShare: boolean, isCompleted: boolean) => {
        if ((promo.actionType === 'comment' || promo.actionType === 'follow') && isCompleted) return 3; // Completed comment/follow - bottom
        if (promo.actionType === 'like_recast' && isCompleted) return 2; // Completed like/recast - middle
        return 1; // Active (all types available) - top
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
  }, [trulyAvailable, shareTimers, completedActions]);

  const sortedCountdownPromos = useMemo(() => {
    return [...countdownPromos].sort((a, b) => {
      const timerA = shareTimers[a.id.toString()];
      const timerB = shareTimers[b.id.toString()];

      // Sort by time remaining (shortest first)
      const timeA = timerA?.timeRemaining ?? 0;
      const timeB = timerB?.timeRemaining ?? 0;

      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // Within same time, sort by reward amount (highest first)
      return b.rewardPerShare - a.rewardPerShare;
    });
  }, [countdownPromos, shareTimers]);

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

      {/* Follow Toast Notification */}
      {showFollowToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-900/90 border border-green-600 rounded-lg p-4 shadow-lg animate-slideInRight max-w-sm">
          <div className="flex items-center gap-3">
            <div className="text-green-400 text-xl">👥</div>
            <div className="flex-1">
              <div className="text-green-200 font-medium text-sm">
                {followToastMessage}
              </div>
            </div>
            <button
              onClick={() => setShowFollowToast(false)}
              className="text-green-400 hover:text-green-200 transition-colors"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <UserProfile
          user={currentUser}
          userStats={userStats}
          onClaimSuccess={refreshAllData}
          isVip={isVip}
        />
      </div>

      <MyCampaignsDropdown
        myPromos={myPromos}
        onManageClick={(promo) => { setManagingPromo(promo); setShowCampaignManager(true); }}
        onDeleteClick={handleDeleteCampaign}
        currentUserFid={currentUser.fid}
      />

      {/* 2x2 Grid Menu */}
      <div className="grid grid-cols-2 gap-4 my-8 max-w-md mx-auto">
        {/* Create Promotion */}
        <button
          onClick={() => setShowForm(true)}
          className="flex flex-col items-center gap-3 p-6 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiPlus size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-purple-300">Create Promotion</div>
            <div className="text-xs text-gray-400">Start Campaign</div>
          </div>
        </button>

        {/* Redeem Daily Code */}
        <button
          onClick={() => setShowDailyCodeModal(true)}
          className="flex flex-col items-center gap-3 p-6 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiGift size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-yellow-300">Redeem Code</div>
            <div className="text-xs text-gray-400">Daily Free Promo</div>
          </div>
        </button>

        {/* Share & Earn */}
        <button
          onClick={() => setIsShareListOpen(!isShareListOpen)}
          className="flex flex-col items-center gap-3 p-6 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiShare2 size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-green-300">Share & Earn</div>
            <div className="text-xs text-gray-400">({availablePromos.length}) Campaigns</div>
          </div>
        </button>

        {/* Daily Check */}
        <button
          onClick={() => setShowSeasonModal(true)}
          className="flex flex-col items-center gap-3 p-6 text-lg font-bold bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiCalendar size={32} className="text-white" />
          </div>
          <div className="text-center">
            <div className="text-blue-300">Daily Check</div>
            <div className="text-xs text-gray-400">{seasonData?.name || "Season 1"}</div>
          </div>
        </button>
      </div>

      {/* Join AppRank - Wide Button */}
      <button
        onClick={() => {
          try {
            (miniAppSdk as any).actions.openUrl('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw');
          } catch (error) {
            console.log('SDK openUrl error:', error);
            window.open('https://farcaster.xyz/~/group/Vxk-YQtXXh7CiTo2xY4Tvw', '_blank');
          }
        }}
        className="flex items-center justify-center p-4 my-4 bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer pulse-glow max-w-md mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center border-2 border-white/60">
            <FiUsers size={24} className="text-white" />
          </div>
          <div className="text-left">
            <div className="text-orange-300 font-bold">Join AppRank Community</div>
            <div className="text-xs text-gray-400">Connect with builders</div>
          </div>
        </div>
      </button>

      {/* Create Promotion Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] max-w-2xl w-full max-h-[90vh] overflow-hidden pulse-glow">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiPlus className="text-purple-300" />
                Create Promotion
              </h2>
              <button
                onClick={handleCreateCancel}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[80vh] p-6">
              <PaymentForm user={currentUser} onSuccess={handleCreateSuccess} onCancel={handleCreateCancel} />
            </div>
          </div>
        </div>
      )}

      {/* Share & Earn Modal */}
      {isShareListOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] max-w-4xl w-full max-h-[90vh] overflow-hidden pulse-glow">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiShare2 className="text-purple-300" />
                Share & Earn ({availablePromos.length})
              </h2>
              <button
                onClick={() => setIsShareListOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[80vh]">
              <div className="p-4 space-y-4">
                {/* Promotion Type Filter */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setPromotionFilter('all')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${promotionFilter === 'all'
                      ? 'bg-slate-700 text-white border border-slate-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setPromotionFilter('quote')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${promotionFilter === 'quote'
                      ? 'bg-blue-600 text-white border border-blue-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                  >
                    💬 Quote
                  </button>
                  <button
                    onClick={() => setPromotionFilter('like_recast')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${promotionFilter === 'like_recast'
                      ? 'bg-emerald-600 text-white border border-emerald-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                  >
                    👍 Like & Recast
                  </button>
                  <button
                    onClick={() => setPromotionFilter('comment')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${promotionFilter === 'comment'
                      ? 'bg-green-600 text-white border border-green-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                  >
                    💬 Comment
                  </button>
                  <button
                    onClick={() => setPromotionFilter('follow')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${promotionFilter === 'follow'
                      ? 'bg-pink-600 text-white border border-pink-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                      }`}
                  >
                    👥 Follow
                  </button>
                </div>
                {/* Available Promotions Section */}
                {sortedAvailablePromos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="bg-green-600 text-white px-2 py-1 rounded-md text-sm">✅</span>
                      Available Campaigns ({sortedAvailablePromos.length})
                    </h3>
                    {sortedAvailablePromos.map((promo) => {
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
                                    skeleton.innerHTML = '<div class="text-red-500 text-sm">✖️ Preview unavailable</div>';
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
                            {/* No countdown timer in available section - those are in countdown section */}

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
                                    onClick={(e) => {
                                      if (!isCountingDown) {
                                        // Add click animation
                                        e.currentTarget.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }, 150);
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleSharePromo(promo), 10000);
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm active:scale-95"
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
                                    <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#23283a] border border-green-400 text-white text-sm font-bold rounded-xl shadow-lg">
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
                                        console.log('đź” Button clicked!');
                                        console.log('📱 Event:', e);
                                        console.log('🎯 Promo:', promo);
                                        console.log('✅ Button clicked successfully!');
                                        // Add click animation
                                        e.currentTarget.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }, 150);
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleLikeRecastBoth(promo, e), 10000);
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm active:scale-95"
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
                                    <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#23283a] border border-green-400 text-white text-sm font-bold rounded-xl shadow-lg">
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
                                        console.log('đź” Comment button clicked!');
                                        // Add click animation
                                        e.currentTarget.style.transform = 'scale(0.95)';
                                        setTimeout(() => {
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }, 150);
                                        startButtonCountdown(promo.id.toString());
                                        setTimeout(() => handleCommentAction(promo, e), 10000);
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed shadow-sm active:scale-95"
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
                                        : `💬 Comment & Earn ${promo.rewardPerShare} $CHESS`
                                    }
                                  </button>
                                );
                              } else if (promo.actionType === 'follow') {
                                // Check if user already completed this action
                                const isCompleted = completedActions[promo.id];
                                const isPending = pendingActions[promo.id];

                                if (isCompleted || isPending) {
                                  return (
                                    <div className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#23283a] border border-green-400 text-white text-sm font-bold rounded-xl shadow-lg">
                                      <span>✅</span>
                                      <span>Completed! Earned {promo.rewardPerShare} $CHESS</span>
                                    </div>
                                  );
                                }

                                const countdown = buttonCountdowns[promo.id.toString()];
                                const isCountingDown = countdown > 0;
                                const isDisabled = sharingPromoId === promo.id.toString() || !canShare || isCountingDown;

                                return (
                                  <div>
                                    <button
                                      onClick={(e) => {
                                        if (!isCountingDown && !completedActions[promo.id] && !isPending) {
                                          console.log('đź” Follow button clicked!');
                                          // Add click animation
                                          e.currentTarget.style.transform = 'scale(0.95)';
                                          setTimeout(() => {
                                            e.currentTarget.style.transform = 'scale(1)';
                                          }, 150);
                                          setSelectedFollowPromo(promo);
                                          setShowFollowModal(true);
                                        }
                                      }}
                                      disabled={isDisabled || completedActions[promo.id] || isPending}
                                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95 ${completedActions[promo.id]
                                        ? 'bg-gradient-to-r from-green-600 to-green-700'
                                        : isPending
                                          ? 'bg-gradient-to-r from-yellow-600 to-yellow-700'
                                          : 'bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 disabled:from-slate-600 disabled:to-slate-700'
                                        }`}
                                    >
                                      {sharingPromoId === promo.id.toString() ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : completedActions[promo.id] ? (
                                        <FiCheck size={14} />
                                      ) : isPending ? (
                                        <FiClock size={14} />
                                      ) : isCountingDown ? (
                                        <FiClock size={14} />
                                      ) : (
                                        '👥'
                                      )}
                                      {sharingPromoId === promo.id.toString()
                                        ? 'Processing...'
                                        : completedActions[promo.id]
                                          ? '✅ Followed & Earned'
                                          : isPending
                                            ? '⏳ Pending Follow - Awaiting Admin Approval'
                                            : isCountingDown
                                              ? `⏳ Wait ${countdown}s to Follow`
                                              : `👥 Follow & Earn ${promo.rewardPerShare} $CHESS`
                                      }
                                    </button>
                                    <div className="text-xs text-yellow-400 text-center mt-1">
                                      🎯 Available Now
                                    </div>
                                  </div>
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
                    })}
                  </div>
                )}

                {/* Countdown Promotions Section */}
                {sortedCountdownPromos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="bg-yellow-600 text-white px-2 py-1 rounded-md text-sm">⏰</span>
                      Countdown & Pending Campaigns ({sortedCountdownPromos.length})
                    </h3>
                    {sortedCountdownPromos.map((promo) => {
                      const timerInfo = shareTimers[promo.id.toString()];
                      const canShare = timerInfo?.canShare ?? true;
                      return (
                        <div key={promo.id} className="bg-[#181c23] p-3 rounded-lg border border-gray-700 flex flex-col gap-3 mb-3">
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

                          {/* Content Preview */}
                          <div className="bg-gray-900 rounded-lg p-2">
                            <div className="text-xs text-gray-400 mb-2">📱 Content Preview:</div>
                            <div className="bg-white rounded overflow-hidden h-40 sm:h-48 lg:h-56 relative">
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
                                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                                  if (skeleton) skeleton.style.display = 'none';
                                }}
                                onError={(e) => {
                                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                                  if (skeleton) {
                                    skeleton.innerHTML = '<div class="text-red-500 text-sm">✖️ Preview unavailable</div>';
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

                          {/* Countdown Timer or Pending Status */}
                          <div className="w-full flex items-center justify-center gap-2 text-center text-yellow-400 font-semibold bg-yellow-900/50 py-2 px-4 rounded-lg">
                            <FiClock size={16} />
                            <span>
                              {promo.actionType === 'comment'
                                ? `Wait ${formatTimeRemaining(timerInfo.timeRemaining)} to Comment Again`
                                : promo.actionType === 'follow'
                                  ? pendingActions[promo.id]
                                    ? `⏳ Pending Follow - Awaiting Admin Approval`
                                    : completedActions[promo.id]
                                      ? `✅ Follow Completed - $CHESS Earned`
                                      : `Wait ${formatTimeRemaining(timerInfo.timeRemaining)} to Follow Again`
                                  : `Wait ${formatTimeRemaining(timerInfo.timeRemaining)} to Quote Again`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No campaigns message */}
                {sortedAvailablePromos.length === 0 && sortedCountdownPromos.length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg">No active campaigns right now.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Lucky Box Preview - TEMPORARILY DISABLED */}
      {false && (
        <div className="flex justify-center mt-4 mb-6">
          <div className="bg-[#23283a] border border-[#a64d79] rounded-xl p-4 text-center max-w-sm">
            <div className="text-3xl mb-2 animate-bounce">đźŽ</div>
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
              đźŽ Try Lucky Box
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

      {/* Lucky Box Modal - TEMPORARILY DISABLED */}
      {
        false && (
          <LuckyBox
            isOpen={showLuckyBox}
            onClose={handleLuckyBoxClose}
            onClaim={handleLuckyBoxClaim}
            isPreview={isLuckyBoxPreview}
          />
        )
      }

      {/* Comment Modal */}
      {
        showCommentModal && selectedCommentPromo && (
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
                {/* Static list removed from create flow */}
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
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors active:scale-95"
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
        )
      }

      {/* Comment Modal */}
      {
        showCommentModal && selectedCommentPromo && (
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

              {/* Comment Process Info Box */}
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-sm">ℹ️</span>
                  <div className="text-blue-300 text-xs">
                    <p className="font-semibold mb-1">Comment Process:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Choose a comment template below</li>
                      <li>Click "1. Copy" to copy the template</li>
                      <li>Click "2. Open Post" to open the original post</li>
                      <li>Paste the comment as a reply</li>
                      <li>Click "3. Verify" to claim your reward</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Original Post Preview */}
              <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                <p className="text-sm text-gray-300 mb-2">📱 Original Post Preview:</p>

                {/* Original Post Iframe */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <iframe
                    src={selectedCommentPromo.castUrl}
                    className="w-full h-96 border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title="Original Post Preview"
                  />
                </div>

                {/* Instruction */}
                <div className="mt-3 p-3 bg-blue-900 border border-blue-600 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    📱 <strong>Above is the original post</strong> - Choose a comment template below, then copy and paste it as a reply
                  </p>
                </div>
              </div>

              {/* Comment Templates - show promoter's selected templates */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm text-gray-300">Choose a comment template:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleTemplateSort}
                      className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      {templateSortOrder === 'default' ? '🔄 Random' :
                        templateSortOrder === 'random' ? '📦 Compact' : '📋 Default'}
                    </button>
                    {/* Display mode toggle removed - only compact view */}
                  </div>
                </div>
                <div className="grid gap-2 grid-cols-2">
                  {getSortedTemplates(
                    selectedCommentPromo.commentTemplates && selectedCommentPromo.commentTemplates.length > 0
                      ? selectedCommentPromo.commentTemplates
                      : COMMENT_TEMPLATES
                  ).map((template, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedCommentTemplate(template)}
                      className={`p-2 text-xs rounded-lg font-medium transition-all duration-200 text-left ${selectedCommentTemplate === template
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
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selectedCommentTemplate);
                          setShareError('📋 Comment copied to clipboard! Now paste it as a reply to the post above.');
                        } catch (err) {
                          console.error('Failed to copy:', err);
                          setShareError('✖️ Failed to copy to clipboard. Please copy manually.');
                        }
                      }}
                      className="mt-2 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors active:scale-95"
                    >
                      1. Copy Comment to Clipboard
                    </button>
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
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors active:scale-95"
                >
                  Cancel
                </button>

                {/* Open Post Button - only show when template is selected */}
                {selectedCommentTemplate && (
                  <button
                    onClick={handleCommentSubmit}
                    disabled={!selectedCommentTemplate || sharingPromoId === selectedCommentPromo.id.toString()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95"
                  >
                    {sharingPromoId === selectedCommentPromo.id.toString() ? 'Opening...' : '2. Open Post & Comment'}
                  </button>
                )}

                {/* Verify Comment Button - always show for manual verification */}
                {selectedCommentTemplate && (
                  <button
                    onClick={async () => {
                      if (!selectedCommentPromo || !selectedCommentTemplate) return;

                      // Prevent multiple clicks
                      if (sharingPromoId === selectedCommentPromo.id.toString()) {
                        console.log('⏳ Already processing, please wait...');
                        return;
                      }

                      console.log('🔍 Verifying comment manually...');
                      setShareError('🔍 Verifying comment...');
                      setSharingPromoId(selectedCommentPromo.id.toString());

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
                          throw new Error(data.error || 'Failed to verify comment');
                        }

                        console.log('✅ Comment submitted for approval');
                        setShareError('✅ Comment submitted for admin approval! Reward will be credited after review.');

                        // Mark action as completed
                        setCompletedActions(prev => ({
                          ...prev,
                          [selectedCommentPromo.id]: true
                        }));

                        // Close modal immediately and refresh data
                        setShowCommentModal(false);
                        setSelectedCommentPromo(null);
                        setSelectedCommentTemplate('');
                        setShareError(null);
                        setSharingPromoId(null);

                        // Refresh data in background
                        refreshAllData();

                      } catch (error: any) {
                        console.error('✖️ Comment verification failed:', error);
                        setShareError(`✖️ Verification failed: ${error.message}`);
                        setSharingPromoId(null);
                      }
                    }}
                    disabled={sharingPromoId === selectedCommentPromo.id.toString()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95"
                  >
                    {sharingPromoId === selectedCommentPromo.id.toString() ? '⏳ Verifying...' : '3. Verify Comment'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Follow Modal */}
      {
        showFollowModal && selectedFollowPromo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Follow User</h3>
                <button
                  onClick={() => {
                    setShowFollowModal(false);
                    setSelectedFollowPromo(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-700 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Follow Instructions</h4>
                  <p className="text-gray-300 text-sm mb-3">
                    To earn {selectedFollowPromo.rewardPerShare} $CHESS, please follow this user:
                  </p>
                  <div className="bg-slate-600 rounded p-3 mb-3">
                    <p className="text-white font-mono text-sm">
                      @{selectedFollowPromo.castUrl.split('/').pop()}
                    </p>
                  </div>

                  <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3 mb-3">
                    <h5 className="text-blue-300 font-medium text-sm mb-2">📱 How to follow:</h5>
                    <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
                      <li>Click "Open in Farcaster App" below</li>
                      <li>This will open the user's profile</li>
                      <li>Look for the "Follow" button on their profile</li>
                      <li>Click the "Follow" button to follow them</li>
                      <li>Come back here and click "Verify Follow"</li>
                    </ol>
                  </div>

                  <p className="text-yellow-400 text-xs">
                    ⚠️ One-time only - no back-and-forth follows
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowFollowModal(false);
                      setSelectedFollowPromo(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const targetUsername = selectedFollowPromo.castUrl.split('/').pop() || '';
                        console.log('🔗 Opening profile for:', targetUsername);

                        // Try different methods to open profile
                        try {
                          // Method 1: Try miniAppSdk openUrl if available
                          if ((miniAppSdk as any).actions?.openUrl) {
                            const profileUrl = `https://farcaster.xyz/${targetUsername}`;
                            await (miniAppSdk as any).actions.openUrl(profileUrl);
                            console.log('✅ Profile opened via miniAppSdk.openUrl');
                          } else {
                            throw new Error('openUrl not available');
                          }
                        } catch (sdkError) {
                          console.log('⚠️ miniAppSdk.openUrl failed, trying window.open...');
                          try {
                            // Method 2: Try window.open with _blank
                            const profileUrl = `https://farcaster.xyz/${targetUsername}`;
                            const newWindow = window.open(profileUrl, '_blank', 'noopener,noreferrer');
                            if (!newWindow) {
                              throw new Error('Popup blocked');
                            }
                            console.log('✅ Profile opened via window.open');
                          } catch (windowError) {
                            console.log('⚠️ window.open failed, trying location.href...');
                            // Method 3: Fallback to location.href
                            const profileUrl = `https://farcaster.xyz/${targetUsername}`;
                            window.location.href = profileUrl;
                            console.log('✅ Profile opened via location.href');
                          }
                        }

                        // Show instruction message
                        setShareError('📱 Profile opened! Please follow the user, then click "Verify Follow" below...');

                      } catch (error) {
                        console.error('✖️ Error opening profile:', error);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors active:scale-95"
                  >
                    📱 Open in Farcaster App
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedFollowPromo) return;

                      setSharingPromoId(selectedFollowPromo.id.toString());
                      setShareError(null);

                      try {
                        console.log('🔍 Verifying follow action...');
                        await handleFollowAction(selectedFollowPromo);

                        // Close modal and refresh data
                        setShowFollowModal(false);
                        setSelectedFollowPromo(null);
                        setSharingPromoId(null);

                        // Refresh all data to update pending state
                        await refreshAllData();

                      } catch (error: any) {
                        console.error('✖️ Follow verification failed:', error);
                        setShareError(`✖️ Verification failed: ${error.message}`);
                        setSharingPromoId(null);
                      }
                    }}
                    disabled={sharingPromoId === selectedFollowPromo.id.toString()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed active:scale-95"
                  >
                    {sharingPromoId === selectedFollowPromo.id.toString() ? '⏳ Verifying...' : '✅ Verify Follow'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

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

      {/* Daily Code Modal */}
      {
        showDailyCodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] max-w-md w-full p-4 sm:p-6 pulse-glow relative max-h-[95vh] overflow-y-auto">
              <button
                onClick={() => setShowDailyCodeModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <FiX size={24} />
              </button>

              <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 italic tracking-tighter uppercase">
                <FiGift className="text-yellow-400" />
                Promotion Code
              </h2>

              {/* Tab Switcher */}
              {!dailyCodeSuccess && (
                <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                  <button
                    onClick={() => setActiveDailyCodeTab('standard')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeDailyCodeTab === 'standard'
                      ? 'bg-gray-700 text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    STANDARD
                  </button>
                  <button
                    onClick={() => setActiveDailyCodeTab('vip')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeDailyCodeTab === 'vip'
                      ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      : 'text-cyan-400/60 hover:text-cyan-400'
                      }`}
                  >
                    DIAMOND VIP 💎 {isVip && <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />}
                  </button>
                </div>
              )}

              {activeDailyCodeTab === 'vip' && !dailyCodeSuccess ? (
                <div className="space-y-6">
                  <div className="p-3 bg-gradient-to-br from-cyan-900/40 to-purple-900/40 border border-cyan-500/30 rounded-2xl shadow-xl">
                    {/* Countdown Timer */}

                    <h3 className="text-cyan-300 font-black text-[10px] mb-2 flex items-center gap-2 uppercase tracking-wider">
                      <span className="text-lg">💎</span> VIP Daily Bundle
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: "🎟️", text: "1x FREE Lambo Lotto Ticket", color: "text-cyan-300" },
                        { icon: "📈", text: "100k Like & Recast Promo", color: "text-purple-300" },
                        { icon: "💬", text: "100k Quote Promotion", color: "text-cyan-300" },
                        { icon: "📝", text: "100k Comment Promotion", color: "text-purple-300" }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-black/30 rounded-lg border border-white/5">
                          <span className="text-lg">{item.icon}</span>
                          <span className={`text-xs font-bold ${item.color}`}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                      <p className="text-[9px] text-cyan-200 leading-tight font-bold">
                        VIP detected! Your full 300k bundle + Lotto ticket is ready.
                      </p>
                    </div>
                  </div>

                  {!isVip && (
                    <div className="p-5 bg-black/60 border border-cyan-500/30 rounded-2xl shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-2 opacity-20 transform group-hover:scale-110 transition-transform">
                        <FiZap size={40} className="text-cyan-400" />
                      </div>
                      <h4 className="text-white font-black text-sm mb-2 uppercase tracking-tighter">Become a Diamond VIP</h4>
                      <p className="text-[11px] text-gray-400 mb-4 leading-normal">
                        Unlock lifetime rewards and become a legend in the AppRank ecosystem.
                      </p>
                      <div className="flex items-center justify-between mb-4 bg-gray-900/50 p-3 rounded-xl border border-white/5">
                        <div className="text-[10px] font-bold text-gray-500 uppercase">Mint Price</div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs font-black text-cyan-400">10,000,000 $CHESS</div>
                        </div>
                      </div>
                      <button
                        onClick={handleMintNft}
                        disabled={approvePending || mintPending || isWaitingApprove || isWaitingMint || balanceLoading}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(6,182,212,0.2)] active:scale-95 disabled:opacity-50"
                      >
                        {approvePending || isWaitingApprove ? "Approving CHESS..." :
                          mintPending || isWaitingMint ? "Minting NFT..." :
                            !hasAllowance ? "Step 1: Approve $CHESS" : "Step 2: Mint Diamond VIP"}
                      </button>
                      {chessBalance && currentPrice && BigInt(chessBalance as any) < BigInt(currentPrice as any) && (
                        <p className="mt-2 text-[9px] text-red-400 font-bold text-center">Insufficient $CHESS balance</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                        {isVip ? "VIP Status: ACTIVE (Optional Code)" : "Enter VIP or Daily Code"}
                      </label>
                      <input
                        type="text"
                        value={dailyCode}
                        onChange={(e) => setDailyCode(e.target.value)}
                        placeholder={isVip ? "✨ VIP DETECTED - NO CODE NEEDED ✨" : "Enter secret code..."}
                        className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white focus:ring-1 focus:outline-none transition-all font-black uppercase text-xs ${isVip
                          ? 'border-cyan-400 ring-1 ring-cyan-400/50 placeholder:text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                          : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400 placeholder:text-cyan-400/30'}`}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1.5 ml-1">
                        Warpcast URL to Promote
                      </label>
                      <input
                        type="text"
                        value={dailyCodeCastUrl}
                        onChange={(e) => setDailyCodeCastUrl(e.target.value)}
                        placeholder="https://warpcast.com/..."
                        className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all placeholder:text-gray-600 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-3 ml-1">
                        Choose Reward Per Share
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1000, 5000, 10000, 20000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setDailyCodeRewardPerShare(Math.min(amt, isVip ? 20000 : 5000))}
                            disabled={!isVip && amt > 5000}
                            className={`py-2 rounded-xl text-[10px] font-black transition-all border ${dailyCodeRewardPerShare === Math.min(amt, isVip ? 20000 : 5000)
                              ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                              : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                              } ${!isVip && amt > 5000 ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            {amt >= 1000 ? `${amt / 1000}k` : amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleRedeemCode}
                      disabled={loading || (!isVip && !dailyCode) || !dailyCodeCastUrl}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase tracking-tighter"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <FiZap className="animate-pulse" />
                          Activate VIP Bundle
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : dailyCodeSuccess ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-green-400 mb-2">Success!</h3>
                  <p className="text-white mb-6">{dailyCodeSuccess}</p>
                  <button
                    onClick={() => {
                      setShowDailyCodeModal(false);
                      refreshAllData();
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Awesome!
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Secret Code
                    </label>
                    <input
                      type="text"
                      value={dailyCode}
                      onChange={(e) => setDailyCode(e.target.value)}
                      placeholder="Enter today's code..."
                      className="w-full bg-[#1a1d26] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Cast URL to Promote
                    </label>
                    <input
                      type="text"
                      value={dailyCodeCastUrl}
                      onChange={(e) => setDailyCodeCastUrl(e.target.value)}
                      placeholder="https://warpcast.com/..."
                      className="w-full bg-[#1a1d26] border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-3 ml-1">
                      Choose Reward Per Share
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setDailyCodeRewardPerShare(amt)}
                          className={`py-2 rounded-xl text-[10px] font-black transition-all border ${dailyCodeRewardPerShare === amt
                            ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                        >
                          {amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {dailyCodeError && (
                    <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2">
                      <FiAlertTriangle />
                      {dailyCodeError}
                    </div>
                  )}

                  <button
                    onClick={handleRedeemCode}
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white rounded-xl font-bold shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <FiGift />
                        Redeem & Launch
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Season Modal */}
      <SeasonModal
        isOpen={showSeasonModal}
        onClose={() => setShowSeasonModal(false)}
        userFid={profile?.fid}
      />
    </div>
  );
}

export default function PromotePage() {
  return (
    <Suspense fallback={null}>
      <PromotePageContent />
    </Suspense>
  );
}
