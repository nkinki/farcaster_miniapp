"use client"

import { useState, useEffect } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { FiSearch } from "react-icons/fi"
import type React from "react"

// Define types for miniapp data
interface Miniapp {
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
  rank72hChange: number
  rank24hChange?: number
  rankWeeklyChange?: number
  rank30dChange?: number // <-- add this
  iconUrl: string
  homeUrl: string
  rankScore?: number // Added for new list style
  points?: number // Added for new list style
}

export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [snapshotDate, setSnapshotDate] = useState<string>("")
  const [filter, setFilter] = useState<"all" | "games" | "social" | "utility" | "finance" | "analytics">("all")
  // Only fetch user FID
  const [userFid, setUserFid] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const DEMO_FID = 977233 // Polling Center author FID for demo
  const [showFavoriteModal, setShowFavoriteModal] = useState(false)
  const [openMiniappIdx, setOpenMiniappIdx] = useState<number | null>(null)

  useEffect(() => {
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("farcaster-favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    // Fetch miniapp data - use current domain (updated for Vercel deployment)
    const apiUrl =
      typeof window !== "undefined" ? `${window.location.origin}/api/miniapps?limit=246` : "/api/miniapps?limit=246"

    fetch(apiUrl)
      .then((res) => res.json())
      .then((data) => {
        console.log("API response:", data) // Debug log
        setMiniapps(data.miniapps || [])
        setLastUpdate(new Date().toLocaleTimeString("en-US"))
        // Try to get snapshot date from the top_miniapps.json file
        if (typeof window !== "undefined") {
          fetch("/data/top_miniapps.json")
            .then((res) => res.json())
            .then((json) => {
              if (json && json.snapshotDate) {
                setSnapshotDate(json.snapshotDate)
              } else {
                setSnapshotDate("")
              }
            })
            .catch(() => setSnapshotDate(""))
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error("Error fetching data:", error)
        setLoading(false)
      })

    // Get user FID for highlighting own miniapp
    const getFid = async () => {
      try {
        const isInMiniapp = await sdk.isInMiniApp()
        if (isInMiniapp) {
          const context = await sdk.context
          setUserFid(context.user?.fid || null)
        }
      } catch {}
    }
    getFid()

    // Modal: ha nincs kedvencek között az app (domain alapján), jelenjen meg
    // (Itt a fő app domain-t kellene vizsgálni, pl. window.location.hostname)
    if (typeof window !== "undefined") {
      const appDomain = window.location.hostname
      const savedFavorites = localStorage.getItem("farcaster-favorites")
      const favs: string[] = savedFavorites ? JSON.parse(savedFavorites) : []
      if (!favs.includes(appDomain)) {
        setShowFavoriteModal(true)
      }
    }
  }, [])

  // Call sdk.actions.ready() when loading is finished
  useEffect(() => {
    if (!loading) {
      sdk.actions.ready()
    }
  }, [loading])

  const toggleFavorite = (miniappId: string) => {
    const newFavorites = favorites.includes(miniappId)
      ? favorites.filter((id) => id !== miniappId)
      : [...favorites, miniappId]

    setFavorites(newFavorites)
    localStorage.setItem("farcaster-favorites", JSON.stringify(newFavorites))
  }

  // Filter logic - by category and search
  const filteredMiniapps = miniapps.filter((app) => {
    const matchesCategory = filter === "all" || app.category.toLowerCase() === filter.toLowerCase()
    const matchesSearch =
      search.trim() === "" ||
      app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      app.author.username.toLowerCase().includes(search.trim().toLowerCase()) ||
      app.author.displayName.toLowerCase().includes(search.trim().toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Favorited apps first
  const sortedMiniapps = [
    ...filteredMiniapps.filter((app) => favorites.includes(app.domain)),
    ...filteredMiniapps.filter((app) => !favorites.includes(app.domain)),
  ]

  // Find user's own miniapp in the list
  let ownMiniapp: Miniapp | null = null
  let restMiniapps = sortedMiniapps
  if (userFid) {
    console.log("Logged in user FID:", userFid)
    console.log(
      "First 5 miniapp author.fid:",
      sortedMiniapps.slice(0, 5).map((app) => app.author && app.author.fid),
    )
    let idx = sortedMiniapps.findIndex((app) => app.author && app.author.fid === userFid)
    if (idx === -1 && typeof window !== "undefined") {
      // Fallback: try username match
      const username = window.localStorage.getItem("farcaster-username") || ""
      idx = sortedMiniapps.findIndex((app) => app.author && app.author.username === username)
    }
    if (idx !== -1) {
      ownMiniapp = sortedMiniapps[idx]
      restMiniapps = [...sortedMiniapps.slice(0, idx), ...sortedMiniapps.slice(idx + 1)]
    }
  }

  // Find all miniapps for this user (use demo FID if userFid is null)
  const effectiveFid = userFid || DEMO_FID
  let ownMiniapps = effectiveFid ? sortedMiniapps.filter((app) => app.author && app.author.fid === effectiveFid) : []
  // If no FID match, try username match
  if (ownMiniapps.length === 0 && userFid) {
    const username = typeof window !== "undefined" ? window.localStorage.getItem("farcaster-username") || "" : ""
    if (username) {
      ownMiniapps = sortedMiniapps.filter((app) => app.author && app.author.username === username)
      if (ownMiniapps.length > 0) {
        console.log("Matched own miniapp by username:", username)
      }
    }
  }

  // Debug: log miniapps sample and effectiveFid
  useEffect(() => {
    if (miniapps.length > 0) {
      console.log("Full miniapps array:", miniapps)
      console.log("Miniapps sample:", miniapps.slice(0, 5))
    }
  }, [miniapps])
  useEffect(() => {
    if (userFid !== null) {
      console.log("Effective FID:", effectiveFid)
    }
  }, [userFid])
  useEffect(() => {
    if (ownMiniapps.length > 0) {
      console.log("Own miniapps found:", ownMiniapps)
    } else {
      console.log("No own miniapps found for FID:", effectiveFid)
    }
  }, [ownMiniapps, effectiveFid])

  // --- CATEGORY/ALL VIEW ROWS LOGIC ---
  let categoryViewRows: React.ReactNode[] = []
  let allViewRows: React.ReactNode[] = []
  if (filter !== "all") {
    const categoryMiniapps = miniapps
      .filter((app) => app.category.toLowerCase() === filter.toLowerCase())
      .filter(
        (app) =>
          app.name.toLowerCase().includes(search.toLowerCase()) ||
          app.domain.toLowerCase().includes(search.toLowerCase()),
      )
    const favoriteMiniapps = categoryMiniapps.filter((app) => favorites.includes(app.domain))
    const nonFavoriteMiniapps = categoryMiniapps.filter((app) => !favorites.includes(app.domain))
    categoryViewRows = [
      ...favoriteMiniapps.map((app) => {
        const idx = categoryMiniapps.findIndex((a) => a.domain === app.domain)
        return (
          <div
            key={app.domain + "-favtop"}
            className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#181c23] border-2 border-blue-400 shadow-sm ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]`}
          >
            <div className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg bg-gray-700 text-white mr-2">
              {idx + 1}
            </div>
            {app.iconUrl ? (
              <img
                src={app.iconUrl || "/placeholder.svg"}
                alt={app.name + " logo"}
                className="w-14 h-14 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-white truncate" style={{ fontSize: "1.15em" }}>
                {app.name}
              </div>
              <div className="text-sm" style={{ color: "#a259ff", fontSize: "1.15em" }}>
                @{app.author.username}
              </div>
              <div
                className="text-sm"
                style={{
                  color: "#b0b8d1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  marginTop: "0.125rem",
                  fontSize: "1.15em",
                }}
              >
                <span className="text-sm">👥</span>
                <span>{app.author.followerCount}</span>
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent text-blue-400`}
              title={"Remove from favorites"}
              style={{ fontSize: "1.35em", boxShadow: "none", background: "none", border: "none" }}
            >
              {"❤️"}
            </button>
            <RankChanges app={app} />
          </div>
        )
      }),
      // Main list: only non-favorites, but keep original sorszám (idx+1)
      ...categoryMiniapps.map((app, idx) => {
        if (favorites.includes(app.domain)) {
          return null
        }
        return (
          <div
            key={app.domain}
            className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#181c23] border border-[#2e3650] shadow-sm`}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg bg-gray-700 text-white mr-2">
              {idx + 1}
            </div>
            {app.iconUrl ? (
              <img
                src={app.iconUrl || "/placeholder.svg"}
                alt={app.name + " logo"}
                className="w-14 h-14 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-white truncate" style={{ fontSize: "1.15em" }}>
                {app.name}
              </div>
              <div className="text-sm" style={{ color: "#a259ff", fontSize: "1.15em" }}>
                @{app.author.username}
              </div>
              <div
                className="text-sm"
                style={{
                  color: "#b0b8d1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  marginTop: "0.125rem",
                  fontSize: "1.15em",
                }}
              >
                <span className="text-sm">👥</span>
                <span>{app.author.followerCount}</span>
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent text-gray-400`}
              title={"Add to favorites"}
              style={{ fontSize: "1.35em", boxShadow: "none", background: "none", border: "none" }}
            >
              {"🤍"}
            </button>
            <RankChanges app={app} />
          </div>
        )
      }),
    ]
  } else {
    allViewRows = sortedMiniapps.map((app: Miniapp, idx: number) => {
      const highlight = idx < 50 ? "bg-[#181c23]" : "bg-[#23283a]/80"
      return (
        <>
          {idx === 50 && (
            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-cyan-400/60" />
              <span className="mx-3 text-xs text-cyan-300 font-bold tracking-widest uppercase">
                Top 50 Reward Cutoff
              </span>
              <div className="flex-1 h-px bg-cyan-400/60" />
            </div>
          )}
          {idx === 100 && (
            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-cyan-400/60" />
            </div>
          )}
          <div
            key={app.rank}
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${highlight} border border-[#23283a] shadow-sm ${favorites.includes(app.domain) ? "border-2 border-blue-400 ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]" : ""}`}
            onClick={() => setOpenMiniappIdx(idx)}
          >
            <div
              className={`flex-shrink-0 ${favorites.includes(app.domain) ? "w-14 h-14" : "w-8 h-8"} rounded-full flex items-center justify-center font-bold text-lg bg-gray-700 text-white mr-2`}
            >
              {app.rank}
            </div>
            {app.iconUrl ? (
              <img
                src={app.iconUrl || "/placeholder.svg"}
                alt={app.name + " logo"}
                className="w-14 h-14 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              <div className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl bg-purple-700/60 text-white border border-purple-700/30 mr-2">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-white truncate" style={{ fontSize: "1.15em" }}>
                {app.name}
              </div>
              <div className="text-sm" style={{ color: "#a259ff", fontSize: "1.15em" }}>
                @{app.author.username}
              </div>
              <div
                className="text-sm"
                style={{
                  color: "#b0b8d1",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  marginTop: "0.125rem",
                  fontSize: "1.15em",
                }}
              >
                <span className="text-sm">👥</span>
                <span>{app.author.followerCount}</span>
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(app.domain)}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-2 bg-transparent ${favorites.includes(app.domain) ? "text-blue-400" : "text-gray-400"}`}
              title={favorites.includes(app.domain) ? "Remove from favorites" : "Add to favorites"}
              style={{ fontSize: "1.35em", boxShadow: "none", background: "none", border: "none" }}
            >
              {favorites.includes(app.domain) ? "❤️" : "🤍"}
            </button>
            <RankChanges app={app} />
          </div>
        </>
      )
    })
  }

  // Helper: rank changes mini-table
  function RankChanges({ app }: { app: Miniapp }) {
    return (
      <div className="flex flex-col items-end ml-2 min-w-[60px] gap-0.5" style={{ fontSize: "1.15em" }}>
        <div className="flex gap-1 items-center">
          <span
            className={`font-semibold text-lg ${
              (app.rank24hChange || 0) > 0
                ? "text-green-400"
                : (app.rank24hChange || 0) < 0
                  ? "text-red-400"
                  : "text-purple-300"
            }`}
          >
            {(app.rank24hChange || 0) > 0 ? "+" : ""}
            {app.rank24hChange || 0}
          </span>
          <span className="text-sm text-purple-400">24h</span>
        </div>
        <div className="flex gap-1 items-center">
          <span
            className={`font-semibold text-lg ${
              app.rank72hChange > 0 ? "text-green-400" : app.rank72hChange < 0 ? "text-red-400" : "text-purple-300"
            }`}
          >
            {app.rank72hChange > 0 ? "+" : ""}
            {app.rank72hChange}
          </span>
          <span className="text-sm text-purple-400">72h</span>
        </div>
        <div className="flex gap-1 items-center">
          <span
            className={`font-semibold text-lg ${
              (app.rankWeeklyChange || 0) > 0
                ? "text-green-400"
                : (app.rankWeeklyChange || 0) < 0
                  ? "text-red-400"
                  : "text-purple-300"
            }`}
          >
            {(app.rankWeeklyChange || 0) > 0 ? "+" : ""}
            {app.rankWeeklyChange || 0}
          </span>
          <span className="text-sm text-purple-400">7d</span>
        </div>
        <div className="flex gap-1 items-center">
          <span
            className={`font-semibold text-lg ${
              (app.rank30dChange || 0) > 0
                ? "text-green-400"
                : (app.rank30dChange || 0) < 0
                  ? "text-red-400"
                  : "text-purple-300"
            }`}
          >
            {(app.rank30dChange || 0) > 0 ? "+" : ""}
            {app.rank30dChange || 0}
          </span>
          <span className="text-sm text-purple-400">30d</span>
        </div>
      </div>
    )
  }

  // Modal komponens
  function FavoriteModal({ onAdd, onClose }: { onAdd: () => void; onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-[#23283a] rounded-xl shadow-lg p-6 max-w-xs w-full flex flex-col items-center">
          <div className="text-lg font-bold text-cyan-300 mb-2">Add to Favorites?</div>
          <div className="text-sm text-purple-200 mb-4 text-center">
            Add this miniapp to your favorites for quick access in Farcaster.
          </div>
          <button
            className="bg-gradient-to-tr from-purple-700 via-purple-500 to-cyan-400 text-white font-bold px-4 py-2 rounded-lg shadow-md mb-2 w-full"
            onClick={onAdd}
          >
            Add to Favorites
          </button>
          <button className="text-xs text-gray-400 hover:text-white mt-1" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {showFavoriteModal && (
        <FavoriteModal
          onAdd={() => {
            // Add current domain to favorites
            const appDomain = typeof window !== "undefined" ? window.location.hostname : ""
            const savedFavorites = localStorage.getItem("farcaster-favorites")
            const favs: string[] = savedFavorites ? JSON.parse(savedFavorites) : []
            if (!favs.includes(appDomain)) {
              favs.push(appDomain)
              localStorage.setItem("farcaster-favorites", JSON.stringify(favs))
            }
            setShowFavoriteModal(false)
          }}
          onClose={() => setShowFavoriteModal(false)}
        />
      )}
      {openMiniappIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#23283a] rounded-xl shadow-lg p-6 max-w-4xl w-full h-4/5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-bold text-cyan-300">{sortedMiniapps[openMiniappIdx].name}</div>
              <button className="text-xs text-gray-400 hover:text-white mt-1" onClick={() => setOpenMiniappIdx(null)}>
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://iframe.ly/${encodeURIComponent(sortedMiniapps[openMiniappIdx].homeUrl)}`}
                className="w-full h-full border-0"
                title={sortedMiniapps[openMiniappIdx].name}
              />
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="flex justify-center items-center mb-2">
              <span className="inline-block bg-black/40 border-2 border-cyan-300 rounded-lg shadow-[0_0_16px_2px_rgba(34,211,238,0.3)] px-4 py-2">
                <span
                  className="text-2xl font-bold text-white uppercase tracking-[.35em]"
                  style={{ letterSpacing: "0.35em", fontWeight: 700, fontFamily: "inherit" }}
                >
                  A&nbsp;P&nbsp;P&nbsp;R&nbsp;A&nbsp;N&nbsp;K
                </span>
              </span>
            </div>
            <p className="text-purple-200 text-sm mb-1 font-medium">Farcaster miniapp toplist and statistics</p>
            <p className="text-purple-200 text-xs font-medium">
              {snapshotDate && snapshotDate !== ""
                ? `Snapshot date: ${snapshotDate}`
                : `${new Date().toLocaleDateString("en-US")} Updated: ${lastUpdate}`}
            </p>
          </div>
          {/* Search bar directly above the list */}
          <div className="flex justify-end items-center max-w-2xl mx-auto mb-1 px-2">
            <form
              className="flex items-center gap-0"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés..."
                className="px-2 py-1 rounded-l bg-gray-900 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs placeholder-gray-400 min-w-[80px]"
                style={{ minWidth: 0, width: "110px" }}
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
            <div
              key={app.domain + "-highlighted"}
              className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#23283a]/80 border-2 border-green-400 shadow-lg mb-2`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-base mr-2 bg-gray-700 text-white`}
              >
                {app.rank}
              </div>
              {app.iconUrl ? (
                <img
                  src={app.iconUrl || "/placeholder.svg"}
                  alt={app.name + " logo"}
                  className="w-8 h-8 rounded-lg object-cover border border-purple-700/30 bg-white mr-2"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.display = "none"
                  }}
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
                  <span
                    className={`font-semibold text-base ${
                      (app.rank24hChange || 0) > 0
                        ? "text-green-400"
                        : (app.rank24hChange || 0) < 0
                          ? "text-red-400"
                          : "text-purple-300"
                    }`}
                  >
                    {(app.rank24hChange || 0) > 0 ? "+" : ""}
                    {app.rank24hChange || 0}
                  </span>
                  <span className="text-sm text-purple-400">24h</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span
                    className={`font-semibold text-base ${
                      app.rank72hChange > 0
                        ? "text-green-400"
                        : app.rank72hChange < 0
                          ? "text-red-400"
                          : "text-purple-300"
                    }`}
                  >
                    {app.rank72hChange > 0 ? "+" : ""}
                    {app.rank72hChange}
                  </span>
                  <span className="text-sm text-purple-400">72h</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span
                    className={`font-semibold text-base ${
                      (app.rankWeeklyChange || 0) > 0
                        ? "text-green-400"
                        : (app.rankWeeklyChange || 0) < 0
                          ? "text-red-400"
                          : "text-purple-300"
                    }`}
                  >
                    {(app.rankWeeklyChange || 0) > 0 ? "+" : ""}
                    {app.rankWeeklyChange || 0}
                  </span>
                  <span className="text-sm text-purple-400">7d</span>
                </div>
              </div>
            </div>
          ))}
          {/* Main Ranking List - Modern List Style */}
          <div className="relative">
            <div className="relative bg-[#23283a] rounded-2xl shadow-2xl p-2 border border-[#2e3650] z-10">
              <div className="flex flex-col gap-2">
                {/* CATEGORY VIEW: render favorites at top, then full category list with sorszám */}
                {filter !== "all" ? categoryViewRows : allViewRows}
              </div>
            </div>
          </div>
        </div>
        {/* Blocky, joined, high-contrast bottom nav bar */}
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#1a1a1a] border-t border-gray-700">
          <div className="flex w-full max-w-4xl mx-auto">
            <button
              className={`flex-1 py-8 text-center font-sans tracking-wide
          ${
            filter === "all"
              ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
              : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
          }
          focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
              onClick={() => setFilter("all")}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold">ALL</span>
              </div>
            </button>
            <button
              className={`flex-1 py-8 text-center font-sans tracking-wide
            ${
              filter === "games"
                ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
                : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
            }
          focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
              onClick={() => setFilter("games")}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold">GAMES</span>
              </div>
            </button>
            <button
              className={`flex-1 py-8 text-center font-sans tracking-wide
          ${
            filter === "social"
              ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
              : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
          }
          focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
              onClick={() => setFilter("social")}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold">SOCIAL</span>
              </div>
            </button>
            <button
              className={`flex-1 py-8 text-center font-sans tracking-wide
          ${
            filter === "utility"
              ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
              : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
          }
          focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
              onClick={() => setFilter("utility")}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold">UTILITY</span>
              </div>
            </button>
            <button
              className={`flex-1 py-8 text-center font-sans tracking-wide
          ${
            filter === "finance"
              ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]"
              : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"
          }
          focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
              onClick={() => setFilter("finance")}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold">FINANCE</span>
              </div>
            </button>
            {/* CHESS button - most prominent with intense neon glow */}
            <button
              onClick={() => sdk.actions.openUrl("https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess")}
              className={`flex-1 py-8 text-center font-sans tracking-wide
bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800
focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase`}
              style={{
                borderRadius: 0,
                fontFamily: "Geist, Inter, Arial, sans-serif",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <span
                  className="text-[12px] font-bold animate-chessglow"
                  style={{
                    color: "#5D6AFF",
                    textShadow: "0 0 2px #5D6AFF, 0 0 4px #5D6AFF",
                    filter: "brightness(1.1) drop-shadow(0 0 1px #5D6AFF)",
                  }}
                >
                  CHESS
                </span>
              </div>
            </button>
          </div>
        </nav>
      </div>
      <style jsx global>{`
@keyframes chessglow {
  0%, 100% {
    color: #5D6AFF;
    text-shadow: 0 0 2px #5D6AFF, 0 0 4px #5D6AFF;
    filter: brightness(1.1) drop-shadow(0 0 1px #5D6AFF);
    transform: scale(1);
  }
  50% {
    color: #00fff7;
    text-shadow: 0 0 3px #00fff7, 0 0 6px #00fff7;
    filter: brightness(1.15) drop-shadow(0 0 2px #00fff7);
    transform: scale(1.05);
  }
}
.animate-chessglow {
  animation: chessglow 4s ease-in-out infinite;
}
`}</style>
    </>
  )
}