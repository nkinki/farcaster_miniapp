"use client"

import { useState, useEffect } from 'react';
import { FiUsers, FiCheck, FiX, FiRefreshCw, FiClock } from 'react-icons/fi';

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
  cast_url: string;
  share_text: string;
  reward_per_share: number;
}

export default function AdminPendingFollowsManager() {
  const [pendingFollows, setPendingFollows] = useState<PendingFollow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingFollows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/all-pending-follows');
      
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
          adminFid: 1, // Admin FID
          reviewNotes: 'Approved by admin'
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
          adminFid: 1, // Admin FID
          reviewNotes: 'Rejected by admin'
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FiRefreshCw className="animate-spin text-purple-400" />
        <span className="ml-2 text-purple-200">Loading pending follows...</span>
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
      <div className="p-8 bg-gray-800/50 border border-gray-600/50 rounded-lg text-center">
        <FiUsers className="mx-auto text-gray-400 mb-2" size={48} />
        <div className="text-gray-400 text-lg">No pending follows</div>
        <div className="text-gray-500 text-sm">All follow submissions have been processed</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-gray-300">
          {pendingFollows.length} pending follow{pendingFollows.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={fetchPendingFollows}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {pendingFollows.map((follow) => (
        <div key={follow.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FiUsers className="text-pink-400" />
                <span className="text-white font-medium text-lg">{follow.username}</span>
                <span className="text-gray-400">→</span>
                <span className="text-pink-300 font-medium">@{follow.target_username}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <div className="text-purple-300 text-xs font-semibold">Campaign ID</div>
                  <div className="text-white">#{follow.promotion_id}</div>
                </div>
                <div>
                  <div className="text-purple-300 text-xs font-semibold">Reward Amount</div>
                  <div className="text-green-400 font-bold">{follow.reward_amount} $CHESS</div>
                </div>
                <div>
                  <div className="text-purple-300 text-xs font-semibold">Submitted</div>
                  <div className="text-gray-300">{new Date(follow.submitted_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-purple-300 text-xs font-semibold mb-1">Campaign URL</div>
                <div className="text-blue-400 text-sm break-all">{follow.cast_url}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  follow.status === 'pending' ? 'bg-yellow-600 text-white' :
                  follow.status === 'approved' ? 'bg-green-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {follow.status}
                </span>
                {follow.reviewed_at && (
                  <span className="text-gray-400 text-xs">
                    Reviewed: {new Date(follow.reviewed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {follow.status === 'pending' && (
            <div className="flex gap-3 pt-4 border-t border-gray-600">
              <button
                onClick={() => handleApprove(follow.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FiCheck size={16} />
                Approve Follow
              </button>
              <button
                onClick={() => handleReject(follow.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <FiX size={16} />
                Reject Follow
              </button>
            </div>
          )}

          {follow.review_notes && (
            <div className="mt-3 p-3 bg-gray-700/50 rounded text-sm text-gray-300">
              <strong>Admin Notes:</strong> {follow.review_notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
