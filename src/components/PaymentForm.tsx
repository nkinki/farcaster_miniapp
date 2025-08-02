// src/app/promote/page.tsx

"use client";

import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { SignInButton, useProfile } from "@farcaster/auth-kit";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiLoader } from "react-icons/fi";

// Feltételezzük, hogy ezek a komponensek léteznek
import PaymentForm from "@/components/PaymentForm";
import UserProfile from "@/components/UserProfile"; 

// A típusok itt vannak definiálva, hogy ne legyen build hiba
interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
}

interface PromoCast {
  id: string;
  author: FarcasterUser;
  castUrl: string;
  total_budget: number;
}

export default function PromotePage() {
  // === ÁLLAPOTKEZELÉS ===
  const [userProfile, setUserProfile] = useState<FarcasterUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promoCasts, setPromoCasts] = useState<PromoCast[]>([]); 
  const [loading, setLoading] = useState(true);
  
  // Űrlap állapotok
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [castUrl, setCastUrl] = useState("");
  const [shareText, setShareText] = useState("");
  const [rewardPerShare, setRewardPerShare] = useState(1000); // Alapértelmezett 1k
  const [totalBudget, setTotalBudget] = useState(10000);
  
  // Modal állapotok
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalProps, setModalProps] = useState<any>(null);

  // === HOOK-OK ===
  const { profile: authKitProfile, isAuthenticated: isAuthKitAuthenticated } = useProfile();

  // === EGYSÉGES AUTHENTIKÁCIÓS LOGIKA ===
  useEffect(() => {
    const authenticate = async () => {
      try {
        // --- JAVÍTÁS: A .context EGY PROMISE, NEM FÜGGVÉNY. A ()-t EL KELL TÁVOLÍTANI. ---
        const context = await sdk.context;
        if (context.user?.fid) {
          const user = { fid: context.user.fid, username: context.user.username || "", displayName: context.user.displayName || "", pfpUrl: context.user.pfpUrl };
          setUserProfile(user);
          setIsAuthenticated(true);
          console.log("Authenticated via Mini-App SDK");
          return;
        }
      } catch (error) {
        console.warn("Mini-App SDK context not available, falling back to AuthKit.");
      }

      if (isAuthKitAuthenticated && authKitProfile) {
        const user = { fid: authKitProfile.fid, username: authKitProfile.username, displayName: authKitProfile.displayName, pfpUrl: authKitProfile.pfpUrl };
        setUserProfile(user);
        setIsAuthenticated(true);
        console.log("Authenticated via AuthKit");
      } else {
        setUserProfile(null);
        setIsAuthenticated(false);
      }
    };
    authenticate().finally(() => setLoading(false));
  }, [isAuthKitAuthenticated, authKitProfile]);
  
  // === ESEMÉNYKEZELŐK ===
  const handleOpenNewCampaignModal = () => {
    if (!userProfile) return alert("Please sign in first.");
    if (!castUrl) return alert("Please provide a Cast URL.");
    if (rewardPerShare > totalBudget) return alert("Reward cannot be greater than budget.");

    setModalProps({
      promotionId: 'new',
      newCampaignData: {
        castUrl,
        shareText,
        rewardPerShare,
        totalBudget,
        user: userProfile,
      }
    });
    setShowPaymentModal(true);
  };
  
  const handleOpenFundModal = (promo: PromoCast) => {
    setModalProps({ promotionId: promo.id });
    setShowPaymentModal(true);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><FiLoader className="animate-spin text-purple-400 text-4xl" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Fejléc */}
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-purple-300 hover:text-white transition-colors"><FiArrowLeft size={20} /><span>Back to AppRank</span></Link>
          <div className="flex items-center gap-4">
            {isAuthenticated && userProfile && <span className="text-sm hidden sm:block">@{userProfile.username}</span>}
            <SignInButton />
          </div>
        </header>

        {/* Új kampány indítása gomb */}
        <div className="text-center mb-8">
          <button onClick={() => setShowCreateForm(v => !v)} disabled={!isAuthenticated} className="px-6 py-3 text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            <FiPlus className="inline-block mr-2" />
            Start New Campaign
          </button>
        </div>

        {/* Kampánykészítő Űrlap */}
        {showCreateForm && (
          <div className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79]">
            <h2 className="text-xl font-bold mb-4">Create New Campaign</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cast URL</label>
                <input type="url" value={castUrl} onChange={e => setCastUrl(e.target.value)} placeholder="https://warpcast.com/..." className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Reward per Share ($CHESS)</label>
                <div className="flex space-x-2 rounded-lg bg-[#181c23] p-1 border border-gray-600">
                  {[1000, 5000, 10000].map(amount => (
                    <button key={amount} type="button" onClick={() => setRewardPerShare(amount)} className={`flex-1 px-3 py-2 text-sm font-semibold rounded-md transition-all ${rewardPerShare === amount ? "bg-purple-600" : "hover:bg-gray-700"}`}>
                      {amount / 1000}K
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget ($CHESS)</label>
                <input type="number" value={totalBudget} onChange={e => setTotalBudget(parseInt(e.target.value) || 0)} min="1000" step="1000" className="w-full px-4 py-2 bg-[#181c23] border border-gray-600 rounded-lg" />
              </div>
              <button onClick={handleOpenNewCampaignModal} className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg font-semibold">
                Next: Create on Blockchain
              </button>
            </div>
          </div>
        )}

        {/* Kampányok listája (IDE JÖN A TE LISTÁD) */}
        {/* <div className="space-y-4">
            ... a te listázó kódod ...
        </div> */}
      </div>

      {/* Modal a blokklánc tranzakciókhoz */}
      {showPaymentModal && modalProps && (
        <PaymentForm
          {...modalProps}
          onComplete={(amount, hash) => {
            console.log(`Success! Hash: ${hash}`);
            setShowPaymentModal(false);
            setModalProps(null);
            // Itt frissítheted a kampányok listáját
          }}
          onCancel={() => {
            setShowPaymentModal(false);
            setModalProps(null);
          }}
        />
      )}
    </div>
  );
}