"use client"

import { useProfile, useSignIn } from '@farcaster/auth-kit'
import { FiUser, FiDollarSign, FiTrendingUp, FiLogOut } from 'react-icons/fi'
import Image from 'next/image'

interface UserProfileProps {
  onLogout?: () => void;
}

export default function UserProfile({ onLogout }: UserProfileProps) {
  const { profile, isAuthenticated } = useProfile()
  const { signOut } = useSignIn({})

  if (!isAuthenticated || !profile) {
    return (
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
        <div className="text-center text-gray-400">
          <FiUser size={48} className="mx-auto mb-4 text-gray-600" />
          <p>Please connect your Farcaster account</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    signOut()
    onLogout?.()
  }

  return (
    <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Profile</h2>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
        >
          <FiLogOut size={14} />
          Logout
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {profile.pfpUrl ? (
          <Image 
            src={profile.pfpUrl} 
            alt="Profile" 
            width={64} 
            height={64} 
            className="w-16 h-16 rounded-full border-2 border-purple-500"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center">
            <FiUser size={24} className="text-white" />
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-white">
            {profile.displayName || 'Unknown User'}
          </h3>
          <p className="text-purple-300">@{profile.username}</p>
          <p className="text-sm text-gray-400">FID: {profile.fid}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
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
        className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={true} // Will be enabled when there are pending claims
      >
        Claim All Earnings (0 $CHESS)
      </button>
    </div>
  )
}