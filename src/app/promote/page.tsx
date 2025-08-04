"use client"

import { useState, useEffect, useCallback } from "react";
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { FiArrowLeft, FiShare2, FiDollarSign, FiUsers, FiTrendingUp, FiPlus, FiX, FiMoreHorizontal, FiSettings, FiPause, FiPlay } from "react-icons/fi";
import Link from "next/link";
import UserProfile from "@/components/UserProfile";
import PaymentForm from "../../components/PaymentForm";
import FundingForm from "../../components/FundingForm";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { PromoCast } from "@/types/promotions";
// JAVÍTÁS: Importáljuk az új komponenst
import MyCampaignsDropdown from "@/components/MyCampaignsDropdown";

// ... (FarcasterUser, FarcasterContext, convertDbToPromoCast változatlanok) ...

export default function PromotePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<FarcasterUser | null>(null);
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showFundingForm, setShowFundingForm] = useState(false);
  const [fundingPromo, setFundingPromo] = useState<PromoCast | null>(null);
  const [userStats, setUserStats] = useState({ totalEarnings: 0, totalShares: 0, pendingClaims: 0 });
  // JAVÍTÁS: Új state a kártyákon lévő menü nyitásához
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    miniAppSdk.context.then(ctx => {
      if (ctx.user?.fid) {
        setIsAuthenticated(true);
        setProfile(ctx.user);
      }
    });
  }, []);

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/promotions?status=all");
      if (response.ok) {
        const data = await response.json();
        setPromoCasts(data.promotions.map(convertDbToPromoCast));
      }
    } catch (error) {
      console.error("Error fetching promotions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPromotions() }, [fetchPromotions]);

  const currentUser = isAuthenticated && profile ? { fid: profile.fid, username: profile.username || "user", displayName: profile.displayName || "Current User" } : { fid: 0, username: "guest", displayName: "Guest" };

  const handleCreateSuccess = () => { setShowForm(false); fetchPromotions(); };
  const handleCreateCancel = () => { setShowForm(false); };
  const handleFundSuccess = () => { setShowFundingForm(false); setFundingPromo(null); fetchPromotions(); };
  const handleFundCancel = () => { setShowFundingForm(false); setFundingPromo(null); };

  // JAVÍTÁS: Különválasztjuk a saját és a mások kampányait
  const myPromos = promoCasts.filter(p => p.author.fid === currentUser.fid);
  const availablePromos = promoCasts.filter(p => p.status === 'active' && p.author.fid !== currentUser.fid);

  if (loading) {
    // ... (loading screen változatlan)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"><FiArrowLeft size={20} /><span>Back to AppRank</span></Link>
            <div className="flex items-center gap-4"><h1 className="text-2xl font-bold text-white">Promotion Campaigns</h1><ConnectWalletButton /></div>
        </div>

        <UserProfile userPromos={myPromos} userStats={userStats} />
        
        {/* JAVÍTÁS: Az új "My Campaigns" legördülő menü */}
        <MyCampaignsDropdown myPromos={myPromos} onManageClick={(promo) => { setFundingPromo(promo); setShowFundingForm(true); }} />

        <div className="flex justify-center my-8">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white shadow-lg"><FiPlus size={20} />Create Promotion</button>
        </div>
        
        {showForm && (
            <div id="promo-form" className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79] relative">
                <button className="absolute top-3 right-3 text-gray-400 hover:text-white" onClick={handleCreateCancel}><FiX size={24} /></button>
                <PaymentForm user={currentUser} onSuccess={handleCreateSuccess} onCancel={handleCreateCancel} />
            </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-white">Available Campaigns</h2></div>
          {availablePromos.length === 0 ? (
            <div className="text-center py-12 bg-[#23283a] rounded-2xl border border-[#a64d79]"><div className="text-gray-400 text-lg">No other active campaigns right now.</div></div>
          ) : (
            availablePromos.map((promo) => (
              <div key={promo.id} className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 overflow-hidden pr-4">
                    <p className="text-white font-semibold truncate">{promo.castUrl}</p>
                    <p className="text-purple-300 text-sm">by @{promo.author.username}</p>
                  </div>
                  {/* JAVÍTÁS: Menü gomb a gombok helyett */}
                  <div className="relative">
                    <button onClick={() => setOpenMenuId(openMenuId === promo.id ? null : promo.id)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700">
                      <FiMoreHorizontal size={20} />
                    </button>
                    {/* JAVÍTÁS: A legördülő menü a gombokkal */}
                    {openMenuId === promo.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#181c23] border border-gray-700 rounded-lg shadow-xl z-10">
                        <button onClick={() => alert('Sharing!')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-gray-700">
                          <FiShare2 /> Share & Earn
                        </button>
                        {/* Itt lehetnének további gombok, pl. "View Cast", "Report" stb. */}
                      </div>
                    )}
                  </div>
                </div>

                {/* JAVÍTÁS: Kért statisztikák a kártyán */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center text-white">
                  <div className="p-3 bg-[#181c23] rounded-lg"><div className="flex items-center justify-center gap-1 mb-1 font-semibold"><FiDollarSign className="text-green-400" />{promo.rewardPerShare}</div><p className="text-xs text-gray-400">Reward/Share</p></div>
                  <div className="p-3 bg-[#181c23] rounded-lg"><div className="flex items-center justify-center gap-1 mb-1 font-semibold"><FiUsers className="text-blue-400" />{promo.sharesCount}</div><p className="text-xs text-gray-400">Shares</p></div>
                  <div className="p-3 bg-[#181c23] rounded-lg"><div className="mb-1 font-semibold">{promo.remainingBudget}</div><p className="text-xs text-gray-400">Remaining</p></div>
                  <div className="p-3 bg-[#181c23] rounded-lg"><div className="mb-1 font-semibold">{promo.totalBudget}</div><p className="text-xs text-gray-400">Total Budget</p></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showFundingForm && fundingPromo && (
        <FundingForm promotionId={Number(fundingPromo.id)} totalBudget={fundingPromo.totalBudget} rewardPerShare={fundingPromo.rewardPerShare} castUrl={fundingPromo.castUrl} shareText={fundingPromo.shareText || ""} status={fundingPromo.status} onSuccess={handleFundSuccess} onCancel={handleFundCancel} />
      )}
    </div>
  );
}