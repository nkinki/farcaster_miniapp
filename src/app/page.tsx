'use client'

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk';
// import Image from 'next/image'; // removed unused import
// import { MiniappUserProfile } from '../components/MiniappUserProfile'; // REMOVE old stat block

// Define types for miniapp data
interface Miniapp {
  rank: number
  name: string
  domain: string
  description: string
  author: {
    fid: number;
    username: string
    displayName: string
    followerCount: number
  }
  category: string
  rank72hChange: number
  rank24hChange?: number
  rankWeeklyChange?: number
  rank30dChange?: number // <-- add this
  iconUrl: string
  homeUrl: string
  rankScore?: number; // Added for new list style
  points?: number; // Added for new list style
}

export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'games' | 'social' | 'utility' | 'finance' | 'analytics'>('all')
  // Only fetch user FID
  const [userFid, setUserFid] = useState<number | null>(null);
  const DEMO_FID = 977233; // Polling Center author FID for demo

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('farcaster-favorites')
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    // Fetch miniapp data - use current domain (updated for Vercel deployment)
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/api/miniapps?limit=246`
      : '/api/miniapps?limit=246'
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        console.log('API response:', data) // Debug log
        setMiniapps(data.miniapps || [])
        setLastUpdate(new Date().toLocaleTimeString('en-US'))
        setLoading(false)
      })
      .catch(error => {
        console.error('Error fetching data:', error)
        setLoading(false)
      })

    // Get user FID for highlighting own miniapp
    const getFid = async () => {
      try {
        const isInMiniapp = await sdk.isInMiniApp();
        if (isInMiniapp) {
          const context = await sdk.context;
          setUserFid(context.user?.fid || null);
        }
      } catch {}
    };
    getFid();
  }, []);

  // Call sdk.actions.ready() when loading is finished
  useEffect(() => {
    if (!loading) {
      sdk.actions.ready();
    }
  }, [loading]);

  const toggleFavorite = (miniappId: string) => {
    const newFavorites = favorites.includes(miniappId)
      ? favorites.filter(id => id !== miniappId)
      : [...favorites, miniappId]
    
    setFavorites(newFavorites)
    localStorage.setItem('farcaster-favorites', JSON.stringify(newFavorites))
  }

  // Filter logic - by category instead of time
  const filteredMiniapps = miniapps.filter(app => {
    if (filter === 'all') return true;
    return app.category.toLowerCase() === filter.toLowerCase();
  });

  // Favorited apps first
  const sortedMiniapps = [
    ...filteredMiniapps.filter(app => favorites.includes(app.domain)),
    ...filteredMiniapps.filter(app => !favorites.includes(app.domain)),
  ];

  // Find user's own miniapp in the list
  let ownMiniapp: Miniapp | null = null;
  let restMiniapps = sortedMiniapps;
  if (userFid) {
    console.log('Logged in user FID:', userFid);
    console.log('First 5 miniapp author.fid:', sortedMiniapps.slice(0, 5).map(app => app.author && app.author.fid));
    let idx = sortedMiniapps.findIndex(app => app.author && app.author.fid === userFid);
    if (idx === -1 && typeof window !== 'undefined') {
      // Fallback: try username match
      const username = window.localStorage.getItem('farcaster-username') || '';
      idx = sortedMiniapps.findIndex(app => app.author && app.author.username === username);
    }
    if (idx !== -1) {
      ownMiniapp = sortedMiniapps[idx];
      restMiniapps = [...sortedMiniapps.slice(0, idx), ...sortedMiniapps.slice(idx + 1)];
    }
  }

  // Find all miniapps for this user (use demo FID if userFid is null)
  const effectiveFid = userFid || DEMO_FID;
  let ownMiniapps = effectiveFid ? sortedMiniapps.filter(app => app.author && app.author.fid === effectiveFid) : [];
  // If no FID match, try username match
  if (ownMiniapps.length === 0 && userFid) {
    const username = typeof window !== 'undefined' ? window.localStorage.getItem('farcaster-username') || '' : '';
    if (username) {
      ownMiniapps = sortedMiniapps.filter(app => app.author && app.author.username === username);
      if (ownMiniapps.length > 0) {
        console.log('Matched own miniapp by username:', username);
      }
    }
  }

  // Debug: log miniapps sample and effectiveFid
  useEffect(() => {
    if (miniapps.length > 0) {
      console.log('Full miniapps array:', miniapps);
      console.log('Miniapps sample:', miniapps.slice(0, 5));
    }
  }, [miniapps]);
  useEffect(() => {
    if (userFid !== null) {
      console.log('Effective FID:', effectiveFid);
    }
  }, [userFid]);
  useEffect(() => {
    if (ownMiniapps.length > 0) {
      console.log('Own miniapps found:', ownMiniapps);
    } else {
      console.log('No own miniapps found for FID:', effectiveFid);
    }
  }, [ownMiniapps, effectiveFid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="flex justify-center items-center mb-2">
            <span className="inline-block bg-black/40 border-2 border-cyan-300 rounded-lg shadow-[0_0_16px_2px_rgba(34,211,238,0.3)] px-4 py-2">
              <span className="text-2xl font-bold text-white uppercase tracking-[.35em]" style={{letterSpacing: '0.35em', fontWeight: 700, fontFamily: 'inherit'}}>A&nbsp;P&nbsp;P&nbsp;R&nbsp;A&nbsp;N&nbsp;K</span>
            </span>
          </div>
          <p className="text-purple-200 text-sm mb-1 font-medium">Farcaster miniapp toplist and statistics</p>
          <p className="text-purple-200 text-xs font-medium">{new Date().toLocaleDateString('en-US')} Updated: {lastUpdate}</p>
        </div>

        {/* Own miniapp card(s) at the top if exists, highlighted */}
        {ownMiniapps.map((app, idx) => (
          <div key={app.domain + '-highlighted'} className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#23283a]/80 border-2 border-green-400 shadow-lg mb-2`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base mr-2 bg-gray-700 text-white`}>{app.rank}</div>
            {app.iconUrl ? (
              <img
                src={app.iconUrl}
                alt={app.name + ' logo'}
                className="w-8 h-8 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{app.name}</div>
              <div className="text-[10px] text-purple-300 truncate">@{app.author.username}</div>
              <div className="text-[10px] text-cyan-300 flex items-center gap-1 mt-0.5">
                <span className="text-xs">👥</span>
                <span>{app.author.followerCount}</span>
              </div>
            </div>
            {/* NO Favorite button here! */}
            <div className="flex flex-col items-end ml-2 min-w-[60px] gap-0.5">
              <div className="flex gap-1 items-center">
                <span className={`font-semibold text-xs ${
                  (app.rank24hChange || 0) > 0 ? 'text-green-400' : (app.rank24hChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                }`}>
                  {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0}
                </span>
                <span className="text-[10px] text-purple-400">24h</span>
              </div>
              <div className="flex gap-1 items-center">
                <span className={`font-semibold text-xs ${
                  app.rank72hChange > 0 ? 'text-green-400' : app.rank72hChange < 0 ? 'text-red-400' : 'text-purple-300'
                }`}>
                  {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                </span>
                <span className="text-[10px] text-purple-400">72h</span>
              </div>
              <div className="flex gap-1 items-center">
                <span className={`font-semibold text-xs ${
                  (app.rankWeeklyChange || 0) > 0 ? 'text-green-400' : (app.rankWeeklyChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                }`}>
                  {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0}
                </span>
                <span className="text-[10px] text-purple-400">7d</span>
              </div>
            </div>
          </div>
        ))}

        {/* Main Ranking List - Modern List Style */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl shadow-2xl p-2 border border-purple-500/30">
          <div className="flex flex-col gap-2">
            {sortedMiniapps.map((app: Miniapp, idx: number) => {
              // Highlight top 50
              const highlight = idx < 50 ? 'bg-[#23283a]/80' : 'bg-[#181c23]';
              return (
                <>
                  {idx === 50 && (
                    <div className="flex items-center my-2">
                      <div className="flex-1 h-px bg-cyan-400/60" />
                      <span className="mx-3 text-xs text-cyan-300 font-bold tracking-widest uppercase">Top 50 Reward Cutoff</span>
                      <div className="flex-1 h-px bg-cyan-400/60" />
                    </div>
                  )}
                  {idx === 100 && (
                    <div className="flex items-center my-2">
                      <div className="flex-1 h-px bg-cyan-400/60" />
                    </div>
                  )}
                  <div key={app.rank} className={`flex items-center justify-between rounded-xl px-3 py-2 ${highlight} border border-[#23283a] shadow-sm ${favorites.includes(app.domain) ? 'ring-2 ring-pink-400' : ''}`}> 
                    {/* Category position counter (only for category filter) */}
                    {filter !== 'all' && (
                      <span className="text-xs text-gray-400 font-bold mr-2" style={{minWidth: '16px', textAlign: 'right'}}>{idx + 1}</span>
                    )}
                    {/* Rank badge - always default style */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base mr-2 bg-gray-700 text-white`}>{app.rank}</div>
                    {/* App logo */}
                    {app.iconUrl ? (
                      <img
                        src={app.iconUrl}
                        alt={app.name + ' logo'}
                        className="w-8 h-8 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* App info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">{app.name}</div>
                      <div className="text-[10px] text-purple-300 truncate">@{app.author.username}</div>
                      <div className="text-[10px] text-cyan-300 flex items-center gap-1 mt-0.5">
                        <span className="text-xs">👥</span>
                        <span>{app.author.followerCount}</span>
                      </div>
                    </div>
                    {/* Favorite button - moved next to app info */}
                    <button
                      onClick={() => toggleFavorite(app.domain)}
                      className={`w-7 h-8 rounded-full flex items-center justify-center transition-all duration-300 ml-2 ${favorites.includes(app.domain)
                        ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]'
                        : 'bg-gray-800 text-gray-400 hover:bg-pink-900/50 hover:text-pink-400 border border-gray-700'}`}
                      title={favorites.includes(app.domain) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.includes(app.domain) ? '❤️' : '🤍'}
                    </button>
                    {/* Rank changes mini-table - moved to far right */}
                    <div className="flex flex-col items-end ml-2 min-w-[60px] gap-0.5">
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          (app.rank24hChange || 0) > 0 ? 'text-green-400' : (app.rank24hChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {(app.rank24hChange || 0) > 0 ? '+' : ''}{app.rank24hChange || 0}
                        </span>
                        <span className="text-[10px] text-purple-400">24h</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          app.rank72hChange > 0 ? 'text-green-400' : app.rank72hChange < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {app.rank72hChange > 0 ? '+' : ''}{app.rank72hChange}
                        </span>
                        <span className="text-[10px] text-purple-400">72h</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className={`font-semibold text-xs ${
                          (app.rankWeeklyChange || 0) > 0 ? 'text-green-400' : (app.rankWeeklyChange || 0) < 0 ? 'text-red-400' : 'text-purple-300'
                        }`}>
                          {(app.rankWeeklyChange || 0) > 0 ? '+' : ''}{app.rankWeeklyChange || 0}
                        </span>
                        <span className="text-[10px] text-purple-400">7d</span>
                      </div>
                    </div>
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
      {/* Bottom Navigation Bar - Category Filters */}
      <div className="fixed bottom-0 left-0 w-full z-50 flex justify-center items-stretch py-2 px-1 bg-transparent">
        <div className="flex flex-row items-stretch w-full max-w-4xl bg-gray-900/95 backdrop-blur-md shadow-2xl border border-gray-700 rounded-lg overflow-x-auto scrollbar-hide whitespace-nowrap">
          <button
            className={`px-2 py-8 font-semibold text-xs min-w-fit whitespace-nowrap transition-all duration-200 text-gray-300 ${filter === 'all' ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-gray-800 hover:text-white'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-2 py-8 font-semibold text-xs min-w-fit whitespace-nowrap border-l border-gray-700 transition-all duration-200 text-gray-300 ${filter === 'games' ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-gray-800 hover:text-white'}`}
            onClick={() => setFilter('games')}
          >
            Games
          </button>
          <button
            className={`px-2 py-8 font-semibold text-xs min-w-fit whitespace-nowrap border-l border-gray-700 transition-all duration-200 text-gray-300 ${filter === 'social' ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-gray-800 hover:text-white'}`}
            onClick={() => setFilter('social')}
          >
            Social
          </button>
          <button
            className={`px-2 py-8 font-semibold text-xs min-w-fit whitespace-nowrap border-l border-gray-700 transition-all duration-200 text-gray-300 ${filter === 'utility' ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-gray-800 hover:text-white'}`}
            onClick={() => setFilter('utility')}
          >
            Utility
          </button>
          <button
            className={`px-2 py-8 font-semibold text-xs min-w-fit whitespace-nowrap border-l border-gray-700 transition-all duration-200 text-gray-300 ${filter === 'finance' ? 'bg-blue-600 text-white shadow-inner' : 'hover:bg-gray-800 hover:text-white'}`}
            onClick={() => setFilter('finance')}
          >
            Finance
          </button>
          <a
            href="https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col justify-center items-center px-2 py-2 min-w-[70px] border-l border-gray-700 text-gray-300 text-[10px] leading-tight font-semibold hover:bg-gray-800 hover:text-white transition-all duration-200 whitespace-nowrap"
            style={{lineHeight: '1.1'}}
          >
            <span>Play CHESS</span>
            <span className="text-[9px]">Claim 10k $CHESS</span>
          </a>
        </div>
      </div>
    </div>
  )
}
