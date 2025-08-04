
"use client"

import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiUsers, FiTrendingUp, FiDollarSign, FiActivity } from 'react-icons/fi';
import { PromoCast } from '@/types/promotions';

interface MyCampaignsDropdownProps {
  myPromos: PromoCast[];
  onManageClick: (promo: PromoCast) => void;
}

// Helper függvény a progress bar kiszámításához
const calculateProgress = (promo: PromoCast): number => {
  if (promo.totalBudget === 0) {
    return 0;
  }
  const spent = promo.totalBudget - promo.remainingBudget;
  return Math.round((spent / promo.totalBudget) * 100);
};

export default function MyCampaignsDropdown({ myPromos, onManageClick }: MyCampaignsDropdownProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (myPromos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 bg-[#23283a] rounded-2xl border border-[#a64d79] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center p-4 text-left text-white font-semibold text-lg hover:bg-[#2a2f42] transition-colors"
      >
        <div className="w-6"></div> {/* Üres div a szimmetriáért */}
        <span className="flex-1 text-center">My Campaigns ({myPromos.length})</span>
        <div className="w-6">{isOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-gray-700">
          <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
            {myPromos.map((promo) => (
              <div key={promo.id} className="bg-[#181c23] p-4 rounded-lg border border-gray-700">
                
                {/* Felső szekció: Cast URL és Státusz */}
                <div className="flex justify-between items-start mb-3">
                  <p className="text-white font-medium truncate pr-4">{promo.castUrl}</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
                      promo.status === "active" ? "bg-green-600 text-white" :
                      promo.status === "paused" ? "bg-yellow-600 text-white" :
                      promo.status === "inactive" ? "bg-blue-600 text-white" :
                      "bg-gray-600 text-white"
                    }`}>
                    {promo.status === 'inactive' ? 'Needs Funding' : promo.status}
                  </span>
                </div>

                {/* Szimmetrikus statisztikai blokkok (2x2 rács) */}
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

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
