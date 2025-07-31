"use client"

import { useState, useEffect, useCallback } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiTrendingUp, FiPlus } from "react-icons/fi"
import Link from "next/link"
import UserProfile from "../../components/UserProfile"

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContext {
  user?: FarcasterUser;
  client?: {
    platformType?: 'web' | 'mobile';
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
  location?: {
    type: string;
    cast?: {
      hash: string;
      text: string;
      embeds?: string[];
    };
  };
}

// Types
interface PromoCast {
  id: string;
  castUrl: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
  };
  rewardPerShare: number;
  totalBudget: number;
  sharesCount: number;
  remainingBudget: number;
  shareText?: string;
  createdAt: string;
  status: 'active' | 'paused' | 'completed';
}

// Database types
interface DatabasePromotion {
  id: number;
  fid: number;
  username: string;
  display_name: string | null;
  cast_url: string;
  share_text: string | null;
  reward_per_share: number;
  total_budget: number;
  shares_count: number;
  remaining_budget: number;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

// Helper function to convert database promotion to PromoCast
const convertDbToPromoCast = (dbPromo: DatabasePromotion): PromoCast => ({
  id: dbPromo.id.toString(),
  castUrl: dbPromo.cast_url,
  author: {
    fid: dbPromo.fid,
    username: dbPromo.username,
    displayName: dbPromo.display_name || dbPromo.username,
  },
  rewardPerShare: dbPromo.reward_per_share,
  totalBudget: dbPromo.total_budget,
  sharesCount: dbPromo.shares_count,
  remainingBudget: dbPromo.remaining_budget,
  shareText: dbPromo.share_text || undefined,
  createdAt: dbPromo.created_at,
  status: dbPromo.status
});

export default function PromotePage() {
  // Use mini app SDK for authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  
  // Campaign creation state
  const [showForm, setShowForm] = useState(false)
  const [castUrl, setCastUrl] = useState("")
  const [shareText, setShareText] = useState("")
  const [rewardPerShare, setRewardPerShare] = useState(1000)
  const [totalBudget, setTotalBudget] = useState(10000)
  const [isCreating, setIsCreating] = useState(false)
  
  // Database state
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([])
  const [loading, setLoading] = useState(true)
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null)

  useEffect(() => {
    // Check haptics support
    const checkHaptics = async () => {
      try {
        await sdk.haptics.impactOccurred('light');
        setHapticsSupported(true);
        console.log('Haptics supported: true');
      } catch (error) {
        setHapticsSupported(false);
        console.log('Haptics not supported:', error);
      }
    };
    
    checkHaptics();

    // Get Farcaster user context
    sdk.context.then((ctx: FarcasterContext) => {
      const farcasterUser = ctx.user
      console.log('Farcaster user context in promote:', farcasterUser)
      console.log('Platform type:', ctx.client?.platformType)
      console.log('Location type:', ctx.location?.type)
      
      setContext(ctx)
      
      if (farcasterUser?.fid) {
        setIsAuthenticated(true)
        setProfile({
          fid: farcasterUser.fid,
          username: farcasterUser.username || "user",
          displayName: farcasterUser.displayName || "Current User",
          pfpUrl: farcasterUser.pfpUrl
        })
        console.log('User authenticated in promote:', farcasterUser)
      } else {
        setIsAuthenticated(false)
        setProfile(null)
      }
    }).catch((error) => {
      console.error('Error getting Farcaster context in promote:', error)
      setIsAuthenticated(false)
      setProfile(null)
    })
  }, [])

  // Fetch promotions from database
  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const response = await fetch('/api/promotions');
        if (response.ok) {
          const data = await response.json();
          const convertedPromos = data.promotions.map(convertDbToPromoCast);
          setPromoCasts(convertedPromos);
        } else {
          console.error('Failed to fetch promotions');
        }
      } catch (error) {
        console.error('Error fetching promotions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  // Use real user data if authenticated, otherwise mock data
  const currentUser = isAuthenticated && profile ? {
    fid: profile.fid || 0,
    username: profile.username || "user",
    displayName: profile.displayName || "Current User"
  } : {
    fid: 1234,
    username: "testuser",
    displayName: "Test User"
  }
  


  const handleCreateCampaign = async () => {
    if (!castUrl.trim()) {
      if (hapticsSupported) {
        try {
          await sdk.haptics.notificationOccurred('error');
        } catch (error) {
          console.log('Haptics error:', error);
        }
      }
      alert("Please enter a cast URL")
      return
    }

    if (!isAuthenticated) {
      if (hapticsSupported) {
        try {
          await sdk.haptics.notificationOccurred('error');
        } catch (error) {
          console.log('Haptics error:', error);
        }
      }
      alert("Please connect your Farcaster account first")
      return
    }

    setIsCreating(true)
    
    try {
      // Create promotion in database
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: currentUser.fid,
          username: currentUser.username,
          displayName: currentUser.displayName,
          castUrl: castUrl,
          shareText: shareText || undefined,
          rewardPerShare: rewardPerShare,
          totalBudget: totalBudget
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Success response:', data);
        const newPromo = convertDbToPromoCast(data.promotion);
        
        setPromoCasts(prev => [newPromo, ...prev]);
        setCastUrl("");
        setShareText("");
        setShowForm(false);
        
        // Haptic feedback for successful campaign creation
        if (hapticsSupported) {
          try {
            await sdk.haptics.notificationOccurred('success');
          } catch (error) {
            console.log('Haptics error:', error);
          }
        }
        
        alert("Campaign created successfully!")
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        alert(`Failed to create campaign: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Network Error creating campaign:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false);
    }
  }

  // Auto-adjust reward if too low and no shares
  const checkAndAdjustReward = useCallback(async (promo: PromoCast) => {
    if (promo.sharesCount === 0 && promo.rewardPerShare < 2000) {
      const newReward = Math.min(promo.rewardPerShare * 1.5, 5000);
      
      try {
        const response = await fetch(`/api/promotions/${promo.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rewardPerShare: Math.round(newReward)
          })
        });

        if (response.ok) {
          const updatedPromo = { ...promo, rewardPerShare: Math.round(newReward) };
          setPromoCasts(prev => prev.map(p => p.id === promo.id ? updatedPromo : p));
          
          console.log(`Auto-adjusted reward for promo ${promo.id} from ${promo.rewardPerShare} to ${newReward} $CHESS`);
          
          // Haptic feedback for auto-adjustment
          if (hapticsSupported) {
            try {
              await sdk.haptics.notificationOccurred('warning');
            } catch (error) {
              console.log('Haptics error:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error updating promotion:', error);
      }
    }
  }, [hapticsSupported])

  const handleSharePromo = async (promo: PromoCast) => {
    if (!isAuthenticated) {
      alert('Please connect your Farcaster account first');
      return;
    }

    if (promo.author.fid === currentUser.fid) {
      alert('You cannot share your own campaign');
      return;
    }

    if (promo.status !== 'active') {
      alert('This campaign is not active');
      return;
    }

    if (promo.remainingBudget < promo.rewardPerShare) {
      alert('This campaign has insufficient budget');
      return;
    }

    setSharingPromoId(promo.id);
    
    try {
      // Create share text
      const shareText = promo.shareText || `Check out this amazing post! ${promo.castUrl}`;
      
      // Use Farcaster SDK to compose cast
      const castResult = await sdk.actions.composeCast({
        text: shareText,
        embeds: [promo.castUrl]
      });

      // Check if cast was actually published (not cancelled)
      if (!castResult || !castResult.cast) {
        console.log('Cast was cancelled or failed:', castResult);
        return; // Don't record share if cast was cancelled
      }

      console.log('Cast published successfully:', castResult);

      // Record share in database only after successful cast
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promotionId: parseInt(promo.id),
          sharerFid: currentUser.fid,
          sharerUsername: currentUser.username,
          shareText: shareText,
          rewardAmount: promo.rewardPerShare
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Share created:', data);
        
        // Update local state
        const updatedPromo = {
          ...promo,
          sharesCount: promo.sharesCount + 1,
          remainingBudget: promo.remainingBudget - promo.rewardPerShare
        };
        setPromoCasts(prev => prev.map(p => p.id === promo.id ? updatedPromo : p));
        
        // Haptic feedback
        if (hapticsSupported) {
          try {
            await sdk.haptics.notificationOccurred('success');
          } catch (error) {
            console.log('Haptics error:', error);
          }
        }
        
        alert(`Successfully shared! You earned ${promo.rewardPerShare} $CHESS!`);
      } else if (response.status === 429) {
        const errorData = await response.json();
        console.error('Share limit reached:', errorData);
        alert(errorData.error);
      } else {
        const errorData = await response.json();
        console.error('Share failed:', errorData);
        alert(`Failed to record share: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sharing promo:', error);
      if (error instanceof Error && error.message.includes('cancelled')) {
        console.log('User cancelled the cast');
        return; // Don't show error for user cancellation
      }
      alert(`Share failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSharingPromoId(null);
    }
  }

  const calculateProgress = (promo: PromoCast) => {
    const spent = promo.totalBudget - promo.remainingBudget
    return (spent / promo.totalBudget) * 100
  }

  // Auto-check and adjust rewards every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      promoCasts.forEach(checkAndAdjustReward);
    }, 30000);

    return () => clearInterval(interval);
  }, [promoCasts, checkAndAdjustReward]);

  // Auto-fill cast URL if coming from cast context
  useEffect(() => {
    if (context?.location?.type === 'cast_embed' && context.location.cast?.embeds?.[0]) {
      setCastUrl(context.location.cast.embeds[0]);
      console.log('Auto-filled cast URL from context:', context.location.cast.embeds[0]);
    }
  }, [context]);

  const isMobile = context?.client?.platformType === 'mobile'
  const safeArea = context?.client?.safeAreaInsets

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading promotions...</div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 ${
        isMobile ? 'px-2' : 'px-4'
      } py-6`}
      style={{
        paddingTop: (safeArea?.top || 0) + 24,
        paddingBottom: (safeArea?.bottom || 0) + 24,
        paddingLeft: (safeArea?.left || 0) + (isMobile ? 8 : 16),
        paddingRight: (safeArea?.right || 0) + (isMobile ? 8 : 16),
      }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors">
            <FiArrowLeft size={20} />
            <span>Back to AppRank</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Promotion Campaigns</h1>
        </div>

        {/* User Profile */}
        <div className="mb-8">
          <UserProfile
            userPromos={promoCasts.filter(promo => promo.author.fid === currentUser.fid)}
            onEditPromo={(promo) => {
              console.log('Edit promo:', promo);
              alert('Edit functionality coming soon!');
            }}
          />
        </div>

        {/* Start Promo Campaign Button */}
        <div className="flex justify-center mb-8">
          
          <button
            onClick={async () => {
              setShowForm((v) => !v);
              if (hapticsSupported) {
                try {
                  await sdk.haptics.impactOccurred('medium');
                } catch (error) {
                  console.log('Haptics error:', error);
                }
              }
            }}
            className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
            aria-expanded={showForm}
            aria-controls="promo-form"
          >
            <FiPlus size={20} />
            Start Promo Campaign
          </button>
        </div>

        {/* Campaign Creation Form */}
        {showForm && (
          <div id="promo-form" className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79]">
            <h2 className="text-xl font-bold text-white mb-4">Create New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cast URL</label>
                <input
                  type="url"
                  value={castUrl}
                  onChange={(e) => setCastUrl(e.target.value)}
                  placeholder="https://farcaster.xyz/..."
                  className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Share Text (Optional)</label>
                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Check out this amazing post!"
                  rows={3}
                  className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reward per Share ($CHESS)</label>
                  <input
                    type="number"
                    value={rewardPerShare}
                    onChange={(e) => setRewardPerShare(parseInt(e.target.value) || 0)}
                    min="100"
                    step="100"
                    className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget ($CHESS)</label>
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(parseInt(e.target.value) || 0)}
                    min="1000"
                    step="1000"
                    className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCreateCampaign}
                  disabled={isCreating}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? "Creating..." : "Create Campaign"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Active Campaigns</h2>
            <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-lg">
              ⏰ Share limit: 48h per campaign
            </div>
          </div>
          {promoCasts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No campaigns yet</div>
              <div className="text-gray-500">Create your first promotion campaign to get started!</div>
            </div>
          ) : (
            promoCasts.map((promo) => (
              <div key={promo.id} className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{promo.author.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{promo.author.displayName}</h3>
                        <p className="text-purple-300 text-sm">@{promo.author.username}</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm break-all">{promo.castUrl}</p>
                                         {promo.shareText && (
                       <p className="text-gray-400 text-sm mt-2 italic">&ldquo;{promo.shareText}&rdquo;</p>
                     )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      promo.status === 'active' ? 'bg-green-600 text-white' :
                      promo.status === 'paused' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {promo.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiDollarSign className="text-green-400" />
                      <span className="text-white font-semibold">{promo.rewardPerShare}</span>
                    </div>
                    <p className="text-xs text-gray-400">Reward per Share</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiUsers className="text-blue-400" />
                      <span className="text-white font-semibold">{promo.sharesCount}</span>
                    </div>
                    <p className="text-xs text-gray-400">Total Shares</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiTrendingUp className="text-purple-400" />
                      <span className="text-white font-semibold">{promo.remainingBudget}</span>
                    </div>
                    <p className="text-xs text-gray-400">Remaining Budget</p>
                  </div>
                  <div className="text-center p-3 bg-[#181c23] rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-white font-semibold">{Math.round(calculateProgress(promo))}%</span>
                    </div>
                    <p className="text-xs text-gray-400">Progress</p>
                  </div>
                </div>

                <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(promo)}%` }}
                  ></div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleSharePromo(promo)}
                    disabled={sharingPromoId === promo.id || promo.author.fid === currentUser.fid}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg transition-all duration-300 ${
                      promo.author.fid === currentUser.fid
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : sharingPromoId === promo.id
                        ? 'bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                    }`}
                  >
                    {sharingPromoId === promo.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sharing...
                      </>
                    ) : promo.author.fid === currentUser.fid ? (
                      <>
                        <FiShare2 size={16} />
                        Your Campaign
                      </>
                    ) : (
                      <>
                        <FiShare2 size={16} />
                        Share & Earn {promo.rewardPerShare} $CHESS
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}