// Lucky Box Component - Reward system for promoters
'use client';

import { useState } from 'react';

interface LuckyBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (amount: number) => void;
  isPreview?: boolean; // Preview mode - no real rewards
}

export default function LuckyBox({ isOpen, onClose, onClaim, isPreview = false }: LuckyBoxProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Lucky Box reward calculation with weighted probabilities
  const calculateReward = (): number => {
    const random = Math.random();
    
    // Weighted probability system
    if (random < 0.40) return Math.floor(Math.random() * 10) + 1;        // 40% chance: 1-10 CHESS
    if (random < 0.70) return Math.floor(Math.random() * 40) + 11;       // 30% chance: 11-50 CHESS  
    if (random < 0.85) return Math.floor(Math.random() * 100) + 51;      // 15% chance: 51-150 CHESS
    if (random < 0.95) return Math.floor(Math.random() * 350) + 151;     // 10% chance: 151-500 CHESS
    if (random < 0.99) return Math.floor(Math.random() * 1500) + 501;    // 4% chance: 501-2000 CHESS
    return Math.floor(Math.random() * 8000) + 2001;                      // 1% chance: 2001-10000 CHESS
  };

  const handleOpenBox = async () => {
    setIsOpening(true);
    setIsAnimating(true);
    
    // Animation delay
    setTimeout(() => {
      const rewardAmount = calculateReward();
      setReward(rewardAmount);
      setIsAnimating(false);
      
      // Auto-claim after showing reward
      setTimeout(() => {
        onClaim(rewardAmount);
        handleClose();
      }, 3000);
    }, 2000);
  };

  const handleClose = () => {
    setIsOpening(false);
    setReward(null);
    setIsAnimating(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            🎁 {isPreview ? 'Lucky Box Preview!' : 'Lucky Box Reward!'}
          </h2>
          <p className="text-purple-200 text-sm">
            {isPreview ? (
              <>
                See what rewards await you!
                <br />Create campaigns to earn real rewards!
              </>
            ) : (
              <>
                Congratulations on creating a promotion! 
                <br />Open your reward box!
              </>
            )}
          </p>
        </div>

        {/* Lucky Box Animation */}
        <div className="flex justify-center mb-6">
          {!isOpening ? (
            // Unopened box
            <div className="relative">
              <div className="text-8xl animate-bounce cursor-pointer hover:scale-110 transition-transform duration-300"
                   onClick={handleOpenBox}>
                🎁
              </div>
              <div className="absolute -top-2 -right-2 text-2xl animate-pulse">✨</div>
              <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse">💎</div>
            </div>
          ) : isAnimating ? (
            // Opening animation
            <div className="relative">
              <div className="text-8xl animate-spin">📦</div>
              <div className="absolute inset-0 text-6xl animate-ping">💥</div>
              <div className="text-center mt-4">
                <div className="text-yellow-300 animate-pulse">Opening...</div>
              </div>
            </div>
          ) : (
            // Reward revealed
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">💰</div>
              <div className="text-4xl font-bold text-yellow-300 mb-2 animate-pulse">
                {reward?.toLocaleString()} CHESS
              </div>
              <div className={`text-sm ${isPreview ? 'text-orange-300' : 'text-green-300'}`}>
                {isPreview ? 'Preview reward - Create campaigns for real rewards!' : 'Added to your balance!'}
              </div>
            </div>
          )}
        </div>

        {/* Probability Info */}
        {!isOpening && (
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <div className="text-xs text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>🎯 Common (40%)</span>
                <span>1-10 CHESS</span>
              </div>
              <div className="flex justify-between">
                <span>⭐ Uncommon (30%)</span>
                <span>11-50 CHESS</span>
              </div>
              <div className="flex justify-between">
                <span>💎 Rare (15%)</span>
                <span>51-150 CHESS</span>
              </div>
              <div className="flex justify-between">
                <span>🏆 Epic (10%)</span>
                <span>151-500 CHESS</span>
              </div>
              <div className="flex justify-between">
                <span>👑 Legendary (4%)</span>
                <span>501-2K CHESS</span>
              </div>
              <div className="flex justify-between">
                <span>🌟 Mythic (1%)</span>
                <span>2K-10K CHESS</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isOpening ? (
            <>
              <button
                onClick={handleOpenBox}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                🎁 {isPreview ? 'Preview Lucky Box' : 'Open Lucky Box'}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all duration-300"
              >
                Later
              </button>
            </>
          ) : reward ? (
            <button
              onClick={() => {
                if (!isPreview) {
                  onClaim(reward);
                }
                handleClose();
              }}
              className={`w-full font-bold py-3 px-6 rounded-lg transition-all duration-300 ${
                isPreview 
                  ? 'bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
              } text-white`}
            >
              {isPreview ? '👀 Preview Complete' : '🎉 Claim Reward'}
            </button>
          ) : (
            <div className="w-full text-center py-3 text-purple-200">
              Opening your lucky box...
            </div>
          )}
        </div>

        {/* Fun Facts */}
        {!isOpening && (
          <div className="mt-4 text-center text-xs text-gray-400">
            💡 {isPreview 
              ? 'Create your first campaign to earn real Lucky Box rewards!' 
              : 'Tip: Create more promotions to earn more Lucky Boxes!'
            }
          </div>
        )}
      </div>
    </div>
  );
}