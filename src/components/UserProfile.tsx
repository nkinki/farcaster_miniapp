"use client"

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp, FiCreditCard } from 'react-icons/fi'
import { useAccount } from 'wagmi'

interface UserProfileProps {
  onLogout?: () => void;
  userPromos?: PromoCast[];
  onEditPromo?: (promo: PromoCast) => void;
  userStats?: {
    totalEarnings: number;
    totalShares: number;
    pendingClaims: number;
  };
}

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface PromoCast {
  id: string;
  castUrl: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
  };
  rewardPerShare: number;
  totalBudget: number;
  sharesCount: number;
  remainingBudget: number;
  shareText?: string;
  createdAt: string;
  status: 'active' | 'paused' | 'completed';
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

export default function UserProfile({ onLogout: _onLogout, userPromos = [], onEditPromo, userStats }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  
  // Wallet connection
  const { address, isConnected } = useAccount()
  
  useEffect(() => {
    // Check haptics support - try to use haptics directly
    const checkHaptics = async () => {
      try {
        // Try to call a haptic function to see if it's available
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
      console.log('Farcaster user context in UserProfile:', farcasterUser)
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
        console.log('User authenticated in UserProfile:', farcasterUser)
      } else {
        setIsAuthenticated(false)
        setProfile(null)
      }
    }).catch((error) => {
      console.error('Error getting Farcaster context in UserProfile:', error)
      setIsAuthenticated(false)
      setProfile(null)
    })
  }, [])

  if (!isAuthenticated || !profile) {
    return (
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
        <div className="text-center text-gray-400">
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  const isMobile = context?.client?.platformType === 'mobile'
  const safeArea = context?.client?.safeAreaInsets
  
  return (
    <div 
      className={`bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden ${
        isMobile ? 'mx-2' : 'mx-0'
      }`}
      style={{
        marginTop: safeArea?.top || 0,
        marginBottom: safeArea?.bottom || 0,
        marginLeft: safeArea?.left || 0,
        marginRight: safeArea?.right || 0,
      }}
    >
      {/* Header - Always visible */}
      <div 
        className={`flex items-center justify-between cursor-pointer hover:bg-[#2a2f42] transition-colors ${
          isMobile ? 'p-4' : 'p-6'
        }`}
        onClick={async () => {
          setIsExpanded(!isExpanded);
          if (hapticsSupported) {
            try {
              await sdk.haptics.selectionChanged();
            } catch (error) {
              console.log('Haptics error:', error);
            }
          }
        }}
      >
        <div className="flex items-center gap-4">
          {profile.pfpUrl && (
            <img 
              src={profile.pfpUrl} 
              alt="Profile" 
              className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-white">
              {profile.displayName || 'Unknown User'}
            </h3>
            <p className="text-purple-300 text-sm">@{profile.username}</p>
            
            {isConnected && (
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                <FiCreditCard size={12} />
                {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
              </p>
            )}

          </div>
        </div>
        
                         <div className="flex items-center gap-2">
                   <span className="text-sm text-gray-400">FID: {profile.fid}</span>
                   {isExpanded ? (
                     <FiChevronUp size={20} className="text-purple-400" />
                   ) : (
                     <FiChevronDown size={20} className="text-purple-400" />
                   )}
                 </div>
      </div>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-6 pb-6">
          {/* Wallet Info */}
          {isConnected && (
            <div className="mb-4 p-3 bg-[#181c23] rounded-lg border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <FiCreditCard className="text-purple-400" />
                <span className="text-white font-semibold text-sm">Connected Wallet</span>
              </div>
              <p className="text-gray-300 text-sm font-mono">{address}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiDollarSign className="text-green-400" />
                <span className="text-white font-semibold">{userStats?.totalEarnings || 0}</span>
              </div>
              <p className="text-xs text-gray-400">Total Earnings</p>
            </div>
            
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiTrendingUp className="text-blue-400" />
                <span className="text-white font-semibold">{userStats?.pendingClaims || 0}</span>
              </div>
              <p className="text-xs text-gray-400">Pending Claims</p>
            </div>
            
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-white font-semibold">{userStats?.totalShares || 0}</span>
              </div>
              <p className="text-xs text-gray-400">Total Shares</p>
            </div>
          </div>

          {/* Claim Button */}
          <button
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!userStats?.pendingClaims || userStats.pendingClaims === 0}
          >
            Claim All Earnings ({userStats?.pendingClaims || 0} $CHESS)
          </button>

          {/* User's Own Promos */}
          {userPromos.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-white mb-4">My Promotions</h4>
              <div className="space-y-3">
                {userPromos.map((promo) => (
                  <div key={promo.id} className="bg-[#181c23] rounded-lg p-4 border border-gray-700">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-white font-medium truncate">{promo.castUrl}</p>
                        <p className="text-sm text-gray-400">Reward: {promo.rewardPerShare} $CHESS</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (hapticsSupported) {
                            try {
                              await sdk.haptics.impactOccurred('light');
                            } catch (error) {
                              console.log('Haptics error:', error);
                            }
                          }
                          onEditPromo?.(promo);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Shares: {promo.sharesCount}</span>
                      <span>Budget: {promo.remainingBudget}/{promo.totalBudget}</span>
                      <span className={`px-2 py-1 rounded ${
                        promo.status === 'active' ? 'bg-green-600 text-white' :
                        promo.status === 'paused' ? 'bg-yellow-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {promo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}