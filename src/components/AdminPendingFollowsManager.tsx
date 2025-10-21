"use client"

import { useState, useEffect } from 'react';
import { FiUsers, FiCheck, FiX, FiRefreshCw, FiClock, FiCheckSquare, FiSquare } from 'react-icons/fi';

interface PendingFollow {
  id: number;
  promotion_id: number;
  user_fid: number;
  username: string;
  target_username: string;
  target_user_fid: string;
  reward_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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
  const [selectedFollows, setSelectedFollows] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

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

  // Bulk operations
  const toggleFollowSelection = (followId: number) => {
    const newSelected = new Set(selectedFollows);
    if (newSelected.has(followId)) {
      newSelected.delete(followId);
    } else {
      newSelected.add(followId);
    }
    setSelectedFollows(newSelected);
  };

  const selectAllFollows = () => {
    setSelectedFollows(new Set(pendingFollows.map(follow => follow.id)));
  };

  const clearSelection = () => {
    setSelectedFollows(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedFollows.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedFollows).map(followId => 
        fetch('/api/admin/approve-follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pendingFollowId: followId,
            action: 'approve',
            adminFid: 1,
            reviewNotes: 'Bulk approved by admin'
          })
        })
      );

      await Promise.all(promises);
      
      // Refresh the list
      await fetchPendingFollows();
      setSelectedFollows(new Set());
    } catch (err: any) {
      console.error('Bulk approve error:', err);
      setError(err.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedFollows.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedFollows).map(followId => 
        fetch('/api/admin/approve-follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pendingFollowId: followId,
            action: 'reject',
            adminFid: 1,
            reviewNotes: 'Bulk rejected by admin'
          })
        })
      );

      await Promise.all(promises);
      
      // Refresh the list
      await fetchPendingFollows();
      setSelectedFollows(new Set());
    } catch (err: any) {
      console.error('Bulk reject error:', err);
      setError(err.message);
    } finally {
      setBulkActionLoading(false);
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
      {/* Header with count and bulk actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-gray-300">
            <span className="text-lg font-bold text-purple-400">{pendingFollows.length}</span> pending follow{pendingFollows.length !== 1 ? 's' : ''}
          </div>
          {selectedFollows.size > 0 && (
            <div className="text-sm text-yellow-400">
              {selectedFollows.size} selected
            </div>
          )}
        </div>
        <button
          onClick={fetchPendingFollows}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {/* Bulk Actions */}
      {pendingFollows.length > 0 && (
        <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectedFollows.size === pendingFollows.length ? clearSelection : selectAllFollows}
                  className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
                >
                  {selectedFollows.size === pendingFollows.length ? (
                    <FiCheckSquare className="text-purple-400" size={20} />
                  ) : (
                    <FiSquare className="text-gray-400" size={20} />
                  )}
                  <span className="text-sm">
                    {selectedFollows.size === pendingFollows.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
              </div>
              {selectedFollows.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {selectedFollows.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                >
                  <FiCheck size={12} />
                  Approve ({selectedFollows.size})
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                >
                  <FiX size={12} />
                  Reject ({selectedFollows.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Follow List */}
      <div className="space-y-2">
        {pendingFollows.map((follow) => (
          <div key={follow.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-3">
            <div className="flex items-center gap-3">
              {/* Checkbox */}
              <button
                onClick={() => toggleFollowSelection(follow.id)}
                className="flex items-center justify-center"
              >
                {selectedFollows.has(follow.id) ? (
                  <FiCheckSquare className="text-purple-400" size={18} />
                ) : (
                  <FiSquare className="text-gray-400" size={18} />
                )}
              </button>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FiUsers className="text-pink-400" size={14} />
                  <span className="text-white font-medium text-sm">{follow.username}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-pink-300 font-medium text-sm">@{follow.target_username}</span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Campaign #{follow.promotion_id}</span>
                  <span className="text-green-400 font-semibold">{follow.reward_amount} CHESS</span>
                  <span>{new Date(follow.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  follow.status === 'pending' ? 'bg-yellow-600 text-white' :
                  follow.status === 'approved' ? 'bg-green-600 text-white' :
                  'bg-red-600 text-white'
                }`}>
                  {follow.status}
                </span>

                {/* Individual Actions */}
                {follow.status === 'pending' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleApprove(follow.id)}
                      className="p-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      title="Approve"
                    >
                      <FiCheck size={12} />
                    </button>
                    <button
                      onClick={() => handleReject(follow.id)}
                      className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      title="Reject"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign URL (collapsible) */}
            <div className="mt-2 ml-8">
              <details className="text-xs">
                <summary className="text-purple-300 cursor-pointer hover:text-purple-200">
                  View Campaign URL
                </summary>
                <div className="mt-1 p-2 bg-gray-700/50 rounded text-blue-400 break-all">
                  {follow.cast_url}
                </div>
              </details>
            </div>

            {/* Admin Notes */}
            {follow.review_notes && (
              <div className="mt-2 ml-8 p-2 bg-gray-700/50 rounded text-xs text-gray-300">
                <strong>Admin Notes:</strong> {follow.review_notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
