"use client"

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useChessToken } from "@/hooks/useChessToken";
import { FiUser, FiDollarSign, FiTrendingUp, FiCheck, FiX, FiAward, FiLoader, FiAlertTriangle, FiChevronDown, FiChevronUp, FiShare2 } from "react-icons/fi";
// Már nem használjuk a szerződést, csak az API-t

interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface UserProfileProps {
  user: FarcasterUser;
  userStats: {
    totalEarnings: number;
    totalShares: number;
    pendingRewards?: number;
  };
  onClaimSuccess: () => void;
}

const UserProfile = ({ user, userStats, onClaimSuccess }: UserProfileProps) => {
  const { address } = useAccount();
  const { balance, formatChessAmount } = useChessToken();

  // Összecsukható logika
  const [collapsed, setCollapsed] = useState(true);
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);
  const [claimedAmount, setClaimedAmount] = useState(0);
  
  // Share functionality states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareText, setSelectedShareText] = useState<string>('');

  const pendingRewards = userStats.pendingRewards ?? 0;
  const hasPendingRewards = pendingRewards > 0;
  const MIN_CLAIM_AMOUNT = 10000;
  const canClaim = pendingRewards >= MIN_CLAIM_AMOUNT;

  const handleClaim = useCallback(async () => {
    if (!user.fid) {
      setError("Farcaster user not found.");
      return;
    }
    setIsClaiming(true);
    setError(null);
    setSuccess(null);

    try {
      // Használjuk a claim-rewards API-t (approve mechanizmus)
      const claimResponse = await fetch("/api/claim-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid: user.fid }),
      });
      
      const claimData = await claimResponse.json();
      
      if (!claimResponse.ok) {
        throw new Error(claimData.error || "Claim failed.");
      }

      // Sikeres claim - animáció és állapot beállítása
      const claimedRewards = pendingRewards;
      setClaimedAmount(claimedRewards);
      setJustClaimed(true);
      
      // Share as quote after successful claim
      setTimeout(async () => {
        try {
          const randomText = getRandomShareText(claimedRewards);
          const miniAppSdk = (window as any).miniAppSdk;
          
          if (miniAppSdk && miniAppSdk.actions && miniAppSdk.actions.composeCast) {
            // Use the real AppRank post hash to quote
            const castHash = '0x9dfbcf59';
            
            const castOptions: any = {
              text: randomText,
              parent: {
                type: 'cast',
                hash: castHash
              }
            };
            
            // Try to create quote cast
            const castResult = await miniAppSdk.actions.composeCast(castOptions);
            console.log('✅ Quote cast created:', castResult);
          }
        } catch (shareError) {
          console.log('Quote sharing failed, continuing:', shareError);
        }
      }, 2000);
      
      // Page refresh after claim animation
      setTimeout(() => {
        setJustClaimed(false);
        onClaimSuccess();
      }, 4000);

    } catch (err: any) {
      console.error('Claim error:', err);
      let errorMessage = "An unknown error occurred.";
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Specifikus hibák kezelése
      if (err.message?.includes('No rewards to claim')) {
        errorMessage = "No rewards available to claim.";
      } else if (err.message?.includes('Could not find a valid wallet')) {
        errorMessage = "Please connect a verified wallet to your Farcaster account.";
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = "Backend wallet has insufficient funds. Please contact support.";
      }
      
      setError(errorMessage);
    } finally {
      setIsClaiming(false);
    }
  }, [user.fid, onClaimSuccess]);

  const getRandomShareText = (amount: number) => {
    const shareTexts = [
      `Just claimed ${amount.toFixed(2)} $CHESS on @base.base.eth! 🎉 Start earning $CHESS like me: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Earned ${amount.toFixed(2)} $CHESS on @base.base.eth! 💰 Get your $CHESS rewards too: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Claimed ${amount.toFixed(2)} $CHESS on @base.base.eth! 🚀 Turn engagement into $CHESS: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Got ${amount.toFixed(2)} $CHESS on @base.base.eth! 💎 Join the $CHESS economy: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Earned ${amount.toFixed(2)} $CHESS on @base.base.eth! ⚡ Convert activity to $CHESS: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Claimed ${amount.toFixed(2)} $CHESS on @base.base.eth! 🎯 Make money with $CHESS: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Got ${amount.toFixed(2)} $CHESS on @base.base.eth! 🔥 Transform likes into $CHESS: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Earned ${amount.toFixed(2)} $CHESS on @base.base.eth! 💫 Be part of $CHESS earning: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Claimed ${amount.toFixed(2)} $CHESS on @base.base.eth! 🌟 Join $CHESS earners: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`,
      `Got ${amount.toFixed(2)} $CHESS on @base.base.eth! 🎊 Start earning $CHESS now: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`
    ];
    
    const randomIndex = Math.floor(Math.random() * shareTexts.length);
    return shareTexts[randomIndex];
  };

  // Auto-clear error and success messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success && !justClaimed) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, justClaimed]);

  const isLoading = isClaiming;

  return (
    <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] pulse-glow">
      {/* Összecsukható fejléc */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
            <FiUser className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.displayName || user.username}</h2>
            <p className="text-gray-400">@{user.username}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Total Reward Info Blokk */}
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-3 text-center min-w-[100px]">
            <div className="flex items-center justify-center gap-2 mb-1">
              <FiAward className="text-green-400" size={18} />
              <span className="font-bold text-white text-lg">{userStats.totalEarnings.toFixed(0)}</span>
            </div>
            <p className="text-xs text-green-300 font-medium">Total Earned</p>
          </div>
          
          {/* Összecsukó gomb - jobb szélre */}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="p-2 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            title={collapsed ? "Show details" : "Hide details"}
          >
            {collapsed ? <FiChevronDown size={18} /> : <FiChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* Tartalom csak ha nincs összecsukva */}
      {!collapsed && <>
      <div className="grid grid-cols-2 gap-3 mb-6 text-white">
        <div className="p-3 bg-[#181c23] rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiTrendingUp className="text-blue-400" />
            <span className="font-semibold">{userStats.totalShares}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Total Shares</p>
        </div>
        <div className="p-3 bg-[#181c23] rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiAward className="text-green-400" />
            <span className="font-semibold">{pendingRewards.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Pending Rewards</p>
        </div>
        <div className="p-3 bg-[#181c23] rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiDollarSign className="text-purple-400" />
            <span className="font-semibold">{formatChessAmount(balance)}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Your Balance</p>
        </div>
        <div className="p-3 bg-[#181c23] rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FiUser className="text-yellow-400" />
            <span className="font-semibold">FID: {user.fid}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Farcaster ID</p>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleClaim}
          disabled={isLoading || !hasPendingRewards || justClaimed || !canClaim}
          className={`w-full px-6 py-3 text-white font-semibold rounded-lg transition-all duration-500 flex items-center justify-center gap-2 ${
            justClaimed 
              ? 'bg-gradient-to-r from-green-500 to-green-600 animate-claimSuccess' 
              : canClaim && hasPendingRewards
                ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 hover:scale-105 transform' 
                : 'bg-gray-600 opacity-50 cursor-not-allowed'
          }`}
        >
          {isClaiming ? (
            <>
              <FiLoader className="animate-spin" />
              <span>Processing...</span>
            </>
          ) : justClaimed ? (
            <>
              <FiCheck className="animate-bounce" />
              <span>Claimed {claimedAmount.toFixed(2)} $CHESS!</span>
            </>
          ) : canClaim && hasPendingRewards ? (
            <>
              <FiAward className="animate-pulse" />
              <span>Claim {pendingRewards.toFixed(2)} $CHESS</span>
            </>
          ) : (
            <>
              <FiAward />
              <span>No Rewards to Claim</span>
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-1">Min. 10,000 $CHESS required</p>
        
        {error && (
          <div className="p-3 text-sm bg-red-900/50 border border-red-600 text-red-300 rounded-md flex items-center gap-2 animate-fadeIn">
            <FiX size={16} className="text-red-400" /> 
            {error}
          </div>
        )}
        
        {success && !justClaimed && (
          <div className="p-3 text-sm bg-green-900/50 border border-green-600 text-green-300 rounded-md flex items-center gap-2 animate-fadeIn">
            <FiCheck size={16} className="text-green-400" /> 
            {success}
          </div>
        )}
        
      </div>
      </>}
      
      {/* Share Modal - Egyszerű reklám ablak sikeres claim után */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎉 Success!
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            {/* Claimed Amount */}
            <div className="text-center mb-4 p-3 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {claimedAmount.toFixed(2)} CHESS
              </div>
              <div className="text-xs text-gray-300">
                Claimed successfully!
              </div>
            </div>
            
            {/* Share Image from public folder */}
            <div className="mb-4">
              <img 
                src="/og-image.png" 
                alt="AppRank" 
                className="w-full rounded-lg border border-purple-500/30"
              />
            </div>
            
            {/* Promotional text with gratitude */}
            <div className="text-center mb-4">
              <p className="text-sm text-gray-300">
                Thank you for sharing! Together we grow the $CHESS community. 🌱
              </p>
            </div>
            
            {/* Single Share Button */}
            <button
              onClick={async () => {
                try {
                  // Use backend API to create new cast via Neynar
                  const response = await fetch('/api/farcaster/cast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text: selectedShareText,
                      embeds: []
                    })
                  });
                  
                  const data = await response.json();
                  
                  if (response.ok && data.success) {
                    console.log('✅ Cast created successfully:', data.cast?.hash);
                    console.log('📱 Response data:', data);
                    console.log('🔍 Mock flag:', data.mock);
                    
                    // Check if it's a mock response
                    if (data.mock) {
                      console.log('🔄 Mock response detected, triggering fallback sharing');
                      throw new Error('Mock response - using fallback');
                    }
                    
                    // Real cast created - close modal and show success
                    setShowShareModal(false);
                    setSuccess('Cast shared successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                  } else {
                    console.log('❌ API response not successful:', data);
                    throw new Error(data.error || 'Failed to create cast');
                  }
                } catch (error) {
                  console.error('Share error:', error);
                  // Fallback to external sharing with mobile detection
                  const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(selectedShareText)}`;
                  const miniAppSdk = (window as any).miniAppSdk;
                  
                  // Detect mobile device
                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                  
                  // Try miniAppSdk openUrl first
                  try {
                    if (miniAppSdk && miniAppSdk.actions && miniAppSdk.actions.openUrl) {
                      await miniAppSdk.actions.openUrl(composeUrl);
                      setShowShareModal(false);
                      return;
                    } else {
                      throw new Error('SDK not available');
                    }
                  } catch (sdkError) {
                    console.log('SDK openUrl failed, trying mobile-specific approach...');
                    
                    if (isMobile) {
                      // For mobile, use location.href to redirect in same window
                      window.location.href = composeUrl;
                    } else {
                      // For desktop, use window.open
                      window.open(composeUrl, '_blank');
                    }
                  }
                  
                  setShowShareModal(false);
                }
              }}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
            >
              <FiShare2 className="w-4 h-4" />
              Share on Farcaster
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

UserProfile.displayName = "UserProfile";

export default UserProfile;