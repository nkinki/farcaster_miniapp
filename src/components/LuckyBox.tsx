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

  // Lucky Box reward calculation - Simplified with higher amounts
  const calculateReward = (): number => {
    const random = Math.random();
    
    // Simplified probability system - minimum 500 CHESS
    if (random < 0.60) return Math.floor(Math.random() * 1000) + 500;    // 60% chance: 500-1500 CHESS
    if (random < 0.85) return Math.floor(Math.random() * 2500) + 1500;   // 25% chance: 1500-4000 CHESS
    return Math.floor(Math.random() * 6000) + 4000;                      // 15% chance: 4000-10000 CHESS
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
      <div className="bg-[#23283a] border border-[#a64d79] rounded-2xl p-8 max-w-md w-full shadow-2xl pulse-glow">
        
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            🎁 {isPreview ? 'Lucky Box Preview!' : 'Lucky Box Reward!'}
          </h2>
          <p className="text-gray-300 text-sm">
            {isPreview ? (
              <>
                See what rewards await you!
                <br />Create campaigns to earn real rewards!
                <br /><span className="text-orange-400 font-semibold">🎯 Coming Soon</span>
              </>
            ) : (
              <>
                Congratulations on creating a promotion! 
                <br />Open your reward box!
                <br /><span className="text-orange-400 font-semibold">🎯 Coming Soon</span>
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

        {/* Simple Info */}
        {!isOpening && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="text-center text-gray-300">
              <div className="text-lg font-bold text-yellow-300 mb-2">
                500 - 10,000 CHESS
              </div>
              <div className="text-sm">
                Every campaign creation = Lucky Box reward!
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
                className="flex-1 bg-[#23283a] border border-[#a64d79] hover:bg-[#2a2f42] text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                🎁 {isPreview ? 'Preview Lucky Box' : 'Open Lucky Box'}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg border border-gray-500/30 transition-all duration-300"
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
              className={`w-full font-bold py-3 px-6 rounded-lg border transition-all duration-300 text-white ${
                isPreview 
                  ? 'bg-[#23283a] border-orange-500 hover:bg-[#2a2f42]' 
                  : 'bg-[#23283a] border-green-500 hover:bg-[#2a2f42]'
              }`}
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