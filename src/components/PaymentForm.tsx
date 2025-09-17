"use client"

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, type Hash } from "viem";
import { FiX, FiMessageSquare } from "react-icons/fi";
import { FEATURES } from "@/config/features";

// JAVÍTÁS: Pontos import útvonalak a képernyőfotód alapján
import { treasuryDepositAddress, treasuryDepositABI } from "@/abis/treasuryDeposit";
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from "@/abis/chessToken";
interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
}

interface PaymentFormProps {
  user: FarcasterUser;
  onSuccess: () => void;
  onCancel: () => void;
}

// ÚJ: Létrehoztunk egyértelmű lépéseket a folyamathoz
enum CreationStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToCreate,
  Creating,
  CreateConfirming,
  Saving,
}

const budgetOptions = [10000, 100000, 500000, 1000000, 5000000];
const rewardOptions = [1000, 2000, 5000, 10000, 20000];

// Comment templates - minimum 10 realistic, general comments
const COMMENT_TEMPLATES = [
  "🚀 This is amazing!",
  "💯 Totally agree with this!",
  "🔥 This is fire!",
  "💎 Great content!",
  "💎 Diamond hands!",
  "🎯 Spot on!",
  "⚡ This hits different!",
  "🌟 Absolutely brilliant!",
  "🚀 Love this energy!",
  "💪 This is the way!",
  "🎉 Amazing work!",
  "⭐ Perfect!",
  "👏 Well said!",
  "🎊 Incredible!",
  "🏆 Top tier content!",
  "💫 Mind blown!",
  "🎨 Beautiful work!",
  "🚀 Next level stuff!",
  "💎 Pure gold!",
  "🔥 Absolutely fire!"
];

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${num / 1000000}M`;
  if (num >= 1000) return `${num / 1000}K`;
  return num.toString();
};

// Note: SHARE_TEXTS moved to promote/page.tsx to avoid duplication
// Removed unused SHARE_TEXTS - using promote/page.tsx version instead
const SHARE_TEXTS_UNUSED = [
  "Share & Earn $CHESS with AppRank! 🚀",
  "Discover top Farcaster apps on AppRank & earn! ⭐",
  "Web3 rewards await you on AppRank! Join now! 🌐",
  "Play chess, earn $CHESS tokens via AppRank! ♟️",
  "AppRank: Your gateway to Farcaster's best apps! 🎯",
  "Make money sharing on AppRank – it's that easy! 💸",
  "Level up your Web3 game with AppRank rewards! 🎮",
  "AppRank shows you where the alpha is! Don't sleep! 👀",
  "From gaming to DeFi – find it all on AppRank! 🔥",
  "Turn your shares into $CHESS with AppRank! 🏆",
  "AppRank: Where Farcaster meets profit! Let's go! 🚀",
  "Claim your rewards on AppRank! 💰",
  "Don’t miss out – share via AppRank and win!",
  "Earn crypto for sharing on AppRank – tap now!",
  "Get your $CHESS – share this AppRank promo!"
];

export default function PaymentForm({ user, onSuccess, onCancel }: PaymentFormProps) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [castUrl, setCastUrl] = useState("");
  const [shareText, setShareText] = useState(""); // User által látható/szerkeszthető szöveg
  const [rewardPerShare, setRewardPerShare] = useState(rewardOptions[0].toString());
  const [totalBudget, setTotalBudget] = useState(budgetOptions[0].toString());
  
  // Action selection state
  const [selectedAction, setSelectedAction] = useState<'quote' | 'like_recast' | 'comment'>('quote');
  
  // Comment functionality state (only used if ENABLE_COMMENTS is true)
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [customComment, setCustomComment] = useState('');
  const [allowCustomComments, setAllowCustomComments] = useState(true);
  
  // Promoter comment verification state
  const [promoterComment, setPromoterComment] = useState('');
  const [showCommentVerification, setShowCommentVerification] = useState(false);
  
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [error, setError] = useState<string | null>(null);
  
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();

  const { isSuccess: isApproved, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isSuccess: isCreated, isLoading: isCreateConfirming } = useWaitForTransactionReceipt({ hash: createTxHash });

  useEffect(() => {
    if (isApproved) {
      setStep(CreationStep.ReadyToCreate);
    }
  }, [isApproved]);

  useEffect(() => {
    const saveToDb = async () => {
      if (isCreated && step === CreationStep.CreateConfirming) {
        setStep(CreationStep.Saving);
        try {
          // Most már a backendnek nem kell smart contractot hívnia
          const response = await fetch('/api/promotions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fid: user.fid, username: user.username, displayName: user.displayName,
              castUrl: castUrl, 
              shareText: Number(totalBudget) >= 5000000 ? shareText : (shareText ? `${shareText}` : ''), // Premium: reklám nélkül, normál: csak user szöveg
              rewardPerShare: Number(rewardPerShare), totalBudget: Number(totalBudget),
              blockchainHash: createTxHash, // A befizetési tranzakció hash-ét mentjük
              status: 'active',
              actionType: selectedAction, // 'quote' vagy 'like_recast'
              // Comment functionality (only sent if comment action is selected)
              ...(selectedAction === 'comment' && {
                commentTemplates: selectedTemplates,
                customComment: customComment,
                allowCustomComments: allowCustomComments
              })
            }),
          });
          if (!response.ok) throw new Error('Failed to save promotion to the database.');
          
          onSuccess();
        } catch (err: any) {
          setError("On-chain deposit was successful, but saving failed. Please contact support.");
          setStep(CreationStep.ReadyToCreate);
        }
      }
    };
    saveToDb();
  }, [isCreated, step, user, castUrl, shareText, rewardPerShare, totalBudget, createTxHash, onSuccess]);

  // Template kiválasztás kezelése
  const handleTemplateSelect = (template: string) => {
    
    setSelectedTemplates(prev => {
      if (prev.includes(template)) {
        return prev.filter(t => t !== template);
      } else {
        return [...prev, template];
      }
    });
  };

  const handleCommentVerification = () => {
    if (!promoterComment.trim()) {
      setError('Please write a comment to verify the process');
      return;
    }
    setShowCommentVerification(true);
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setError('Comment copied to clipboard! Now paste it as a reply to the post above.');
    } catch (err) {
      setError('Failed to copy to clipboard. Please copy manually.');
    }
  };

  const handleApprove = async () => {
    setError(null);
    if (!totalBudget || !address) {
      setError("Please select a budget and connect your wallet.");
      return;
    }
    
    setStep(CreationStep.Approving);
    try {
      const totalBudgetInWei = parseUnits(totalBudget, 18);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [treasuryDepositAddress, totalBudgetInWei],
      });
      setApproveTxHash(hash);
      setStep(CreationStep.ApproveConfirming);
    } catch (err: any) {
      setError(err.shortMessage || "User rejected the approval transaction.");
      setStep(CreationStep.Idle);
    }
  };

  const handleCreateAndDeposit = async () => {
    setError(null);
    if (!castUrl || Number(rewardPerShare) > Number(totalBudget)) {
      setError("Please fill all fields correctly. Reward cannot be greater than budget.");
      return;
    }

    setStep(CreationStep.Creating);
    try {
        const totalBudgetInWei = parseUnits(totalBudget, 18);
        const hash = await writeContractAsync({
            address: treasuryDepositAddress,
            abi: treasuryDepositABI,
            functionName: 'depositFunds',
            args: [totalBudgetInWei],
        });
        setCreateTxHash(hash);
        setStep(CreationStep.CreateConfirming);
    } catch (err: any) {
        setError(err.shortMessage || "Deposit transaction failed.");
        setStep(CreationStep.ReadyToCreate);
    }
  };

  const isLoading = isPending || isApproveConfirming || isCreateConfirming;
  
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion</h2>
      
      {/* Action Selection Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSelectedAction('quote')}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            selectedAction === 'quote'
              ? 'bg-orange-600 text-white border border-orange-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
          disabled={step >= CreationStep.ReadyToCreate}
        >
          💬 Quote
        </button>
        <button
          type="button"
          onClick={() => setSelectedAction('like_recast')}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            selectedAction === 'like_recast'
              ? 'bg-purple-600 text-white border border-purple-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
          disabled={step >= CreationStep.ReadyToCreate}
        >
          👍 Like & Recast
        </button>
        <button
          type="button"
          onClick={() => setSelectedAction('comment')}
          className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            selectedAction === 'comment'
              ? 'bg-yellow-600 text-white border border-yellow-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
          disabled={step >= CreationStep.ReadyToCreate}
        >
          🚧 Comment (Under Development)
        </button>
      </div>
      
      <div>
        <label htmlFor="castUrl" className="block text-xs font-medium text-slate-400 mb-1">Cast URL*</label>
        <input type="text" id="castUrl" value={castUrl} onChange={(e) => setCastUrl(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-white text-sm focus:border-slate-500 focus:outline-none" disabled={step >= CreationStep.ReadyToCreate} />
      </div>

      {/* Comment Templates Section - Only shown when comment action is selected */}
      {selectedAction === 'comment' && (
        <div>
          <label className="block text-sm font-medium text-purple-300 mb-2">
            <FiMessageSquare className="inline mr-1" />
            Comment Templates (Select up to 3)
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {COMMENT_TEMPLATES.map((template, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                disabled={step >= CreationStep.ReadyToCreate || (selectedTemplates.length >= 3 && !selectedTemplates.includes(template))}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedTemplates.includes(template)
                    ? 'bg-green-600 text-white border border-green-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
                } disabled:bg-gray-800 disabled:cursor-not-allowed`}
              >
                {template}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Selected: {selectedTemplates.length}/3 templates
          </p>
        </div>
      )}

      {/* Promoter Comment Verification Section */}
      {selectedAction === 'comment' && !showCommentVerification && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-300 mb-3">
            🔍 Comment Process Verification
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            To understand how users will comment, please write a test comment below and follow the process:
          </p>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="promoterComment" className="block text-sm font-medium text-yellow-300 mb-1">
                Write your test comment:
              </label>
              <input
                type="text"
                id="promoterComment"
                value={promoterComment}
                onChange={(e) => setPromoterComment(e.target.value)}
                placeholder="e.g., 🚀 This is amazing!"
                className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-white text-sm focus:border-yellow-500 focus:outline-none"
                disabled={step >= CreationStep.ReadyToCreate}
              />
            </div>
            
            <button
              type="button"
              onClick={handleCommentVerification}
              disabled={step >= CreationStep.ReadyToCreate || !promoterComment.trim()}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Test Comment Process
            </button>
          </div>
        </div>
      )}

      {/* Comment Process Demo */}
      {selectedAction === 'comment' && showCommentVerification && (
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-300 mb-3">
            ✅ Comment Process Demo
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            This is how users will comment on your promotion:
          </p>
          
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-sm text-gray-400 mb-2">Your test comment:</p>
              <p className="text-white font-medium">"{promoterComment}"</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-green-300">Step-by-step process:</h4>
              <ol className="text-sm text-gray-300 space-y-1 ml-4">
                <li>1. User clicks "Comment" button</li>
                <li>2. Modal opens with your post preview</li>
                <li>3. User selects from your templates or writes custom</li>
                <li>4. User copies comment to clipboard</li>
                <li>5. User pastes as reply to your post</li>
                <li>6. User clicks "Verify Comment"</li>
                <li>7. You (promoter) or admin approves it</li>
                <li>8. User gets reward after approval</li>
              </ol>
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopyToClipboard(promoterComment)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                📋 Copy Comment to Clipboard
              </button>
              <button
                type="button"
                onClick={() => setShowCommentVerification(false)}
                className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Back to Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Comment Section - Only shown when comment action is selected */}
      {selectedAction === 'comment' && (
        <div>
          <label htmlFor="customComment" className="block text-sm font-medium text-purple-300 mb-1">
            Custom Comment Text (Optional)
          </label>
          <div className="relative">
            <input
              type="text"
              id="customComment"
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Add your custom comment here..."
              className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white pr-10"
              disabled={step >= CreationStep.ReadyToCreate || !allowCustomComments}
              maxLength={280}
            />
            {customComment && (
              <button
                type="button"
                onClick={() => setCustomComment("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                tabIndex={-1}
                aria-label="Clear custom comment"
              >
                <FiX size={18} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="allowCustomComments"
              checked={allowCustomComments}
              onChange={(e) => setAllowCustomComments(e.target.checked)}
              className="rounded"
              disabled={step >= CreationStep.ReadyToCreate}
            />
            <label htmlFor="allowCustomComments" className="text-xs text-gray-400">
              Allow users to add custom comments
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {customComment.length}/280 characters
          </p>
        </div>
      )}

      <div>
        <label htmlFor="shareText" className="block text-sm font-medium text-purple-300 mb-1">Additional Share Text (Optional)</label>
        <div className="relative">
          <input
            type="text"
            id="shareText"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            placeholder="Add your custom message here..."
            className="w-full bg-[#181c23] border border-gray-600 rounded-md py-2 px-3 text-white pr-10"
            disabled={step >= CreationStep.ReadyToCreate}
          />
          {shareText && (
            <button
              type="button"
              onClick={() => setShareText("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              tabIndex={-1}
              aria-label="Clear share text"
            >
              <FiX size={18} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {Number(totalBudget) >= 5000000 ? (
            <>🎉 <span className="text-yellow-400 font-semibold">PREMIUM:</span> No promotional message! Your text only.</>
          ) : (
            <>💡 We'll automatically add an AppRank promotional message. Your text will appear after it.</>
          )}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Reward / Share ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {rewardOptions.map((amount) => (
            <button key={amount} onClick={() => setRewardPerShare(amount.toString())} disabled={step >= CreationStep.ReadyToCreate} className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${rewardPerShare === amount.toString() ? "bg-green-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800"}`}>
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-purple-300 mb-1">Total Budget ($CHESS)*</label>
        <div className="grid grid-cols-5 gap-2">
          {budgetOptions.map((amount) => (
            <button key={amount} onClick={() => setTotalBudget(amount.toString())} disabled={step >= CreationStep.ReadyToCreate} className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm relative ${totalBudget === amount.toString() ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800"}`}>
              {formatNumber(amount)}
              {amount >= 5000000 && (
                <span className="absolute -top-1 -right-1 text-xs bg-yellow-500 text-black px-1 rounded-full font-bold">👑</span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          👑 5M+ $CHESS = Premium (no promotional messages)
        </p>
      </div>

      {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
      
      <div className="flex items-center gap-4 pt-4">
        <button onClick={onCancel} disabled={isLoading} className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">Cancel</button>
        
        {step < CreationStep.ReadyToCreate ? (
            <button onClick={handleApprove} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isApproveConfirming ? 'Confirming Approval...' : isPending ? 'Check Wallet...' : '1. Approve Budget'}
            </button>
        ) : (
            <button onClick={handleCreateAndDeposit} disabled={isLoading || !address} className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50">
                {isCreateConfirming ? 'Confirming Deposit...' : isPending ? 'Check Wallet...' : '2. Create & Deposit'}
            </button>
        )}
      </div>
    </div>
  );
}