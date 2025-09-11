"use client"

import { useState, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, useReadContract, useWriteContract } from 'wagmi';
import { type Hash } from 'viem';
import { CHESS_TOKEN_ADDRESS, CHESS_TOKEN_ABI } from '@/abis/chessToken';
import { FiX, FiDollarSign, FiClock, FiUsers, FiTrendingUp, FiZap, FiMessageSquare } from 'react-icons/fi';

// --- Interface definíciók ---
interface User {
  fid: number;
  username: string;
  displayName?: string;
}

interface PaymentFormWithCommentsProps {
  user: User;
  onSuccess: (promotion: any) => void;
  onCancel: () => void;
}

// Állapotgép a vásárlási folyamathoz
enum CreationStep {
  Idle,
  Approving,
  ApproveConfirming,
  ReadyToCreate,
  Creating,
  CreateConfirming,
  Saving,
  Success
}

// Előre elkészített szöveg sablonok
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
  "💪 This is the way!"
];

export default function PaymentFormWithComments({ user, onSuccess, onCancel }: PaymentFormWithCommentsProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  // --- Állapotok ---
  const [step, setStep] = useState<CreationStep>(CreationStep.Idle);
  const [castUrl, setCastUrl] = useState('');
  const [shareText, setShareText] = useState('');
  const [rewardPerShare, setRewardPerShare] = useState('1000');
  const [totalBudget, setTotalBudget] = useState('10000');
  const [selectedAction, setSelectedAction] = useState<'quote' | 'like_recast' | 'comment'>('quote');
  
  // Új comment állapotok
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [customComment, setCustomComment] = useState('');
  const [allowCustomComments, setAllowCustomComments] = useState(true);
  
  const [approveTxHash, setApproveTxHash] = useState<Hash | undefined>();
  const [createTxHash, setCreateTxHash] = useState<Hash | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isLoading: isApproveConfirming, isSuccess: isApproved } = useWaitForTransactionReceipt({ hash: approveTxHash });
  const { isLoading: isCreateConfirming, isSuccess: isCreated } = useWaitForTransactionReceipt({ hash: createTxHash });

  // Reward opciók
  const rewardOptions = [1000, 2000, 5000, 10000, 20000];
  const budgetOptions = [10000, 25000, 50000, 100000, 250000, 500000, 1000000, 5000000];

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

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

  // Approve kezelése
  const handleApprove = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    setErrorMessage(null);
    setStep(CreationStep.Approving);

    try {
      const totalCost = BigInt(totalBudget);
      const hash = await writeContractAsync({
        address: CHESS_TOKEN_ADDRESS,
        abi: CHESS_TOKEN_ABI,
        functionName: 'approve',
        args: [address, totalCost], // Self-approve for promotion creation
        gas: BigInt(100000),
      });
      setApproveTxHash(hash);
      setStep(CreationStep.ApproveConfirming);
    } catch (err: any) {
      setErrorMessage(err.shortMessage || "Approval rejected.");
      setStep(CreationStep.Idle);
    }
  };

  // Promotion létrehozás kezelése
  const handleCreatePromotion = async () => {
    if (!isConnected || !address) {
      setErrorMessage('Please connect your wallet first');
      return;
    }

    setErrorMessage(null);
    setStep(CreationStep.Creating);

    try {
      // Itt fogjuk a comment adatokat is elküldeni
      const promotionData = {
        fid: user.fid,
        username: user.username,
        displayName: user.displayName,
        castUrl,
        shareText,
        rewardPerShare: parseInt(rewardPerShare),
        totalBudget: parseInt(totalBudget),
        actionType: selectedAction,
        // Új comment mezők - csak akkor küldjük, ha comment action van kiválasztva
        ...(selectedAction === 'comment' && {
          commentTemplates: selectedTemplates,
          customComment,
          allowCustomComments
        })
      };

      const response = await fetch('/api/promotions-with-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promotionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create promotion');
      }

      const result = await response.json();
      setStep(CreationStep.Success);
      onSuccess(result.promotion);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create promotion");
      setStep(CreationStep.Idle);
    }
  };

  // Approve állapot figyelése
  useEffect(() => {
    if (isApproved && step === CreationStep.ApproveConfirming) {
      setStep(CreationStep.ReadyToCreate);
      setApproveTxHash(undefined);
    }
  }, [isApproved, step]);

  const isLoading = isPending || isApproveConfirming || isCreateConfirming || step === CreationStep.Saving;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Create a New Promotion with Comments</h2>
      
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
              ? 'bg-green-600 text-white border border-green-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
          }`}
          disabled={step >= CreationStep.ReadyToCreate}
        >
          💬 Comment
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

      {/* Meglévő Share Text (opcionális) */}
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
        <div className="grid grid-cols-4 gap-2">
          {budgetOptions.map((amount) => (
            <button key={amount} onClick={() => setTotalBudget(amount.toString())} disabled={step >= CreationStep.ReadyToCreate} className={`px-3 py-2 rounded-lg font-medium transition-colors text-sm ${totalBudget === amount.toString() ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800"}`}>
              {formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm text-center">
          {errorMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          disabled={isLoading}
        >
          Cancel
        </button>
        
        {step < CreationStep.ReadyToCreate ? (
          <button
            onClick={handleApprove}
            disabled={isLoading || !isConnected || !castUrl || !rewardPerShare || !totalBudget}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isApproveConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : 'Approve & Create Promotion'}
          </button>
        ) : (
          <button
            onClick={handleCreatePromotion}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isCreateConfirming ? 'Confirming...' : isPending ? 'Check Wallet...' : 'Create Promotion'}
          </button>
        )}
      </div>

      {/* Status Display */}
      {step > CreationStep.Idle && (
        <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="text-sm text-blue-300">
            {step === CreationStep.Approving && "⏳ Approving tokens..."}
            {step === CreationStep.ApproveConfirming && "⏳ Confirming approval..."}
            {step === CreationStep.ReadyToCreate && "✅ Ready to create promotion!"}
            {step === CreationStep.Creating && "⏳ Creating promotion..."}
            {step === CreationStep.CreateConfirming && "⏳ Confirming creation..."}
            {step === CreationStep.Success && "🎉 Promotion created successfully!"}
          </div>
        </div>
      )}
    </div>
  );
}
