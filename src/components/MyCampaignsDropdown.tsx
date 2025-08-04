"use client"

import { useState } from 'react';
import { FiChevronDown, FiChevronUp, FiSettings } from 'react-icons/fi';
import { PromoCast } from '@/types/promotions';

interface MyCampaignsDropdownProps {
  myPromos: PromoCast[];
  onManageClick: (promo: PromoCast) => void;
}

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
          <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
            {myPromos.map((promo) => (
              <div key={promo.id} className="bg-[#181c23] p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="truncate text-white font-medium">{promo.castUrl}</p>
                    <span className={`text-xs capitalize font-bold ${
                      promo.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      Status: {promo.status === 'inactive' ? 'Funding Needed' : promo.status}
                    </span>
                  </div>
                  <button
                    onClick={() => onManageClick(promo)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                  >
                    <FiSettings />
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}