"use client"

import { useState, useEffect } from 'react';
import { FiClock, FiUser, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';

interface PendingFollow {
  id: number;
  promotion_id: number;
  user_fid: number;
  username: string;
  target_username: string;
  target_user_fid: string;
  reward_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  review_notes?: string;
}

interface PendingFollowsManagerProps {
  promoterFid: number;
}

export default function PendingFollowsManager({ promoterFid }: PendingFollowsManagerProps) {
  const [pendingFollows, setPendingFollows] = useState<PendingFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingFollows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pending-follows?promoterFid=${promoterFid}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending follows');
      }
      
      const data = await response.json();
      setPendingFollows(data.pendingFollows || []);
    } catch (err: any) {
      console.error('Error fetching pending follows:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (followId: number) => {
    try {
      const response = await fetch('/api/admin/approve-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingFollowId: followId,
          action: 'approve',
          adminFid: promoterFid,
          reviewNotes: 'Approved by promoter'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve follow');
      }

      // Refresh the list
      await fetchPendingFollows();
    } catch (err: any) {
      console.error('Error approving follow:', err);
      setError(err.message);
    }
  };

  const handleReject = async (followId: number) => {
    try {
      const response = await fetch('/api/admin/approve-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pendingFollowId: followId,
          action: 'reject',
          adminFid: promoterFid,
          reviewNotes: 'Rejected by promoter'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject follow');
      }

      // Refresh the list
      await fetchPendingFollows();
    } catch (err: any) {
      console.error('Error rejecting follow:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPendingFollows();
  }, [promoterFid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <FiRefreshCw className="animate-spin text-yellow-400" />
        <span className="ml-2 text-yellow-200">Loading pending follows...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
        <div className="text-red-400 text-center">{error}</div>
        <button
          onClick={fetchPendingFollows}
          className="mt-2 w-full px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pendingFollows.length === 0) {
    return (
      <div className="p-4 bg-gray-800/50 border border-gray-600/50 rounded-lg">
        <div className="text-gray-400 text-center">No pending follows</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingFollows.map((follow) => (
        <div key={follow.id} className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FiUser className="text-pink-400" />
                <span className="text-white font-medium">{follow.username}</span>
                <span className="text-gray-400">→</span>
                <span className="text-pink-300">@{follow.target_username}</span>
              </div>
              <div className="text-sm text-gray-400">
                Reward: <span className="text-green-400 font-semibold">{follow.reward_amount} $CHESS</span>
              </div>
              <div className="text-xs text-gray-500">
                Submitted: {new Date(follow.submitted_at).toLocaleString()}
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              follow.status === 'pending' ? 'bg-yellow-600 text-white' :
              follow.status === 'approved' ? 'bg-green-600 text-white' :
              'bg-red-600 text-white'
            }`}>
              {follow.status}
            </span>
          </div>

          {follow.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(follow.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                <FiCheck size={14} />
                Approve
              </button>
              <button
                onClick={() => handleReject(follow.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                <FiX size={14} />
                Reject
              </button>
            </div>
          )}

          {follow.review_notes && (
            <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs text-gray-300">
              <strong>Notes:</strong> {follow.review_notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
