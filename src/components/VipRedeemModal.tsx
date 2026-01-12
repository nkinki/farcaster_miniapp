"use client"

import { useState, useMemo, useEffect } from "react";
import { FiX, FiZap, FiStar, FiChevronDown, FiChevronUp, FiGift } from "react-icons/fi";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useConnect, useDisconnect } from 'wagmi';
import { toast } from 'react-hot-toast';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { DIAMOND_VIP_ADDRESS, DIAMOND_VIP_ABI } from '@/abis/diamondVip';
import { formatUnits } from 'viem';
import { sdk as miniAppSdk } from "@farcaster/miniapp-sdk";
import { useProfile } from '@farcaster/auth-kit';

interface VipRedeemModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: {
        fid: number;
        username: string;
        displayName: string;
    };
}

export default function VipRedeemModal({ isOpen, onClose, currentUser }: VipRedeemModalProps) {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();

    // Local state for the modal
    const [dailyCode, setDailyCode] = useState('');
    const [dailyCodeRewardPerShare, setDailyCodeRewardPerShare] = useState(5000);
    const [dailyCodeCastUrl, setDailyCodeCastUrl] = useState('');
    const [dailyCodeError, setDailyCodeError] = useState<string | null>(null);
    const [dailyCodeSuccess, setDailyCodeSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeDailyCodeTab, setActiveDailyCodeTab] = useState<'standard' | 'vip'>('standard');
    const [showMintSuccess, setShowMintSuccess] = useState(false);

    // Wagmi Hooks for Contracts
    const { data: chessBalance, isLoading: balanceLoading } = useReadContract({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address && isConnected,
            refetchInterval: 10000,
        }
    });

    const { data: vipBalance } = useReadContract({
        address: DIAMOND_VIP_ADDRESS,
        abi: DIAMOND_VIP_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address && isConnected,
        }
    });

    const isVip = useMemo(() => vipBalance ? Number(vipBalance) > 0 : false, [vipBalance]);

    const { data: presaleActive } = useReadContract({
        address: DIAMOND_VIP_ADDRESS,
        abi: DIAMOND_VIP_ABI,
        functionName: 'presaleActive',
        query: { enabled: isConnected }
    });

    const { data: presalePrice } = useReadContract({
        address: DIAMOND_VIP_ADDRESS,
        abi: DIAMOND_VIP_ABI,
        functionName: 'PRESALE_MINT_PRICE',
        query: { enabled: isConnected }
    });

    const { data: publicPrice } = useReadContract({
        address: DIAMOND_VIP_ADDRESS,
        abi: DIAMOND_VIP_ABI,
        functionName: 'PUBLIC_MINT_PRICE',
        query: { enabled: isConnected }
    });

    const { data: chessAllowance, refetch: refetchAllowance } = useReadContract({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'allowance',
        args: address ? [address, DIAMOND_VIP_ADDRESS] : undefined,
        query: { enabled: !!address && isConnected }
    });

    const currentPrice = publicPrice || BigInt("10000000000000000000000000"); // Fallback to 10M if call fails
    const hasAllowance = (chessAllowance !== undefined && currentPrice !== undefined) ? BigInt(chessAllowance as any) >= BigInt(currentPrice as any) : false;

    const { data: approveHash, writeContract: writeApprove, isPending: approvePending } = useWriteContract();
    const { data: mintHash, writeContract: writeMint, isPending: mintPending } = useWriteContract();

    const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    });

    const { isLoading: isWaitingMint, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
        hash: mintHash,
    });

    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
            toast.success("CHESS Approved!");
        }
    }, [isApproveSuccess, refetchAllowance]);

    useEffect(() => {
        if (isMintSuccess) {
            toast.success("Diamond VIP Minted!");
            setShowMintSuccess(true);
            setTimeout(() => {
                onClose();
            }, 5000); // Close after 5 seconds to show the animation
        }
    }, [isMintSuccess, onClose]);

    useEffect(() => {
        if (isVip) {
            setActiveDailyCodeTab('vip');
        }
    }, [isVip]);

    const handleMintNft = async () => {
        if (!address || !currentPrice) {
            toast.error("Please connect your wallet first");
            return;
        }

        try {
            if (!hasAllowance) {
                writeApprove({
                    address: CHESS_TOKEN_ADDRESS,
                    abi: CHESS_TOKEN_ABI,
                    functionName: 'approve',
                    args: [DIAMOND_VIP_ADDRESS, currentPrice],
                });
            } else {
                writeMint({
                    address: DIAMOND_VIP_ADDRESS,
                    abi: DIAMOND_VIP_ABI,
                    functionName: 'mint',
                });
            }
        } catch (error: any) {
            console.error("Mint error:", error);
            toast.error(error.message || "Transaction failed");
        }
    };

    const handleRedeemCode = async () => {
        const canRedeem = (isVip || dailyCode) && dailyCodeCastUrl;
        if (!canRedeem) {
            setDailyCodeError(isVip ? "Please enter a Cast URL" : "Please fill in all fields");
            return;
        }

        if (!currentUser?.fid) {
            setDailyCodeError("Farcaster user not detected. Please try reopening the app.");
            return;
        }

        setLoading(true);
        setDailyCodeError(null);
        setDailyCodeSuccess(null);

        try {
            const response = await fetch('/api/promotions/daily-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: dailyCode,
                    castUrl: dailyCodeCastUrl,
                    rewardPerShare: dailyCodeRewardPerShare,
                    fid: currentUser.fid,
                    username: currentUser.username,
                    displayName: currentUser.displayName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to redeem code');
            }

            setDailyCodeSuccess(data.message);
            setDailyCode('');
            setDailyCodeCastUrl('');

            setTimeout(() => {
                setDailyCodeSuccess(null);
                onClose();
            }, 2000);

        } catch (error: any) {
            console.error('Redeem error:', error);
            setDailyCodeError(error.message || 'Failed to redeem');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1a1f2e] border border-cyan-500/30 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scaleIn scrollbar-thin scrollbar-thumb-cyan-500/20">

                {/* Mint Success Overlay */}
                {showMintSuccess && (
                    <div className="absolute inset-0 z-[60] bg-[#0a0f1e]/95 flex flex-col items-center justify-center p-6 text-center animate-fadeIn overflow-hidden">
                        {/* Internal Close Button for Overlay */}
                        <div className="absolute top-4 right-4 z-[70]">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMintSuccess(false);
                                }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                            >
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse pointer-events-none"></div>
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                            <img
                                src="/diamond-vip.png"
                                alt="Diamond VIP NFT"
                                className="w-56 h-56 object-contain drop-shadow-[0_0_40px_rgba(34,211,238,0.7)] animate-float"
                                onError={(e) => {
                                    e.currentTarget.src = "https://farc-nu.vercel.app/icon.png";
                                }}
                            />
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter bg-gradient-to-br from-white via-cyan-300 to-purple-400 bg-clip-text text-transparent">
                            CONGRATULATIONS!
                        </h2>
                        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl px-8 py-4 mb-8">
                            <p className="text-cyan-400 font-black text-lg tracking-[.2em] uppercase italic">
                                DIAMOND VIP ACTIVE
                            </p>
                        </div>

                        <p className="text-white/40 text-sm font-bold animate-pulse">
                            Tap 'X' to return
                        </p>
                    </div>
                )}

                {/* Header (Compact) */}
                <div className="absolute top-2 right-2 z-10">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-white">
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-4 pb-12 space-y-5">
                    {/* Wallet Connection / Status (Refined) */}
                    <div className={`p-4 rounded-2xl border transition-all ${isConnected ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-purple-500/5 border-purple-500/20 shadow-lg'}`}>
                        {isConnected ? (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-cyan-500/20 text-cyan-400">
                                        <FiStar size={18} fill="currentColor" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] uppercase font-black text-gray-500 tracking-widest leading-none mb-1">Authenticated Wallet</div>
                                        <div className="text-sm font-mono text-cyan-300 leading-none">
                                            {address?.slice(0, 6)}...{address?.slice(-4)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => disconnect()}
                                    className="px-3 py-1 text-[9px] font-black uppercase tracking-tighter bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white rounded-md border border-white/5 transition-colors"
                                >
                                    LOGOUT
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest text-center mb-1">
                                    Connect Wallet to Purchase VIP path
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {connectors.map((connector) => (
                                        <button
                                            key={connector.id}
                                            onClick={() => connect({ connector })}
                                            className="px-4 py-2 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 rounded-xl border border-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            {connector.name.replace('Extension', '')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Badge (Clickable for VIPs) */}
                    <div
                        onClick={() => isVip && setShowMintSuccess(true)}
                        className={`p-3 rounded-xl border transition-all ${isVip ? 'bg-cyan-500/10 border-cyan-500/30 cursor-pointer hover:bg-cyan-500/20 hover:scale-[1.01] active:scale-[0.99]' : 'bg-slate-800 border-white/10'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-full ${isVip ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-gray-700 text-gray-400'}`}>
                                <FiStar size={20} fill={isVip ? "currentColor" : "none"} />
                            </div>
                            <div>
                                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-widest mb-1">Membership Status</div>
                                <div className={`text-base font-black tracking-tight ${isVip ? 'text-cyan-400 flex items-center gap-3' : 'text-gray-300'}`}>
                                    {isVip ? (
                                        <>
                                            DIAMOND VIP
                                            <span className="text-xs bg-cyan-400/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-400/30 animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.3)]">VIEW NFT 👁️</span>
                                        </>
                                    ) : "Regular Member"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mint Section (if not VIP) */}
                    {!isVip && (
                        <div className="p-4 bg-black/40 border border-cyan-500/20 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                                <FiZap size={60} className="text-cyan-400" />
                            </div>
                            <h4 className="text-white font-black text-xs mb-1 uppercase tracking-tight">Mint VIP Pass</h4>
                            <p className="text-[9px] text-gray-400 mb-3">
                                Unlock rewards and skip codes.
                            </p>

                            <div className="flex items-center justify-between mb-3 bg-slate-900/80 p-2 rounded-xl border border-white/5">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Price</div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-cyan-400">
                                        10,000,000 $CHESS
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleMintNft}
                                disabled={approvePending || mintPending || isWaitingApprove || isWaitingMint || balanceLoading || isMintSuccess}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {approvePending || isWaitingApprove ? "Approving CHESS..." :
                                    mintPending || isWaitingMint ? "Minting NFT..." :
                                        isMintSuccess ? "VIP MINTED ✓" :
                                            !hasAllowance ? "Step 1: Approve $CHESS" : "Step 2: Mint VIP Pass"}
                            </button>
                        </div>
                    )}

                    {/* Tab Switcher */}
                    {!dailyCodeSuccess && (
                        <div className="flex p-0.5 bg-black/40 rounded-xl border border-white/5">
                            <button
                                onClick={() => setActiveDailyCodeTab('standard')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${activeDailyCodeTab === 'standard'
                                    ? 'bg-slate-700 text-white'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                STANDARD
                            </button>
                            <button
                                onClick={() => setActiveDailyCodeTab('vip')}
                                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 relative ${activeDailyCodeTab === 'vip'
                                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                                    : 'text-cyan-400/60 hover:text-cyan-400'
                                    }`}
                            >
                                VIP 💎 {isVip && <span className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />}
                            </button>
                        </div>
                    )}

                    {activeDailyCodeTab === 'vip' && !dailyCodeSuccess && (
                        <div className="p-4 bg-gradient-to-br from-cyan-900/40 to-purple-900/40 border border-cyan-500/30 rounded-2xl shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-cyan-300 font-black text-sm flex items-center gap-2 uppercase tracking-widest">
                                    <span className="text-2xl">💎</span> VIP DAILY BUNDLE
                                </h3>
                                <div className="text-[9px] bg-cyan-400/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-400/30 font-black uppercase tracking-tighter shadow-sm">
                                    PREMIUM UNLOCKED
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {[
                                    { icon: "🎟️", text: "1x FREE Lambo Lotto Ticket", color: "text-cyan-300" },
                                    { icon: "📈", text: "100k Like & Recast Promo", color: "text-purple-300" },
                                    { icon: "💬", text: "100k Quote Promotion", color: "text-cyan-300" },
                                    { icon: "📝", text: "100k Comment Promotion", color: "text-purple-300" }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 bg-black/40 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                                        <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                                            {item.icon}
                                        </div>
                                        <div className={`text-xs font-black uppercase tracking-tight ${item.color}`}>
                                            {item.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-center">
                                <p className="text-xs text-cyan-200 leading-tight font-bold italic">
                                    {isVip ? "Diamond Status Active! Your premium bundle is ready for launch." : "Upgrade to VIP to unlock these daily automated rewards!"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Redeem Code Section */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                            <FiGift className="text-purple-400" size={16} />
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide">Redeem Rewards</h3>
                        </div>

                        {dailyCodeError && (
                            <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-200 text-xs text-center font-medium animate-shake">
                                {dailyCodeError}
                            </div>
                        )}

                        {dailyCodeSuccess && (
                            <div className="p-3 bg-green-900/50 border border-green-500/50 rounded-xl text-green-200 text-xs text-center font-medium animate-fadeIn">
                                {dailyCodeSuccess}
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-black text-cyan-400 uppercase tracking-widest mb-2 ml-1">
                                {isVip && activeDailyCodeTab === 'vip' ? "VIP STATUS: ACTIVE (CODE OPTIONAL)" : "Enter Secret Code"}
                            </label>
                            <input
                                type="text"
                                value={dailyCode}
                                onChange={(e) => setDailyCode(e.target.value)}
                                placeholder={isVip && activeDailyCodeTab === 'vip' ? "✨ AUTO-PASS ✨" : "Enter code..."}
                                className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white focus:ring-1 focus:outline-none transition-all font-bold text-sm ${isVip && activeDailyCodeTab === 'vip'
                                    ? 'border-cyan-400/50 ring-1 ring-cyan-400/20 placeholder:text-cyan-200/70'
                                    : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400 placeholder:text-cyan-400/30'}`}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-purple-400 uppercase tracking-widest mb-2 ml-1">
                                Target Warpcast URL
                            </label>
                            <input
                                type="text"
                                value={dailyCodeCastUrl}
                                onChange={(e) => setDailyCodeCastUrl(e.target.value)}
                                placeholder="https://warpcast.com/..."
                                className="w-full bg-black/60 border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all placeholder:text-gray-600 font-bold text-xs"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-white uppercase tracking-widest mb-2 ml-1">
                                Reward Amount (Per Share)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1000, 5000, 10000, 20000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setDailyCodeRewardPerShare(Math.min(amt, isVip ? 20000 : 5000))}
                                        disabled={!isVip && amt > 5000}
                                        className={`py-3 rounded-xl text-xs font-black transition-all border ${dailyCodeRewardPerShare === Math.min(amt, isVip ? 20000 : 5000)
                                            ? 'bg-cyan-500 border-cyan-400 text-white shadow-md'
                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                                            } ${!isVip && amt > 5000 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    >
                                        {amt >= 1000 ? `${amt / 1000}k` : amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleRedeemCode}
                            disabled={loading || (!isVip && !dailyCode) || !dailyCodeCastUrl}
                            className="w-full py-5 mt-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-2xl font-black text-sm shadow-xl transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-[.2em] flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <span>LAUNCH BUNDLE</span>
                                    <FiZap size={18} className="animate-pulse text-cyan-300" />
                                </>
                            )}
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}
