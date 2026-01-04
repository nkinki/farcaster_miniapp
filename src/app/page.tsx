"use client"

import { useState, useEffect, useMemo } from "react"
import { sdk } from "@farcaster/miniapp-sdk"
import { DIAMOND_VIP_ADDRESS, DIAMOND_VIP_ABI } from "@/abis/diamondVip"
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken"
import { toast } from "react-hot-toast"
import { useAccount, useReadContract, useWriteContract, useConnect, useDisconnect } from "wagmi"
import { parseUnits } from "viem"
import { useChessToken } from "@/hooks/useChessToken"
import { FiSearch, FiGrid, FiZap, FiUsers, FiSettings, FiDollarSign, FiGift, FiAward, FiShare2, FiExternalLink, FiClock, FiCheckSquare, FiKey } from "react-icons/fi"
import type { IconType } from "react-icons";
import React from "react"
import Image from "next/image"
import LamboLottery from "@/components/LamboLottery"
import WeatherLottoModal from "@/components/WeatherLottoModal"
import SeasonStatusBanner from "@/components/SeasonStatusBanner"
import DiamondCard from "@/components/DiamondCard"
import VipRedeemModal from "@/components/VipRedeemModal"
import SeasonModal from "@/components/SeasonModal"
import { useProfile } from '@farcaster/auth-kit';

const PRESALE_END_DATE = new Date('2026-01-10T23:59:59');

const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + Math.floor(distance / (1000 * 60 * 60 * 24)) * 24; // Total hours
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex justify-center gap-2 text-white font-mono font-bold text-xl">
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.hours).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">HOURS</span>
      </div>
      <div className="py-2 text-gray-500">:</div>
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.minutes).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">MINS</span>
      </div>
      <div className="py-2 text-gray-500">:</div>
      <div className="bg-black/50 p-2 rounded-lg min-w-[50px] text-center">
        {String(timeLeft.seconds).padStart(2, '0')}
        <span className="text-[8px] block font-sans font-normal text-gray-400 mt-1">SECS</span>
      </div>
    </div>
  );
};

// Types
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

// Define Icons
const categoryIcons: Record<string, IconType> = {
  all: FiGrid,
  games: FiZap,
  social: FiUsers,
  utility: FiCheckSquare,
  finance: FiKey,
  chess: FiGift
};

// --- SUB-COMPONENTS or clarity ---

function RankChanges({ app }: { app: Miniapp }) {
  const renderChange = (value: number | null, label: string) => {
    const change = value ?? 0;
    const colorClass = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-purple-300";
    const sign = change > 0 ? "+" : "";
    return (
      <div className="flex gap-3 items-center justify-end w-full">
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
      className={`glass-morphism flex items-center justify-between rounded-xl px-3 py-2 shadow-sm cursor-pointer hover:ring-2 hover:ring-cyan-400 transition ${isFavorite ? "border-2 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_15px_rgba(0,242,255,0.4)]" : "border border-white/10"}`}
      onClick={onOpen}
    >
      <div className={`flex-shrink-0 ${rankSizeClass} rounded-full flex items-center justify-center font-bold ${rankTextClass} bg-gradient-to-br from-cyan-400 to-purple-600 text-white mr-2`}>{app.rank}</div>
      <div className="w-14 h-14 rounded-lg border border-cyan-700/30 bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mr-2">
        <FiZap className="text-white text-xl" />
      </div>

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
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ml-4 bg-transparent hover:bg-gray-700/50 rounded-full"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        style={{ fontSize: "1.35em", border: "none" }}
      >
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
  const [openMiniappIndex, setOpenMiniappIndex] = useState<number | null>(null)
  const [hapticsSupported, setHapticsSupported] = useState(false)
  const [showLamboLottery, setShowLamboLottery] = useState(false)
  const [showWeatherLotto, setShowWeatherLotto] = useState(false)
  const [userFid, setUserFid] = useState<number>(0)
  const [seasonData, setSeasonData] = useState<any>(null)
  const [showMiniapps, setShowMiniapps] = useState(false)
  const [fetchingMiniapps, setFetchingMiniapps] = useState(false)

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  const { isAuthenticated, profile } = useProfile();

  const currentUser = useMemo(() => {
    if (isAuthenticated && profile) {
      return {
        fid: profile.fid || userFid || 0,
        username: profile.username || "user",
        displayName: profile.displayName || "Current User"
      };
    }
    return {
      fid: userFid || 0,
      username: "user",
      displayName: "Farcaster User"
    };
  }, [isAuthenticated, profile, userFid]);

  const [showVipModal, setShowVipModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);

  // Disabled auto-read to avoid DB/On-chain calls on start
  const { data: vipBalance } = useReadContract({
    address: DIAMOND_VIP_ADDRESS,
    abi: DIAMOND_VIP_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: false,
    }
  });

  const { writeContractAsync: writeMint, isPending: isMinting } = useWriteContract()
  const {
    balance: chessBalance,
    allowance: chessAllowance,
    needsApproval,
    approve: approveChess,
    isApproving,
    isApprovalConfirming,
    refetchAllowance: refetchChessAllowance,
  } = useChessToken()

  const isAlreadyVip = useMemo(() => {
    return vipBalance ? Number(vipBalance) > 0 : false
  }, [vipBalance])

  const handleMint = async () => {
    if (!address) {
      toast.error("Please connect your wallet first!")
      return
    }

    if ((DIAMOND_VIP_ADDRESS as string) === "0x0000000000000000000000000000000000000000") {
      toast.error("Diamond VIP Contract not deployed yet! Please update the contract address.")
      return
    }

    try {
      const price = parseUnits("5000000", 18) // Presale price

      if (!chessBalance || chessBalance < price) {
        toast.error("Insufficient $CHESS balance! You need 5,000,000 $CHESS.")
        return
      }

      // Check allowance
      if (needsApproval(price)) {
        toast.loading("Approving $CHESS tokens...", { id: "mint-toast" })
        await approveChess(DIAMOND_VIP_ADDRESS, price)
        toast.success("Approval successful!", { id: "mint-toast" })
        await refetchChessAllowance()
      }

      toast.loading("Minting your Diamond VIP NFT...", { id: "mint-toast" })
      await writeMint({
        address: DIAMOND_VIP_ADDRESS,
        abi: DIAMOND_VIP_ABI,
        functionName: "mint",
      })

      toast.success("Congratulations! You are now a Diamond VIP! 💎 Use any Daily Code in the Promote section to activate your daily bundle!", { id: "mint-toast", duration: 8000 })
      await sdk.haptics.impactOccurred("medium")
    } catch (err: any) {
      console.error("Mint error:", err)
      toast.error(err.message || "Minting failed. Please try again.", { id: "mint-toast" })
    }
  }

  useEffect(() => {
    const checkHaptics = async () => {
      try {
        await sdk.haptics.impactOccurred('light');
        setHapticsSupported(true);
        console.log('Haptics supported: true');
      } catch (error) {
        setHapticsSupported(false);
        console.log('Haptics not supported:', error);
      }
    };

    checkHaptics();

    const savedFavorites = localStorage.getItem("farcaster-favorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }

    // Miniapp fetching moved to lazy load function

    // Temporarily static season name to reduce DB usage on start
    // TODO: Remember to update or restore fetch for the next season!
    setSeasonData({
      id: 1,
      name: "Growth Galaxy",
      status: "active",
      start_date: "2024-01-01",
      end_date: "2026-12-31",
      total_rewards: "10000000"
    });

    sdk.actions.addMiniApp();

    sdk.context.then((ctx) => {
      console.log('Farcaster context:', ctx)
      if (ctx && ctx.user) {
        const farcasterUser = ctx.user as { fid?: number; username?: string; displayName?: string; pfp?: string } | undefined
        console.log('Farcaster user context:', farcasterUser)
        if (farcasterUser?.fid) {
          console.log('User authenticated:', farcasterUser)
          setUserFid(farcasterUser.fid)
          localStorage.setItem('userFid', farcasterUser.fid.toString())
        }
      } else {
        console.log('No user context available, using test FID')
        setUserFid(12345) // Test FID for development
        localStorage.setItem('userFid', '12345')
      }
    }).catch((error) => {
      console.error('Error getting Farcaster context:', error)
      console.log('Using test FID for development')
      setUserFid(12345) // Test FID for development
      localStorage.setItem('userFid', '12345')
    })

    // Set default snapshot date if not from API
    setSnapshotDate(new Date().toLocaleDateString("en-US"))
    setLoading(false)
  }, [])

  const loadMiniapps = async () => {
    if (showMiniapps) {
      setShowMiniapps(false);
      return;
    }

    if (hapticsSupported) {
      try {
        await sdk.haptics.impactOccurred('medium');
      } catch (error) {
        console.log('Haptics error:', error);
      }
    }

    setFetchingMiniapps(true);
    try {
      const apiUrl = `${window.location.origin}/api/miniapps?limit=300`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      const data = await res.json();
      const appsWithId = data.miniapps.map((app: MiniappFromApi): Miniapp => ({ ...app, id: app.domain }));
      setMiniapps(appsWithId || []);
      setShowMiniapps(true);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setFetchingMiniapps(false);
    }
  };

  useEffect(() => {
    if (!loading) sdk.actions.ready()
  }, [loading])

  const toggleFavorite = async (domain: string) => {
    if (hapticsSupported) {
      try {
        await sdk.haptics.impactOccurred('light');
      } catch (error) {
        console.log('Haptics error:', error);
      }
    }

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

  const openMiniappByIndex = async (index: number, apps: Miniapp[]) => {
    if (index >= 0 && index < apps.length) {
      if (hapticsSupported) {
        try {
          await sdk.haptics.impactOccurred('medium');
        } catch (error) {
          console.log('Haptics error:', error);
        }
      }

      setOpenMiniapp(apps[index]);
      setOpenMiniappIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {/* Season Status Banner */}
      {seasonData && <SeasonStatusBanner seasonData={seasonData} />}

      {/* Lambo Lottery Modal */}
      <LamboLottery
        isOpen={showLamboLottery}
        onClose={() => setShowLamboLottery(false)}
        userFid={userFid}
        onPurchaseSuccess={() => {
          console.log('Lottery tickets purchased successfully!');
        }}
      />

      {/* Weather Lotto Modal */}
      <WeatherLottoModal
        isOpen={showWeatherLotto}
        onClose={() => setShowWeatherLotto(false)}
        userFid={userFid}
        onPurchaseSuccess={() => {
          console.log('Weather Lotto tickets purchased successfully!');
        }}
      />

      {/* VIP Redeem Modal */}
      <VipRedeemModal
        isOpen={showVipModal}
        onClose={() => setShowVipModal(false)}
        currentUser={currentUser}
      />



      {openMiniapp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#23283a] rounded-xl shadow-lg p-6 max-w-4xl w-full h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 gap-2">
              <button
                onClick={() => {
                  if (openMiniappIndex !== null) {
                    const allApps = [...favoriteApps, ...nonFavoriteApps];
                    openMiniappByIndex(openMiniappIndex - 1, allApps);
                  }
                }}
                disabled={openMiniappIndex === 0 || openMiniappIndex === null}
                className="px-2 py-1 rounded bg-gray-700 text-white font-bold text-xs disabled:opacity-50"
              >
                ◀ Back
              </button>
              <div className="flex-1 text-center text-lg font-bold text-cyan-300">{openMiniapp.name}</div>
              <button
                onClick={() => {
                  if (openMiniappIndex !== null) {
                    const allApps = [...favoriteApps, ...nonFavoriteApps];
                    openMiniappByIndex(openMiniappIndex + 1, allApps);
                  }
                }}
                disabled={openMiniappIndex === null || openMiniappIndex === ([...favoriteApps, ...nonFavoriteApps].length - 1)}
                className="px-2 py-1 rounded bg-gray-700 text-white font-bold text-xs disabled:opacity-50"
              >
                Next ▶
              </button>
              <button onClick={() => { setOpenMiniapp(null); setOpenMiniappIndex(null); }} className="px-3 py-1 rounded bg-red-600 text-white font-bold text-xs ml-2">
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={openMiniapp.homeUrl} className="w-full h-full border-0" title={openMiniapp.name} />
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a1122] to-[#050810] px-1 pb-24 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6 text-center">
            <div className="flex justify-center items-center mb-2">
              <div className="flex items-center gap-2">
                <Image src="/icon.png" alt="AppRank icon" width={48} height={48} className="w-12 h-12 diamond-shadow rounded-xl" />
                <h1 className="text-3xl font-black uppercase tracking-[.35em] bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent" style={{ letterSpacing: "0.35em" }}>
                  APPRANK
                </h1>
              </div>
            </div>
            <p className="text-cyan-200/70 text-sm mb-1 font-medium">Farcaster Toplist, Stats, Promotions, and Growth</p>
            <p className="text-purple-200 text-xs font-medium mb-3">
              {`Snapshot date: ${snapshotDate}`}
            </p>

            {/* Wallet Quick Connect for Mobile */}
            <div className="flex justify-center mb-6 px-4">
              <div className={`p-2 rounded-2xl border transition-all max-w-[280px] w-full ${isConnected ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-purple-500/5 border-purple-500/20 shadow-lg shadow-purple-500/10'}`}>
                {isConnected ? (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-cyan-300">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </span>
                    </div>
                    <button
                      onClick={() => disconnect()}
                      className="text-[9px] font-black uppercase text-gray-500 hover:text-white transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="text-[8px] font-black text-purple-400 uppercase tracking-widest text-center">
                      Connect Wallet for Minting
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {connectors.map((connector) => (
                        <button
                          key={connector.id}
                          onClick={() => connect({ connector })}
                          className="px-3 py-1 text-[9px] font-bold bg-purple-600/20 hover:bg-purple-600/40 text-purple-100 rounded-lg border border-purple-500/20 transition-all active:scale-95"
                        >
                          {connector.name.replace('Extension', '').replace('Wallet', '')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* 2x2 Grid Layout for Main Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
            {/* Share & Earn */}
            <button
              onClick={async () => {
                if (hapticsSupported) {
                  try {
                    await sdk.haptics.impactOccurred('medium');
                  } catch (error) {
                    console.log('Haptics error:', error);
                  }
                }
                window.location.href = '/promote';
              }}
              className="glass-morphism flex flex-col items-center gap-3 p-6 text-lg font-bold rounded-xl text-white shadow-lg sm:hover:scale-[1.02] transition-all duration-300 cursor-pointer diamond-shadow"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center border-2 border-white/60">
                <FiUsers size={32} className="text-white" />
              </div>
              <div className="text-center">
                <div className="text-cyan-300 italic tracking-tighter">Share & Earn</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Earn $CHESS</div>
              </div>
            </button>

            {/* Buy a Lambo */}
            <button
              onClick={async () => {
                if (hapticsSupported) {
                  try {
                    await sdk.haptics.impactOccurred('medium');
                  } catch (error) {
                    console.log('Haptics error:', error);
                  }
                }
                setShowLamboLottery(true);
              }}
              className="glass-morphism flex flex-col items-center gap-3 p-6 text-lg font-bold rounded-xl text-white shadow-lg sm:hover:scale-[1.02] transition-all duration-300 cursor-pointer diamond-shadow"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center border-2 border-white/60">
                <FiDollarSign size={32} className="text-white" />
              </div>
              <div className="text-center">
                <div className="text-cyan-300 italic tracking-tighter">Buy a Lambo</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lottery</div>
              </div>
            </button>

            {/* Claim $CHESS */}
            <button
              onClick={async () => {
                if (hapticsSupported) {
                  try {
                    await sdk.haptics.notificationOccurred('success');
                  } catch (error) {
                    console.log('Haptics error:', error);
                  }
                }
                sdk.actions.openUrl("https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess");
              }}
              className="glass-morphism flex flex-col items-center gap-3 p-6 text-lg font-bold rounded-xl text-white shadow-lg sm:hover:scale-[1.02] transition-all duration-300 cursor-pointer diamond-shadow"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center border-2 border-white/60">
                <FiGift size={32} className="text-white" />
              </div>
              <div className="text-center">
                <div className="text-cyan-300 italic tracking-tighter">Claim $CHESS</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Free Tokens</div>
              </div>
            </button>

            {/* Sunny/Rainy */}
            <button
              onClick={async () => {
                if (hapticsSupported) {
                  try {
                    await sdk.haptics.impactOccurred('medium');
                  } catch (error) {
                    console.log('Haptics error:', error);
                  }
                }
                setShowWeatherLotto(true);
              }}
              className="glass-morphism flex flex-col items-center gap-3 p-6 text-lg font-bold rounded-xl text-white shadow-lg sm:hover:scale-[1.02] transition-all duration-300 cursor-pointer diamond-shadow"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full flex items-center justify-center border-2 border-white/60">
                <span className="text-2xl">☀️🌧️</span>
              </div>
              <div className="text-center">
                <div className="text-cyan-300 italic tracking-tighter">SUNNY / RAINY</div>
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Live</div>
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center max-w-2xl mx-auto mb-6 px-2 gap-4">
            <button
              onClick={loadMiniapps}
              disabled={fetchingMiniapps}
              className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 flex items-center justify-center gap-2 border-2 ${showMiniapps
                ? "bg-red-900/40 border-red-500/50 text-red-200"
                : "glass-morphism border-cyan-500/50 text-cyan-200 diamond-shadow"
                }`}
            >
              {fetchingMiniapps ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>LOADING APPRANK...</span>
                </div>
              ) : (
                <>
                  <FiAward size={22} className={showMiniapps ? "text-red-400" : "text-cyan-400"} />
                  <span className="italic tracking-tight">{showMiniapps ? "HIDE LEADERBOARD" : "SHOW APPRANK LEADERBOARD"}</span>
                </>
              )}
            </button>

            {showMiniapps && (
              <form className="flex items-center w-full animate-fadeIn" onSubmit={(e) => e.preventDefault()}>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search miniapps..." className="flex-1 px-4 py-3 rounded-l-xl bg-black/40 text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 placeholder:text-gray-500" />
                <button type="submit" className="px-6 py-3 rounded-r-xl bg-cyan-900/40 text-cyan-400 border-t border-b border-r border-white/10 hover:bg-cyan-900/60 transition-colors" aria-label="Search">
                  <FiSearch size={22} />
                </button>
              </form>
            )}
          </div>

          {/* PRESALE BANNER - COMPACT DIAMOND STYLE */}
          <div className="max-w-2xl mx-auto mb-6 px-2 animate-fadeIn">
            <div className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-black/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-cyan-900/20 animate-pulse"></div>

              <div className="relative p-3 flex items-center justify-between gap-3">
                {/* Left: Ticker */}
                <div className="flex-1 text-center border-r border-white/10 pr-3">
                  <div className="text-[10px] text-cyan-300 uppercase tracking-widest font-bold mb-1 flex items-center justify-center gap-1">
                    <FiClock className="animate-pulse" /> Presale Ends
                  </div>
                  <div className="scale-90 origin-center">
                    <CountdownTimer targetDate={PRESALE_END_DATE} />
                  </div>
                </div>

                {/* Right: Top 3 Auto */}
                <div className="flex-1 text-center pl-1">
                  <div className="text-[10px] text-yellow-200 uppercase tracking-widest font-bold mb-1 flex items-center justify-center gap-1">
                    Current Season
                  </div>
                  <div className="text-xs font-bold text-white leading-tight">
                    Top 3 <span className="text-yellow-400">Auto-Win</span><br />
                    <span className="text-[10px] text-cyan-300 font-normal">Diamond VIP Status</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diamond VIP Minting Section */}
          <div className="max-w-2xl mx-auto mb-12 px-2 animate-fadeIn">
            <div className="bg-gradient-to-br from-slate-900 via-[#1a1f2e] to-slate-900 rounded-3xl p-6 border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden group">
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full" />

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* 3D Card Component */}
                <div className="w-full md:w-1/2">
                  <DiamondCard />
                </div>

                {/* Text Content */}
                <div className="w-full md:w-1/2 text-center md:text-left space-y-4">
                  <div className="inline-block px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-[10px] font-bold text-cyan-400 tracking-widest uppercase mb-2">
                    Diamond VIP Pass
                  </div>
                  <h2 className="text-3xl font-black text-white italic tracking-tight">
                    DIAMOND <span className="text-cyan-400">VIP</span> 💎
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    Exclusive membership for the ultimate $CHESS holders.<br />
                    <span className="text-cyan-300 font-bold">Total Value: Over 400k $CHESS Daily — Forever.</span>
                  </p>

                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {[
                      "🎟️ 1. Free Lambo Lotto Ticket (100k Value)",
                      "👍 2. Like & Share Promotion (100k Limit)",
                      "💬 3. Quote Promotion (100k Limit)",
                      "📝 4. Comment Promotion (100k Limit)",
                      "💎 5. Exclusive NFT Ownership",
                      "🚀 6. 2x Season Points Multiplier",
                      "🏆 7. TOP 3 Season Reward (Automatic VIP)"
                    ].map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-semibold text-cyan-100/80">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {perk}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Presale Price</div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-900/40 border border-cyan-500/30 rounded-lg">
                          <span className="text-white font-bold text-sm">5,000,000 $CHESS</span>
                        </div>
                      </div>
                      <div className="text-gray-600 font-bold hidden md:block">→</div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Public Price</div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg">
                          <span className="text-gray-400 font-bold text-sm">10,000,000 $CHESS</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleMint}
                      disabled={true} // Inactive for now
                      className={`w-full py-4 font-black text-xl rounded-2xl transition-all duration-300 diamond-shadow disabled:opacity-50 disabled:cursor-not-allowed ${isAlreadyVip
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                        : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                        }`}
                    >
                      {isAlreadyVip ? "ALREADY A VIP 💎" : "COMING SOON 🚀"}
                    </button>
                    <p className="text-[9px] text-purple-400 text-center uppercase font-black tracking-widest">Limited Presale Active (50% OFF)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showMiniapps && (
            <div className="relative glass-morphism rounded-2xl shadow-2xl p-1 w-full animate-fadeIn border border-white/10">
              {favoriteApps.length > 0 && (
                <div
                  className="sticky top-0 z-20 bg-[#23283a] py-2 cursor-pointer hover:bg-[#2a2f42] transition-colors"
                  onTouchStart={async () => {
                    if (hapticsSupported) {
                      try {
                        await sdk.haptics.impactOccurred('light');
                      } catch (error) {
                        console.log('Haptics error:', error);
                      }
                    }
                  }}
                  onMouseDown={async () => {
                    if (hapticsSupported) {
                      try {
                        await sdk.haptics.impactOccurred('light');
                      } catch (error) {
                        console.log('Haptics error:', error);
                      }
                    }
                  }}
                >
                  <div className="flex items-center justify-between px-2 mb-1">
                    <div className="text-xs text-cyan-400 font-medium">⭐ Favorites</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {favoriteApps.map((app) => (
                      <MiniappCard
                        key={app.id}
                        app={app}
                        isFavorite={true}
                        onOpen={() => {
                          const idx = [...favoriteApps, ...nonFavoriteApps].findIndex(a => a.id === app.id);
                          setOpenMiniapp(app);
                          setOpenMiniappIndex(idx);
                        }}
                        onToggleFavorite={() => toggleFavorite(app.domain)}
                      />
                    ))}
                  </div>
                  <div className="h-px bg-cyan-400/30 my-2"></div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {nonFavoriteApps.map((app, index) => (
                  <React.Fragment key={app.id}>
                    <MiniappCard
                      app={app}
                      isFavorite={false}
                      onOpen={() => {
                        const idx = [...favoriteApps, ...nonFavoriteApps].findIndex(a => a.id === app.id);
                        setOpenMiniapp(app);
                        setOpenMiniappIndex(idx);
                      }}
                      onToggleFavorite={() => toggleFavorite(app.domain)}
                    />
                    {(index + 1 === 50 || index + 1 === 100) && (
                      <div className="flex items-center justify-center py-2">
                        <div className="flex-1 h-px bg-gray-600"></div>
                        <span className="px-4 text-xs text-gray-500 font-medium">Reward Cutoff</span>
                        <div className="flex-1 h-px bg-gray-600"></div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="fixed bottom-0 left-0 w-full z-50 glass-morphism border-t border-white/10">
          <div className="flex w-full max-w-6xl mx-auto">
            {["all", "games", "social", "utility", "finance"].map((category) => {
              const IconComponent = categoryIcons[category] || FiGrid;
              return (
                <button
                  key={category}
                  className={`flex-1 py-4 text-center font-sans tracking-wide uppercase transition-all duration-300 ${filter === category && category !== 'games'
                    ? "bg-cyan-500/10 text-cyan-400 border-t-2 border-cyan-400"
                    : category === 'games' && showVipModal
                      ? "bg-purple-500/10 text-purple-400 border-t-2 border-purple-400 shadow-[0_-4px_12px_rgba(232,121,249,0.15)]"
                      : "bg-transparent text-gray-500 hover:text-cyan-300"
                    }`}
                  onClick={async () => {
                    if (hapticsSupported) {
                      try {
                        await sdk.haptics.selectionChanged();
                      } catch (error) {
                        console.log('Haptics error:', error);
                      }
                    }

                    if (category === 'games') {
                      setShowVipModal(true);
                      return;
                    }

                    if (category === 'utility') {
                      setShowSeasonModal(true);
                      return;
                    }

                    if (category === 'finance') {
                      window.location.href = '/promote?redeem=true';
                      return;
                    }

                    if (category === 'social') {
                      window.location.href = '/promote';
                      return;
                    }

                    setFilter(category);
                  }}
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className={category === 'games' ? 'animate-vip-icon-flash' : ''}>
                      <IconComponent size={18} />
                    </div>
                    <span className={`text-[9px] font-black leading-tight ${category === 'games' ? 'animate-vip-shimmer' : ''} ${['social', 'utility', 'finance'].includes(category) ? 'text-cyan-400' : ''}`}>
                      {category === 'games' ? 'VIP' :
                        category === 'social' ? 'Share & Earn' :
                          category === 'utility' ? (
                            <span className="flex flex-col">
                              <span>Daily</span>
                              <span>Check</span>
                            </span>
                          ) :
                            category === 'finance' ? (
                              <span className="flex flex-col">
                                <span>Redeem</span>
                                <span>Code</span>
                              </span>
                            ) :
                              category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                  </div>
                </button>
              );
            })}
            <button
              onClick={async () => {
                if (hapticsSupported) {
                  try {
                    await sdk.haptics.notificationOccurred('success');
                  } catch (error) {
                    console.log('Haptics error:', error);
                  }
                }
                sdk.actions.openUrl("https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess");
              }}
              className="flex-1 py-4 text-center font-sans tracking-wide bg-transparent text-cyan-400 transition-all duration-300 uppercase hover:bg-cyan-500/5"
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <FiGift size={18} />
                <span className="text-[9px] font-black italic">Claim $CHESS</span>
              </div>
            </button>


          </div>
        </nav>

        <SeasonModal
          isOpen={showSeasonModal}
          onClose={() => setShowSeasonModal(false)}
          userFid={currentUser.fid}
        />
      </div >
      <style jsx global>{`
        @keyframes chessneon {
          0% { color: #5D6AFF; text-shadow: 0 0 6px #5D6AFF, 0 0 12px #5D6AFF; }
          25% { color: #00fff7; text-shadow: 0 0 8px #00fff7, 0 0 16px #00fff7; }
          50% { color: #fff; text-shadow: 0 0 10px #fff, 0 0 20px #00fff7; }
          75% { color: #a259ff; text-shadow: 0 0 8px #a259ff, 0 0 16px #5D6AFF; }
          100% { color: #5D6AFF; text-shadow: 0 0 6px #5D6AFF, 0 0 12px #5D6AFF; }
        }
        .animate-chessneon { animation: chessneon 7s linear infinite; }
        
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
          50% {
            box-shadow: 0 0 8px #a259ff, 0 0 16px #a259ff, 0 0 24px #a259ff;
            filter: brightness(1.1) saturate(1.2);
          }
          100% {
            box-shadow: 0 0 4px #a259ff, 0 0 8px #a259ff, 0 0 16px #a259ff;
            filter: brightness(1.05) saturate(1.1);
          }
        }
        .pulse-glow {
          animation: pulseGlow 3.5s ease-in-out infinite;
          border: 2px solid #a259ff;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        @keyframes vipShimmer {
          0% { color: #22d3ee; text-shadow: 0 0 2px rgba(34, 211, 238, 0.3); }
          33% { color: #e879f9; text-shadow: 0 0 10px rgba(232, 121, 249, 0.6), 0 0 15px rgba(34, 211, 238, 0.4); }
          66% { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.6), 0 0 15px rgba(232, 121, 249, 0.4); }
          100% { color: #22d3ee; text-shadow: 0 0 2px rgba(34, 211, 238, 0.3); }
        }
        @keyframes vipIconFlash {
          0% { filter: brightness(1) drop-shadow(0 0 2px rgba(34, 211, 238, 0.3)); transform: scale(1); }
          50% { filter: brightness(1.5) drop-shadow(0 0 15px rgba(232, 121, 249, 0.8)); transform: scale(1.1); }
          100% { filter: brightness(1) drop-shadow(0 0 2px rgba(34, 211, 238, 0.3)); transform: scale(1); }
        }
        .animate-vip-shimmer {
          animation: vipShimmer 8s ease-in-out infinite;
        }
        .animate-vip-icon-flash {
          animation: vipIconFlash 4s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}