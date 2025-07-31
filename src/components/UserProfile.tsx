"use client"

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { FiUser, FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp } from 'react-icons/fi'

interface UserProfileProps {
  onLogout?: () => void;
}

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfp?: string;
}

interface FarcasterContext {
  user?: FarcasterUser;
}

export default function UserProfile({ onLogout: _onLogout }: UserProfileProps) {
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
        // Try to get a proper profile picture URL
        let pfpUrl = farcasterUser.pfp;
        
        // If pfp is a relative URL, make it absolute
        if (pfpUrl && !pfpUrl.startsWith('http')) {
          pfpUrl = `https://warpcast.com${pfpUrl}`;
        }
        
        // If still no pfp, use a default
        if (!pfpUrl) {
          pfpUrl = "https://i.seadn.io/gae/2hDpuTi-0AMKvoZJGd-yKWvK4tKdQr_kLIpB_qSeMau2TNGCNidAosMEvrEXFO9Gbdtmlp_qL4r9CgJj8qLbqg7Q?auto=format&dpr=1&w=1000";
        }
        
        setProfile({
          fid: farcasterUser.fid,
          username: farcasterUser.username || "user",
          displayName: farcasterUser.displayName || "Current User",
          pfp: pfpUrl
        })
        console.log('User authenticated in UserProfile:', farcasterUser)
        console.log('Profile PFP URL:', farcasterUser.pfp)
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
          <FiUser size={48} className="mx-auto mb-4 text-gray-600" />
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
          <div className="relative">
            {profile.pfp ? (
              <img 
                src={profile.pfp} 
                alt="Profile" 
                className="w-12 h-12 rounded-full border-2 border-purple-500 object-cover"
                onError={(e) => {
                  console.log('Image failed to load:', profile.pfp);
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
                onLoad={() => console.log('Image loaded successfully:', profile.pfp)}
              />
            ) : null}
            <div className={`w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center ${profile.pfp ? 'hidden' : ''}`}>
              <FiUser size={20} className="text-white" />
            </div>
          </div>
          
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
                <FiUser className="text-purple-400" />
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
        </div>
      </div>
    </div>
  )
}