"use client"

import { useState, useMemo, useEffect } from "react";
import { FiX, FiZap, FiStar, FiChevronDown, FiChevronUp, FiGift } from "react-icons/fi";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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

    // Local state for the modal
    const [dailyCode, setDailyCode] = useState('');
    const [dailyCodeRewardPerShare, setDailyCodeRewardPerShare] = useState(5000);
    const [dailyCodeCastUrl, setDailyCodeCastUrl] = useState('');
    const [dailyCodeError, setDailyCodeError] = useState<string | null>(null);
    const [dailyCodeSuccess, setDailyCodeSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

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

    const currentPrice = presaleActive ? presalePrice : publicPrice;
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
        }
    }, [isMintSuccess]);

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
            <div className="bg-[#1a1f2e] border border-cyan-500/30 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scaleIn">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-gradient-to-r from-slate-900 to-[#1a1f2e]">
                    <h2 className="text-xl font-black text-white italic tracking-wider">
                        <span className="text-cyan-400">VIP</span> CONTROL
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Status Badge */}
                    <div className={`p-3 rounded-xl border ${isVip ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-slate-800 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isVip ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                <FiStar size={20} fill={isVip ? "currentColor" : "none"} />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current Status</div>
                                <div className={`text-sm font-black ${isVip ? 'text-cyan-400' : 'text-gray-300'}`}>
                                    {isVip ? "DIAMOND VIP ACTIVE" : "Regular Member"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mint Section (if not VIP) */}
                    {!isVip && (
                        <div className="p-5 bg-black/40 border border-cyan-500/30 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
                                <FiZap size={60} className="text-cyan-400" />
                            </div>
                            <h4 className="text-white font-black text-sm mb-2 uppercase tracking-tight">Mint Diamond VIP Pass</h4>
                            <p className="text-[10px] text-gray-400 mb-4">
                                Unlock daily rewards and skip pass codes forever.
                            </p>

                            <div className="flex items-center justify-between mb-4 bg-slate-900/80 p-3 rounded-xl border border-white/5">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Price</div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-cyan-400">
                                        {currentPrice ? Number(formatUnits(BigInt(currentPrice as any), 18)).toLocaleString() : "..."} $CHESS
                                    </div>
                                    {presaleActive && <div className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">50% OFF</div>}
                                </div>
                            </div>

                            <button
                                onClick={handleMintNft}
                                disabled={approvePending || mintPending || isWaitingApprove || isWaitingMint || balanceLoading}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {approvePending || isWaitingApprove ? "Approving CHESS..." :
                                    mintPending || isWaitingMint ? "Minting NFT..." :
                                        !hasAllowance ? "Step 1: Approve $CHESS" : "Step 2: Mint VIP Pass"}
                            </button>
                        </div>
                    )}

                    {/* Redeem Code Section */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <FiGift className="text-purple-400" />
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
                            <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1.5 ml-1">
                                {isVip ? "VIP Loophole (Optional Code)" : "Enter Secret Code"}
                            </label>
                            <input
                                type="text"
                                value={dailyCode}
                                onChange={(e) => setDailyCode(e.target.value)}
                                placeholder={isVip ? "✨ VIP AUTO-PASS ACTIVE ✨" : "Enter code here..."}
                                className={`w-full bg-black/60 border rounded-xl px-4 py-3 text-white focus:ring-1 focus:outline-none transition-all font-bold text-sm ${isVip
                                    ? 'border-cyan-400/50 ring-1 ring-cyan-400/20 placeholder:text-cyan-200/70'
                                    : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400 placeholder:text-cyan-400/30'}`}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1.5 ml-1">
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
                            <label className="block text-[10px] font-black text-white uppercase tracking-widest mb-2 ml-1">
                                Reward Amount (Per Share)
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1000, 5000, 10000, 20000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setDailyCodeRewardPerShare(Math.min(amt, isVip ? 20000 : 5000))}
                                        disabled={!isVip && amt > 5000}
                                        className={`py-2 rounded-lg text-[10px] font-black transition-all border ${dailyCodeRewardPerShare === Math.min(amt, isVip ? 20000 : 5000)
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
                            className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-xl font-black text-sm shadow-lg transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <span>CONFIRM & LAUNCH</span>
                                    <FiZap className="animate-pulse" />
                                </>
                            )}
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}
