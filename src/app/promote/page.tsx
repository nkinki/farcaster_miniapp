"use client"

import { useState, useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiTrendingUp, FiPlus } from "react-icons/fi"
import Image from "next/image"
import Link from "next/link"

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

// Mock data for demo
const mockPromoCasts: PromoCast[] = [
  {
    id: "1",
    castUrl: "https://farcaster.xyz/0x123...",
    author: {
      fid: 1234,
      username: "alice",
      displayName: "Alice",
      pfpUrl: "https://example.com/alice.jpg"
    },
    rewardPerShare: 1000,
    totalBudget: 10000,
    sharesCount: 8,
    remainingBudget: 2000,
    shareText: "Check out this awesome post!",
    createdAt: "2024-01-15T10:00:00Z",
    status: 'active'
  },
  {
    id: "2", 
    castUrl: "https://farcaster.xyz/0x456...",
    author: {
      fid: 5678,
      username: "bob",
      displayName: "Bob",
      pfpUrl: "https://example.com/bob.jpg"
    },
    rewardPerShare: 500,
    totalBudget: 5000,
    sharesCount: 10,
    remainingBudget: 0,
    shareText: "Amazing content!",
    createdAt: "2024-01-14T15:30:00Z",
    status: 'completed'
  },
  {
    id: "3",
    castUrl: "https://farcaster.xyz/0x789...", 
    author: {
      fid: 9012,
      username: "charlie",
      displayName: "Charlie",
      pfpUrl: "https://example.com/charlie.jpg"
    },
    rewardPerShare: 2000,
    totalBudget: 20000,
    sharesCount: 5,
    remainingBudget: 10000,
    createdAt: "2024-01-13T09:15:00Z",
    status: 'active'
  }
];

export default function PromotePage() {
  const [castUrl, setCastUrl] = useState("")
  const [rewardPerShare, setRewardPerShare] = useState(1000)
  const [shareText, setShareText] = useState("")
  const [campaignBudget, setCampaignBudget] = useState(10000)
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>(mockPromoCasts)
  const [isCreating, setIsCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    sdk.actions.ready()
  }, [])

  const handleCreateCampaign = async () => {
    if (!castUrl.trim()) {
      alert("Please enter a cast URL")
      return
    }

    setIsCreating(true)
    
    // Mock API call
    setTimeout(() => {
      const newPromoCast: PromoCast = {
        id: Date.now().toString(),
        castUrl: castUrl,
        author: {
          fid: 9999,
          username: "user",
          displayName: "Current User",
        },
        rewardPerShare: rewardPerShare,
        totalBudget: campaignBudget,
        sharesCount: 0,
        remainingBudget: campaignBudget,
        shareText: shareText || undefined,
        createdAt: new Date().toISOString(),
        status: 'active'
      }
      
      setPromoCasts(prev => [newPromoCast, ...prev])
      setCastUrl("")
      setShareText("")
      setIsCreating(false)
      setShowForm(false)
      
      // Use Mini App SDK composeCast instead of external URL
      if (shareText.trim()) {
        sdk.actions.composeCast({
          text: shareText,
          embeds: [castUrl]
        })
      } else {
        sdk.actions.composeCast({
          text: `Check out this cast!`,
          embeds: [castUrl]
        })
      }
      
      alert("Campaign created successfully!")
    }, 1000)
  }

  const sortedPromoCasts = [...promoCasts].sort((a, b) => {
    // First sort by shares (higher first)
    if (b.sharesCount !== a.sharesCount) {
      return b.sharesCount - a.sharesCount
    }
    // Then by $CHESS value (lower first)
    return a.rewardPerShare - b.rewardPerShare
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition text-sm"
          >
            <FiArrowLeft size={14} />
            Back
          </Link>
          <h1 className="text-3xl font-bold text-white uppercase tracking-[.35em]" style={{ letterSpacing: "0.35em" }}>
            CAST PROMOTION
          </h1>
          <div className="w-24"></div>
        </div>

        {/* Start Promo Campaign Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
            aria-expanded={showForm}
            aria-controls="promo-form"
          >
            <FiPlus size={20} />
            Start Promo Campaign
          </button>
        </div>

        {/* Animated Form */}
        <div
          id="promo-form"
          className={`overflow-hidden transition-all duration-500 ${showForm ? "max-h-[1000px] opacity-100 mb-8" : "max-h-0 opacity-0 mb-0"}`}
        >
          <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Create New Promotion</h2>
            
            <div className="space-y-6">
              {/* Cast URL */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Cast URL
                </label>
                <input
                  type="text"
                  value={castUrl}
                  onChange={(e) => setCastUrl(e.target.value)}
                  placeholder="Enter cast URL"
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Reward per Share */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Reward per Share
                </label>
                <select
                  value={rewardPerShare}
                  onChange={(e) => setRewardPerShare(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={500}>500 $CHESS</option>
                  <option value={1000}>1,000 $CHESS</option>
                  <option value={2000}>2,000 $CHESS</option>
                  <option value={5000}>5,000 $CHESS</option>
                  <option value={10000}>10,000 $CHESS</option>
                </select>
              </div>

              {/* Share Text */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Share Text (Optional)
                </label>
                <textarea
                  value={shareText}
                  onChange={(e) => setShareText(e.target.value)}
                  placeholder="Add your default share message"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty for cast only</p>
              </div>

              {/* Campaign Budget */}
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Campaign Budget
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[10000, 100000, 1000000, 5000000].map((budget) => (
                    <button
                      key={budget}
                      onClick={() => setCampaignBudget(budget)}
                      className={`px-4 py-3 rounded-lg font-medium transition ${
                        campaignBudget === budget
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {budget >= 1000000 ? `${budget / 1000000}M` : budget >= 1000 ? `${budget / 1000}K` : budget} $CHESS
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleCreateCampaign}
                disabled={isCreating || !castUrl.trim()}
                className="w-full px-8 py-4 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isCreating ? "Creating..." : "Start Campaign"}
              </button>
            </div>
          </div>
        </div>

        {/* Active Promotions List */}
        <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
          <h2 className="text-xl font-bold text-white mb-6">Active Promotions</h2>
          
          <div className="space-y-4">
            {sortedPromoCasts.map((promo) => (
              <div key={promo.id} className="bg-[#181c23] rounded-xl p-4 border border-[#2e3650]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {promo.author.pfpUrl && (
                      <Image src={promo.author.pfpUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <div className="font-semibold text-white">@{promo.author.username}</div>
                      <div className="text-sm text-gray-400">{promo.author.displayName}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    promo.status === 'active' ? 'bg-green-600 text-white' :
                    promo.status === 'paused' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {promo.status}
                  </div>
                </div>
                
                <div className="text-sm text-gray-300 mb-3 truncate">
                  {promo.castUrl}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FiShare2 className="text-purple-400" />
                    <span className="text-white">{promo.sharesCount} shares</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiDollarSign className="text-green-400" />
                    <span className="text-white">{promo.rewardPerShare} $CHESS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers className="text-blue-400" />
                    <span className="text-white">{promo.remainingBudget} remaining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-yellow-400" />
                    <span className="text-white">{Math.round((promo.sharesCount / (promo.totalBudget / promo.rewardPerShare)) * 100)}%</span>
                  </div>
                </div>
                
                {promo.shareText && (
                  <div className="mt-3 p-2 bg-gray-800 rounded text-sm text-gray-300">
                    &ldquo;{promo.shareText}&rdquo;
                  </div>
                )}
              </div>
            ))}
            
            {sortedPromoCasts.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No active promotions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}