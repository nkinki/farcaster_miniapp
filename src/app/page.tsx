'use client'

import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk';
import { FiSearch } from 'react-icons/fi';
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
  const [snapshotDate, setSnapshotDate] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'games' | 'social' | 'utility' | 'finance' | 'analytics'>('all')
  // Only fetch user FID
  const [userFid, setUserFid] = useState<number | null>(null);
  const [search, setSearch] = useState('');
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
        // Try to get snapshot date from the latest file in public/data
        if (typeof window !== 'undefined') {
          fetch('/data/')
            .then(res => res.text())
            .then(html => {
              // Parse directory listing for snapshot files
              const matches = Array.from(html.matchAll(/top_miniapps_(\d{4}-\d{2}-\d{2})\.json/g));
              if (matches.length > 0) {
                // Find the latest date
                const dates = matches.map(m => m[1]);
                const latest = dates.sort().reverse()[0];
                setSnapshotDate(latest);
              } else {
                setSnapshotDate('');
              }
            })
            .catch(() => setSnapshotDate(''));
        }
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

  // Filter logic - by category and search
  const filteredMiniapps = miniapps.filter(app => {
    const matchesCategory = filter === 'all' || app.category.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      search.trim() === '' ||
      app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      app.author.username.toLowerCase().includes(search.trim().toLowerCase()) ||
      app.author.displayName.toLowerCase().includes(search.trim().toLowerCase());
    return matchesCategory && matchesSearch;
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

  // --- CATEGORY/ALL VIEW ROWS LOGIC ---
  let categoryViewRows: React.ReactNode[] = [];
  let allViewRows: React.ReactNode[] = [];
  if (filter !== 'all') {
    const categoryMiniapps = miniapps
      .filter(app => app.category.toLowerCase() === filter.toLowerCase())
      .filter(app =>
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.domain.toLowerCase().includes(search.toLowerCase())
      );
    const favoriteMiniapps = categoryMiniapps.filter(app => favorites.includes(app.domain));
    const nonFavoriteMiniapps = categoryMiniapps.filter(app => !favorites.includes(app.domain));
    categoryViewRows = [
      ...((favoriteMiniapps.map(app => {
        const idx = categoryMiniapps.findIndex(a => a.domain === app.domain);
        return (
          <div key={app.domain + '-favtop'} className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#23283a]/80 border-2 border-blue-400 shadow-sm ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]`}>
            <span className="text-xs text-gray-400 font-bold mr-2" style={{minWidth: '16px', textAlign: 'right', fontSize: '1.15em'}}>{idx + 1}</span>
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
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent text-blue-400`}
              title={'Remove from favorites'}
              style={{fontSize: '1.35em', boxShadow: 'none', background: 'none', border: 'none'}}
            >
              {'❤️'}
            </button>
            <RankChanges app={app} />
          </div>
        );
      }))),
      // Main list: only non-favorites, but keep original sorszám (idx+1)
      ...categoryMiniapps.map((app, idx) => {
        if (favorites.includes(app.domain)) {
          return null;
        }
        return (
          <div key={app.domain} className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#23283a]/80 border border-[#23283a] shadow-sm`}>
            <span className="text-xs text-gray-400 font-bold mr-2" style={{minWidth: '16px', textAlign: 'right', fontSize: '1.15em'}}>{idx + 1}</span>
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
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent text-gray-400`}
              title={'Add to favorites'}
              style={{fontSize: '1.35em', boxShadow: 'none', background: 'none', border: 'none'}}
            >
              {'🤍'}
            </button>
            <RankChanges app={app} />
          </div>
        );
      })
    ];
  } else {
    allViewRows = sortedMiniapps.map((app: Miniapp, idx: number) => {
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
          <div key={app.rank} className={`flex items-center justify-between rounded-xl px-3 py-2 ${highlight} border border-[#23283a] shadow-sm ${favorites.includes(app.domain) ? 'border-2 border-blue-400 ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]' : ''}`}> 
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
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent ${favorites.includes(app.domain) ? 'text-blue-400' : 'text-gray-400'}`}
              title={favorites.includes(app.domain) ? 'Remove from favorites' : 'Add to favorites'}
              style={{fontSize: '1.35em', boxShadow: 'none', background: 'none', border: 'none'}}
            >
              {favorites.includes(app.domain) ? '❤️' : '🤍'}
            </button>
            <RankChanges app={app} />
          </div>
        </>
      );
    });
  }

  // Helper: rank changes mini-table
  function RankChanges({ app }: { app: Miniapp }) {
    return (
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
    );
  }

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
          <p className="text-purple-200 text-xs font-medium">
            {snapshotDate ? `Snapshot date: ${snapshotDate}` : `${new Date().toLocaleDateString('en-US')} Updated: ${lastUpdate}`}
          </p>
        </div>

        {/* Search bar directly above the list */}
        <div className="flex justify-end items-center max-w-2xl mx-auto mb-1 px-2">
          <form className="flex items-center gap-0" onSubmit={e => { e.preventDefault(); }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Keresés..."
              className="px-2 py-1 rounded-l bg-gray-900 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs placeholder-gray-400 min-w-[80px]"
              style={{ minWidth: 0, width: '110px' }}
            />
            <button
              type="submit"
              className="px-2 py-1 rounded-r bg-gray-800 text-cyan-300 border-t border-b border-r border-gray-500 hover:bg-cyan-900 transition-all duration-150 flex items-center justify-center"
              tabIndex={-1}
              aria-label="Keresés"
            >
              <FiSearch size={14} />
            </button>
          </form>
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
            {/* CATEGORY VIEW: render favorites at top, then full category list with sorszám */}
            {filter !== 'all' ? categoryViewRows : allViewRows}
          </div>
        </div>
      </div>
      {/* Blocky, joined, high-contrast bottom nav bar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 bg-black/95 shadow-2xl border-t-2 border-gray-800">
        <div className="flex w-full max-w-3xl mx-auto px-0 pb-0 pt-0">
          <button
            className={`flex-1 py-2 font-bold text-[0.72rem] border-t border-r border-gray-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ${filter === 'all' ? 'bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40' : 'bg-gray-900 text-gray-100 hover:bg-gray-800 hover:text-white'}`}
            style={{borderRadius: 0, letterSpacing: '0.01em'}}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`flex-1 py-2 font-bold text-[0.72rem] border-t border-r border-gray-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ${filter === 'games' ? 'bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40' : 'bg-gray-900 text-gray-100 hover:bg-gray-800 hover:text-white'}`}
            style={{borderRadius: 0, letterSpacing: '0.01em'}}
            onClick={() => setFilter('games')}
          >
            Games
          </button>
          <button
            className={`flex-1 py-2 font-bold text-[0.72rem] border-t border-r border-gray-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ${filter === 'social' ? 'bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40' : 'bg-gray-900 text-gray-100 hover:bg-gray-800 hover:text-white'}`}
            style={{borderRadius: 0, letterSpacing: '0.01em'}}
            onClick={() => setFilter('social')}
          >
            Social
          </button>
          <button
            className={`flex-1 py-2 font-bold text-[0.72rem] border-t border-r border-gray-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ${filter === 'utility' ? 'bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40' : 'bg-gray-900 text-gray-100 hover:bg-gray-800 hover:text-white'}`}
            style={{borderRadius: 0, letterSpacing: '0.01em'}}
            onClick={() => setFilter('utility')}
          >
            Utility
          </button>
          <button
            className={`flex-1 py-2 font-bold text-[0.72rem] border-t border-r border-gray-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400 ${filter === 'finance' ? 'bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40' : 'bg-gray-900 text-gray-100 hover:bg-gray-800 hover:text-white'}`}
            style={{borderRadius: 0, letterSpacing: '0.01em'}}
            onClick={() => setFilter('finance')}
          >
            Finance
          </button>
          <a
            href="https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 font-bold text-[0.65rem] focus:outline-none focus:ring-2 focus:ring-purple-400 bg-gradient-to-tl from-purple-700 via-purple-900 to-purple-800 text-white shadow-lg shadow-purple-700/40 flex flex-col items-center justify-center border-t border-r border-gray-400/60"
            style={{borderRadius: 0, minWidth: '108px', letterSpacing: '0.01em'}}
          >
            <span className="font-extrabold" style={{letterSpacing: '0.009em'}}>Play Chess</span>
            <span className="text-[0.6375rem] font-normal opacity-90" style={{letterSpacing: '0.09em'}}>Claim 10k $CHESS</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
