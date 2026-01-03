"use client"

import { useState } from "react";
import { FiPlay, FiPause, FiX, FiLoader, FiCheck } from "react-icons/fi";
import { PromoCast } from "@/types/promotions";

interface CampaignManagerProps {
  promotionId: string | number;
  currentStatus: string;
  castUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDeleteClick?: (promo: PromoCast) => void;
}

export default function CampaignManager({
  promotionId,
  currentStatus,
  castUrl,
  onSuccess,
  onCancel,
  onDeleteClick
}: CampaignManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: 'active' | 'paused') => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/promotions/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promotionId: Number(promotionId),
          status: newStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update campaign status');
      }

      setSuccess(`Campaign ${newStatus === 'active' ? 'started' : 'paused'} successfully!`);

      // After a short delay, we close the modal and refresh the data
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Status change error:', err);
      setError(err.message || 'An error occurred while updating the campaign status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (onDeleteClick && window.confirm(`Are you sure you want to delete the campaign "${castUrl}"? This action cannot be undone.`)) {
      const promo: PromoCast = {
        id: Number(promotionId),
        castUrl,
        status: currentStatus,
        // Minimal PromoCast object, as only id and castUrl are needed for deletion
      } as PromoCast;
      onDeleteClick(promo);
    }
  };

  const canStart = currentStatus === 'paused' || currentStatus === 'inactive';
  const canPause = currentStatus === 'active';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] max-w-md w-full pulse-glow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Manage Campaign</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Campaign URL:</p>
          <p className="text-white font-medium truncate">{castUrl}</p>
          <p className="text-gray-400 text-sm mt-2">
            Current Status: <span className={`font-semibold ${currentStatus === 'active' ? 'text-green-400' :
                currentStatus === 'paused' ? 'text-yellow-400' :
                  'text-red-400'
              }`}>
              {currentStatus === 'inactive' ? 'Needs Funding' : currentStatus}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded-lg flex items-center gap-2">
            <FiX className="text-red-400" />
            <span className="text-red-200 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-600 rounded-lg flex items-center gap-2">
            <FiCheck className="text-green-400" />
            <span className="text-green-200 text-sm">{success}</span>
          </div>
        )}

        <div className="space-y-3">
          {canStart && (
            <button
              onClick={() => handleStatusChange('active')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <FiLoader className="animate-spin" /> : <FiPlay />}
              Start Campaign
            </button>
          )}

          {canPause && (
            <button
              onClick={() => handleStatusChange('paused')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <FiLoader className="animate-spin" /> : <FiPause />}
              Pause Campaign
            </button>
          )}

          {onDeleteClick && (
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiX />
              Delete Campaign
            </button>
          )}

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}