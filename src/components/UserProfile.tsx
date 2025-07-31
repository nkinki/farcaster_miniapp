"use client"

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface UserProfileProps {
  onLogout?: () => void;
  userPromos?: PromoCast[];
  onEditPromo?: (promo: PromoCast) => void;
}

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
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
}

export default function UserProfile({ onLogout: _onLogout, userPromos = [], onEditPromo }: UserProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [profile, setProfile] = useState<FarcasterUser | null>(null)
  
  useEffect(() => {
    // Get Farcaster user context
    sdk.context.then((ctx: FarcasterContext) => {
      const farcasterUser = ctx.user
      console.log('Farcaster user context in UserProfile:', farcasterUser)
      
      if (farcasterUser?.fid) {
        setIsAuthenticated(true)
        setProfile({
          fid: farcasterUser.fid,
          username: farcasterUser.username || "user",
          displayName: farcasterUser.displayName || "Current User"
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

  return (
    <div className="bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between p-6 cursor-pointer hover:bg-[#2a2f42] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          
          <div>
            <h3 className="text-lg font-semibold text-white">
              {profile.displayName || 'Unknown User'}
            </h3>
            <p className="text-purple-300 text-sm">@{profile.username}</p>
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
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiDollarSign className="text-green-400" />
                <span className="text-white font-semibold">0</span>
              </div>
              <p className="text-xs text-gray-400">Total Earnings</p>
            </div>
            
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FiTrendingUp className="text-blue-400" />
                <span className="text-white font-semibold">0</span>
              </div>
              <p className="text-xs text-gray-400">Pending Claims</p>
            </div>
            
            <div className="text-center p-3 bg-[#181c23] rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-white font-semibold">0</span>
              </div>
              <p className="text-xs text-gray-400">Total Shares</p>
            </div>
          </div>

          {/* Claim Button */}
          <button
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={true} // Will be enabled when there are pending claims
          >
            Claim All Earnings (0 $CHESS)
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
                        onClick={() => onEditPromo?.(promo)}
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