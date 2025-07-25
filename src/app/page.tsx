"use client"

import { useState, useEffect, useMemo } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { FiSearch } from "react-icons/fi"
import type React from "react"

// Típusok
interface Miniapp {
  id: string;
  rank: number;
  name: string;
  domain: string;
  description: string;
  author: {
    fid?: number;
    username: string;
    displayName: string;
    followerCount: number;
  };
  category: string;
  rank24hChange: number;
  rank72hChange: number;
  rankWeeklyChange: number;
  rank30dChange: number;
  iconUrl: string;
  homeUrl: string;
  avgRank: string | null;
  bestRank: number | null;
}

type MiniappFromApi = Omit<Miniapp, 'id'>;


// --- SUB-COMPONENTS for clarity ---

function RankChanges({ app }: { app: Miniapp }) {
  const renderChange = (value: number | null, label: string) => {
    const change = value ?? 0;
    const colorClass = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-purple-300";
    const sign = change > 0 ? "+" : "";
    return (
      <div className="flex gap-1 items-center justify-end w-full">
        <span className={`font-semibold text-lg ${colorClass} w-6 text-right`}>{sign}{change}</span>
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

function MiniappCard({ app, isFavorite, onOpen, onToggleFavorite }: { app: Miniapp; isFavorite: boolean; onOpen: () => void; onToggleFavorite: () => void; }) {
  const rankSizeClass = "w-8 h-8";
  const rankTextClass = "text-base";

  return (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2 bg-[#181c23] shadow-sm cursor-pointer hover:ring-2 hover:ring-cyan-400 transition ${ isFavorite ? "border-2 border-blue-400 ring-2 ring-blue-400/80 shadow-[0_0_12px_2px_rgba(0,200,255,0.5)]" : "border border-[#2e3650]" }`}
      onClick={onOpen}
    >
      <div className={`flex-shrink-0 ${rankSizeClass} rounded-full flex items-center justify-center font-bold ${rankTextClass} bg-gradient-to-br from-purple-500 to-cyan-500 text-white mr-2`}>{app.rank}</div>
      <img src={app.iconUrl} alt={`${app.name} logo`} className="w-14 h-14 rounded-lg object-cover border border-purple-700/30 bg-white mr-2" />
      
      {/* JAVÍTÁS: A statisztikák most már itt, egy függőleges blokkban jelennek meg */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-lg text-white truncate">{app.name}</div>
        <div className="flex flex-col items-start mt-1 space-y-1">
            <div className="text-sm text-[#a259ff]">@{app.author.username}</div>
            <div className="flex items-center gap-1.5 text-sm text-[#b0b8d1]">
                <span className="w-4 text-center">👥</span>
                <span>{app.author.followerCount} Followers</span>
            </div>
            {app.bestRank && (
                <div className="flex items-center gap-1.5 text-sm text-yellow-400 font-semibold" title={`Best rank: ${app.bestRank}`}>
                    <span className="w-4 text-center">🏆</span>
                    <span>Best: {app.bestRank}</span>
                </div>
            )}
            {app.avgRank && (
                <div className="flex items-center gap-1.5 text-sm text-blue-400 font-semibold" title={`Average rank: ${app.avgRank}`}>
                    <span className="w-4 text-center">~</span>
                    <span>Avg: {app.avgRank}</span>
                </div>
            )}
        </div>
      </div>
      
      <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }} className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-4 bg-transparent" title={isFavorite ? "Remove from favorites" : "Add to favorites"} style={{ fontSize: "1.35em", border: "none" }}>
        {isFavorite ? "❤️" : "🤍"}
      </button>
      <RankChanges app={app} />
    </div>
  );
}


// --- MAIN PAGE COMPONENT ---
export default function Home() {
  const [miniapps, setMiniapps] = useState<Miniapp[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotDate, setSnapshotDate] = useState<string>("")
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [openMiniapp, setOpenMiniapp] = useState<Miniapp | null>(null)

  useEffect(() => {
    const savedFavorites = localStorage.getItem("farcaster-favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    const apiUrl = `${window.location.origin}/api/miniapps?limit=300`;
    fetch(apiUrl, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        const appsWithId = data.miniapps.map((app: MiniappFromApi): Miniapp => ({ ...app, id: app.domain }))
        setMiniapps(appsWithId || [])
        setSnapshotDate(new Date().toLocaleDateString("en-US"))
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

  const { favoriteApps, nonFavoriteApps } = useMemo(() => {
    const filtered = miniapps.filter((app) => {
      const category = app.category || 'other';
      const matchesCategory = filter === "all" || category.toLowerCase() === filter.toLowerCase()
      const matchesSearch =
        search.trim() === "" ||
        app.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        (app.author?.username && app.author.username.toLowerCase().includes(search.trim().toLowerCase())) ||
        (app.author?.displayName && app.author.displayName.toLowerCase().includes(search.trim().toLowerCase()))
      return matchesCategory && matchesSearch
    });
    
    return filtered.reduce<{ favoriteApps: Miniapp[]; nonFavoriteApps: Miniapp[] }>(
        (acc, app) => {
            if (favorites.includes(app.domain)) {
                acc.favoriteApps.push(app);
            } else {
                acc.nonFavoriteApps.push(app);
            }
            return acc;
        },
        { favoriteApps: [], nonFavoriteApps: [] }
    );
  }, [miniapps, filter, search, favorites]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {openMiniapp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#23283a] rounded-xl shadow-lg p-6 max-w-4xl w-full h-4/5 flex flex-col">
            <div className="flex justify-between items-center mb-4 gap-2">
              <div className="text-lg font-bold text-cyan-300">{openMiniapp.name}</div>
              <button onClick={() => setOpenMiniapp(null)} className="px-3 py-1 rounded bg-red-600 text-white font-bold text-xs">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={openMiniapp.homeUrl} className="w-full h-full border-0" title={openMiniapp.name} />
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
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

          <div className="flex justify-end items-center max-w-2xl mx-auto mb-1 px-2">
            <form className="flex items-center" onSubmit={(e) => e.preventDefault()}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="px-2 py-1 rounded-l bg-gray-900 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-xs w-[110px]" />
              <button type="submit" className="px-2 py-1 rounded-r bg-gray-800 text-cyan-300 border-t border-b border-r border-gray-500 hover:bg-cyan-900" aria-label="Keresés">
                <FiSearch size={14} />
              </button>
            </form>
          </div>
          
          <div className="relative bg-[#23283a] rounded-2xl shadow-2xl p-2 border border-[#2e3650]">
            {favoriteApps.length > 0 && (
              <div className="sticky top-0 z-20 bg-[#23283a] py-2">
                <div className="flex flex-col gap-2">
                  {favoriteApps.map((app) => (
                    <MiniappCard
                      key={app.id}
                      app={app}
                      isFavorite={true}
                      onOpen={() => setOpenMiniapp(app)}
                      onToggleFavorite={() => toggleFavorite(app.domain)}
                    />
                  ))}
                </div>
                <div className="h-px bg-cyan-400/30 my-2"></div>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              {nonFavoriteApps.map((app) => (
                <MiniappCard
                  key={app.id}
                  app={app}
                  isFavorite={false}
                  onOpen={() => setOpenMiniapp(app)}
                  onToggleFavorite={() => toggleFavorite(app.domain)}
                />
              ))}
            </div>
          </div>
        </div>

        <nav className="fixed bottom-0 left-0 w-full z-50 bg-[#1a1a1a] border-t border-gray-700">
          <div className="flex w-full max-w-4xl mx-auto">
            {["all", "games", "social", "utility", "finance"].map((category) => (
              <button
                key={category}
                className={`flex-1 py-8 text-center font-sans tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 ${ filter === category ? "bg-gray-800 text-cyan-300 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.9),inset_-2px_-2px_5px_rgba(255,255,255,0.05)]" : "bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800"}`}
                style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
                onClick={() => setFilter(category)}
              >
                <span className="text-[10px] font-bold">{category}</span>
              </button>
            ))}
             <button
              onClick={() => sdk.actions.openUrl("https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess")}
              className="flex-1 py-8 text-center font-sans tracking-wide bg-gray-900 text-gray-400 shadow-[inset_1px_1px_3px_rgba(0,0,0,0.8),inset_-1px_-1px_3px_rgba(255,255,255,0.1)] hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-300 transition-all duration-300 uppercase"
              style={{ borderRadius: 0, fontFamily: "Geist, Inter, Arial, sans-serif" }}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold animate-chessneon">Claim $CHESS</span>
              </div>
            </button>
          </div>
        </nav>
      </div>
      <style jsx global>{`
        @keyframes chessneon {
          0% { color: #5D6AFF; text-shadow: 0 0 6px #5D6AFF, 0 0 12px #5D6AFF; }
          25% { color: #00fff7; text-shadow: 0 0 8px #00fff7, 0 0 16px #00fff7; }
          50% { color: #fff; text-shadow: 0 0 10px #fff, 0 0 20px #00fff7; }
          75% { color: #a259ff; text-shadow: 0 0 8px #a259ff, 0 0 16px #5D6AFF; }
          100% { color: #5D6AFF; text-shadow: 0 0 6px #5D6AFF, 0 0 12px #5D6AFF; }
        }
        .animate-chessneon { animation: chessneon 7s linear infinite; }
      `}</style>
    </>
  )
}