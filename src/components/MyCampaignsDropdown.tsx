"use client"

import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiSettings, FiUsers, FiTrendingUp, FiDollarSign, FiActivity, FiX, FiStar } from 'react-icons/fi';
import { PromoCast } from '@/types/promotions';

interface MyCampaignsDropdownProps {
  myPromos: PromoCast[];
  onManageClick: (promo: PromoCast) => void;
  onDeleteClick?: (promo: PromoCast) => void;
}

// Helper függvény a progress bar kiszámításához
const calculateProgress = (promo: PromoCast): number => {
  if (promo.totalBudget === 0) {
    return 0;
  }
  const spent = promo.totalBudget - promo.remainingBudget;
  return Math.round((spent / promo.totalBudget) * 100);
};

export default function MyCampaignsDropdown({ myPromos, onManageClick, onDeleteClick }: MyCampaignsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Rendezés: még osztható active kampányok elöl, majd nem osztható active, paused, inactive, completed
  const sortedPromos = [...myPromos].sort((a, b) => {
    const statusOrder = { active: 1, paused: 2, inactive: 3, completed: 4 };
    const aIsShareable = a.status === 'active' && a.remainingBudget >= a.rewardPerShare;
    const bIsShareable = b.status === 'active' && b.remainingBudget >= b.rewardPerShare;
    if (aIsShareable === bIsShareable) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return aIsShareable ? -1 : 1;
  });

  if (sortedPromos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center p-4 text-left text-white font-semibold text-lg hover:bg-[#2a2f42] transition-colors"
      >
        <FiStar className="text-purple-300 w-6" />
        <span className="flex-1 text-center">My Campaigns ({sortedPromos.length})</span>
        <div className="w-6">{isOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-700">
          <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
            {sortedPromos.map((promo) => (
              <div key={promo.id} className="bg-[#181c23] p-4 rounded-lg border border-gray-700">
                {/* Felső szekció: Cast URL és Státusz */}
                <div className="flex justify-between items-start mb-3">
                  <a
                    href={promo.castUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-medium truncate pr-4 hover:text-purple-300 transition-colors"
                    title={promo.castUrl}
                  >
                    {promo.castUrl}
                  </a>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                    promo.status === "active" ? "bg-green-600 text-white" :
                    promo.status === "paused" ? "bg-yellow-600 text-white" :
                    promo.status === "inactive" ? "bg-blue-600 text-white" :
                    promo.status === "completed" ? "bg-gray-500 text-white" :
                    "bg-gray-600 text-white"
                  }`}>
                    {promo.status === 'inactive' ? 'Needs Funding' : promo.status}
                  </span>
                </div>

                {/* Statisztikai blokkok (2x2 rács) */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-white">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiUsers className="text-blue-400" />
                      <span className="font-semibold">{promo.sharesCount}</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Total Shares</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiDollarSign className="text-green-400" />
                      <span className="font-semibold">{promo.rewardPerShare}</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Reward/Share</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiTrendingUp className="text-purple-400" />
                      <span className="font-semibold">{promo.remainingBudget}</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Remaining</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <FiActivity className="text-gray-300" />
                      <span className="font-semibold">{promo.totalBudget}</span>
                    </div>
                    <p className="text-xs text-gray-400 text-center">Total Budget</p>
                  </div>
                </div>

                {/* Progress bar a folyamat vizualizálásához */}
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2.5 rounded-full"
                    style={{ width: `${calculateProgress(promo)}%` }}
                  ></div>
                </div>

                {/* "Manage" gomb, csak ha nem completed */}
                {promo.status !== "completed" && (
                  <button
                    onClick={() => onManageClick(promo)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <FiSettings />
                    Manage Campaign (Start / Pause)
                  </button>
                )}

                {/* "Delete" gomb minden kampányhoz, ha onDeleteClick definiálva van */}
                {onDeleteClick && (
                  <button
                    onClick={() => onDeleteClick(promo)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <FiX />
                    Delete Campaign
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}