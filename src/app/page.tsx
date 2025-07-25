"use client"

import { useState, useEffect, useMemo } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { FiSearch } from "react-icons/fi"
import type React from "react"

// Típusdefiníció a frontend számára
interface Miniapp {
  id: string // Hozzáadtam az ID-t a kulcshoz
  rank: number
  name: string
  domain: string
  description: string
  author: {
    fid: number
    username: string
    displayName: string
    followerCount: number
  }
  category: string
  rank24hChange: number
  rank72hChange: number
  rankWeeklyChange: number
  rank30dChange: number
  iconUrl: string
  homeUrl: string
}

// Komponens a rangsor változásainak megjelenítésére
function RankChanges({ app }: { app: Miniapp }) {
  const renderChange = (value: number, label: string) => {
    const change = value ?? 0;
    const colorClass = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-purple-300";
    const sign = change > 0 ? "+" : "";
    return (
      <div className="flex gap-1 items-center">
        <span className={`font-semibold text-lg ${colorClass}`}>{sign}{change}</span>
        <span className="text-sm text-purple-400">{label}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-end ml-2 min-w-[60px] gap-0.5" style={{ fontSize: "1.15em" }}>
      {renderChange(app.rank24hChange, "24h")}
      {renderChange(app.rank72hChange, "72h")}
      {renderChange(app.rankWeeklyChange, "7d")}
      {renderChange(app.rank30dChange, "30d")}
    </div>
  );
}

// Fő komponens
export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotDate, setSnapshotDate] = useState<string>("")
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const savedFavorites = localStorage.getItem("farcaster-favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    const apiUrl = `${window.location.origin}/api/miniapps?limit=300`;
    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        // Hozzáadjuk az ID-t minden elemhez a kulcshoz
        const appsWithId = data.miniapps.map((app: any) => ({ ...app, id: app.domain }));
        setMiniapps(appsWithId || [])
        setSnapshotDate(data.stats?.snapshotDate || new Date().toLocaleDateString("en-US"))
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error fetching data:", error)
        setLoading(false)
      })
  }, [])
  
  useEffect(() => {
    if (!loading) sdk.actions.ready()
  }, [loading])

  const toggleFavorite = (domain: string) => {
    const newFavorites = favorites.includes(domain)
      ? favorites.filter((id) => id !== domain)
      : [...favorites, domain]
    setFavorites(newFavorites)
    localStorage.setItem("farcaster-favorites", JSON.stringify(newFavorites))
  }

  const filteredAndSortedMiniapps = useMemo(() => {
    const filtered = miniapps.filter((app) => {
      const matchesCategory = filter === "all" || (app.category && app.category.toLowerCase() === filter.toLowerCase())
      const matchesSearch =
        search.trim() === "" ||
        app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        app.author.username.toLowerCase().includes(search.trim().toLowerCase()) ||
        app.author.displayName.toLowerCase().includes(search.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })

    // Különválogatjuk a kedvenceket és a többieket
    const favoriteApps = filtered.filter(app => favorites.includes(app.domain));
    const nonFavoriteApps = filtered.filter(app => !favorites.includes(app.domain));
    
    return [...favoriteApps, ...nonFavoriteApps];
  }, [miniapps, filter, search, favorites]);


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
        <header className="mb-6 text-center">
          <div className="flex justify-center items-center mb-2">
            <span className="inline-block bg-black/40 border-2 border-cyan-300 rounded-lg shadow-[0_0_16px_2px_rgba(34,211,238,0.3)] px-4 py-2">
              <h1 className="text-2xl font-bold text-white uppercase tracking-[.35em]" style={{ letterSpacing: "0.35em" }}>
                APPRANK
              </h1>
            </span>
          </div>
          <p className="text-purple-200 text-sm mb-1 font-medium">Farcaster miniapp toplist and statistics</p>
          <p className="text-purple-200 text-xs font-medium">
            {`Snapshot date: ${snapshotDate}`}
          </p>
        </header>

        {/* Search */}
        <div className="flex justify-end items-center max-w-2xl mx-auto mb-1 px-2">
          <form className="flex items-center" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="px-2 py-1 rounded-l bg-gray-900 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs w-[110px]"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded-r bg-gray-800 text-cyan-300 border-t border-b border-r border-gray-500 hover:bg-cyan-900"
              aria-label="Keresés"
            >
              <FiSearch size={14} />
            </button>
          </form>
        </div>
        
        {/* Main List */}
        <div className="relative bg-[#23283a] rounded-2xl shadow-2xl p-2 border border-[#2e3650]">
          <div className="flex flex-col gap-2">
            {filteredAndSortedMiniapps.map((app) => {
              const isFavorite = favorites.includes(app.domain);
              return (
                <div
                  // JAVÍTÁS: Egyedi és stabil kulcs használata
                  key={app.id} 
                  className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#181c23] shadow-sm cursor-pointer hover:ring-2 hover:ring-cyan-400 transition ${
                    isFavorite
                      ? "border-2 border-blue-400 ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]"
                      : "border border-[#2e3650]"
                  }`}
                  // onClick={() => { /* Itt lehetne megnyitni az iframe-et */ }}
                >
                  <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg bg-gray-700 text-white mr-2`}>
                    {app.rank}
                  </div>
                  {app.iconUrl ? (
                    <img
                      src={app.iconUrl}
                      alt={`${app.name} logo`}
                      className="w-14 h-14 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg text-white truncate">{app.name}</div>
                    <div className="text-sm text-[#a259ff]">@{app.author.username}</div>
                    <div className="text-sm text-[#b0b8d1] flex items-center gap-1 mt-0.5">
                      <span>👥</span>
                      <span>{app.author.followerCount}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(app.domain); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent"
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    style={{ fontSize: "1.35em", border: "none" }}
                  >
                    {isFavorite ? "❤️" : "🤍"}
                  </button>
                  <RankChanges app={app} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#1a1a1a] border-t border-gray-700">
          <div className="flex w-full max-w-4xl mx-auto">
            {["all", "games", "social", "utility", "finance"].map((category) => (
              <button
                key={category}
                className={`flex-1 py-8 text-center font-sans tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 ${
                  filter === category
                    ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
                    : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
                }`}
                style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
                onClick={() => setFilter(category)}
              >
                <span className="text-[10px] font-bold">{category}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}