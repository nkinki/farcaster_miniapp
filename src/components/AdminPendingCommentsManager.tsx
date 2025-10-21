"use client"

import { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiExternalLink, FiUser, FiMessageSquare, FiDollarSign, FiAlertTriangle, FiLoader, FiCheckSquare, FiSquare, FiRefreshCw } from 'react-icons/fi';
import { useProfile } from '@farcaster/auth-kit';

interface PendingComment {
  id: number;
  promotion_id: number;
  user_fid: number;
  username: string;
  comment_text: string;
  cast_hash: string;
  reward_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  promotion_cast_url: string;
  promotion_share_text: string;
  promoter_username: string;
  promoter_display_name: string;
  promoter_fid: number;
}

export default function AdminPendingCommentsManager() {
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const { profile: fcProfile } = useProfile();

  const fetchPendingComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/all-pending-comments');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending comments');
      }
      setPendingComments(data.pendingComments);
    } catch (err: any) {
      console.error('Error fetching pending comments:', err);
      setError(err.message || 'Failed to load pending comments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingComments();
    const interval = setInterval(fetchPendingComments, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPendingComments]);

  const handleAction = async (commentId: number, action: 'approve' | 'reject', rejectionReason?: string) => {
    console.log('🔍 AdminPendingCommentsManager handleAction:', {
      commentId,
      action,
      fcProfile,
      fid: fcProfile?.fid
    });

    setProcessingId(commentId);
    setError(null);
    try {
      const response = await fetch('/api/admin/approve-comment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'admin-key-123' // Admin key for approval
        },
        body: JSON.stringify({
          pendingCommentId: commentId,
          action,
          adminFid: fcProfile?.fid || 0, // Fallback to 0 if fid is not available
          reviewNotes: rejectionReason
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} comment`);
      }

      // Remove the processed comment from the list
      setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
      console.log(`Comment ${commentId} ${action}d successfully.`);

    } catch (err: any) {
      console.error(`Error ${action}ing comment:`, err);
      setError(err.message || `Failed to ${action} comment.`);
    } finally {
      setProcessingId(null);
    }
  };

  // Bulk operations
  const toggleCommentSelection = (commentId: number) => {
    const newSelected = new Set(selectedComments);
    if (newSelected.has(commentId)) {
      newSelected.delete(commentId);
    } else {
      newSelected.add(commentId);
    }
    setSelectedComments(newSelected);
  };

  const selectAllComments = () => {
    setSelectedComments(new Set(pendingComments.map(comment => comment.id)));
  };

  const clearSelection = () => {
    setSelectedComments(new Set());
  };

  const handleBulkApprove = async () => {
    if (selectedComments.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedComments).map(commentId => 
        fetch('/api/admin/approve-comment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': 'admin-key-123'
          },
          body: JSON.stringify({
            pendingCommentId: commentId,
            action: 'approve',
            adminFid: fcProfile?.fid || 0,
            reviewNotes: 'Bulk approved by admin'
          })
        })
      );

      await Promise.all(promises);
      
      // Remove processed comments from the list
      setPendingComments(prev => prev.filter(comment => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err: any) {
      console.error('Bulk approve error:', err);
      setError(err.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedComments.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedComments).map(commentId => 
        fetch('/api/admin/approve-comment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': 'admin-key-123'
          },
          body: JSON.stringify({
            pendingCommentId: commentId,
            action: 'reject',
            adminFid: fcProfile?.fid || 0,
            reviewNotes: 'Bulk rejected by admin'
          })
        })
      );

      await Promise.all(promises);
      
      // Remove processed comments from the list
      setPendingComments(prev => prev.filter(comment => !selectedComments.has(comment.id)));
      setSelectedComments(new Set());
    } catch (err: any) {
      console.error('Bulk reject error:', err);
      setError(err.message);
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400 py-4">Loading all pending comments...</div>;
  }

  if (error) {
    return <div className="text-center text-red-400 py-4">Error: {error}</div>;
  }

  if (pendingComments.length === 0) {
    return <div className="text-center text-gray-400 py-4">No pending comments in the system.</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with count and bulk actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="text-gray-300">
            <span className="text-lg font-bold text-purple-400">{pendingComments.length}</span> pending comment{pendingComments.length !== 1 ? 's' : ''}
          </div>
          {selectedComments.size > 0 && (
            <div className="text-sm text-yellow-400">
              {selectedComments.size} selected
            </div>
          )}
        </div>
        <button
          onClick={fetchPendingComments}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
        >
          <FiRefreshCw />
          Refresh
        </button>
      </div>

      {/* Bulk Actions */}
      {pendingComments.length > 0 && (
        <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectedComments.size === pendingComments.length ? clearSelection : selectAllComments}
                  className="flex items-center gap-2 text-white hover:text-purple-300 transition-colors"
                >
                  {selectedComments.size === pendingComments.length ? (
                    <FiCheckSquare className="text-purple-400" size={20} />
                  ) : (
                    <FiSquare className="text-gray-400" size={20} />
                  )}
                  <span className="text-sm">
                    {selectedComments.size === pendingComments.length ? 'Deselect All' : 'Select All'}
                  </span>
                </button>
              </div>
              {selectedComments.size > 0 && (
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Clear Selection
                </button>
              )}
            </div>
            
            {selectedComments.size > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
                >
                  <FiCheckCircle size={12} />
                  Approve ({selectedComments.size})
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={bulkActionLoading}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
                >
                  <FiXCircle size={12} />
                  Reject ({selectedComments.size})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compact Comment List */}
      <div className="space-y-2">
        {pendingComments.map(comment => (
          <div key={comment.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-3">
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => toggleCommentSelection(comment.id)}
                className="flex items-center justify-center mt-1"
              >
                {selectedComments.has(comment.id) ? (
                  <FiCheckSquare className="text-purple-400" size={18} />
                ) : (
                  <FiSquare className="text-gray-400" size={18} />
                )}
              </button>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FiMessageSquare className="text-blue-400" size={14} />
                  <span className="text-white font-medium text-sm">Comment #{comment.id}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-blue-300 text-sm">@{comment.username}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-purple-300 text-sm">@{comment.promoter_username}</span>
                </div>
                
                <div className="mb-2">
                  <div className="text-gray-300 text-sm bg-gray-700/50 rounded p-2">
                    "{comment.comment_text}"
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Campaign #{comment.promotion_id}</span>
                  <span className="text-green-400 font-semibold">{comment.reward_amount} CHESS</span>
                  <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-400 flex items-center gap-1">
                  <FiClock size={12} /> Pending
                </span>

                {/* Individual Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAction(comment.id, 'approve')}
                    disabled={processingId === comment.id}
                    className="p-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    {processingId === comment.id ? <FiLoader className="animate-spin" size={12} /> : <FiCheckCircle size={12} />}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Reason for rejection (optional):');
                      handleAction(comment.id, 'reject', reason || undefined);
                    }}
                    disabled={processingId === comment.id}
                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    {processingId === comment.id ? <FiLoader className="animate-spin" size={12} /> : <FiXCircle size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Details */}
            <div className="mt-2 ml-8">
              <details className="text-xs">
                <summary className="text-purple-300 cursor-pointer hover:text-purple-200">
                  View Original Post & Details
                </summary>
                <div className="mt-2 space-y-2">
                  {/* Original Post Preview */}
                  <div className="bg-gray-900 rounded-lg p-2">
                    <div className="text-xs text-gray-400 mb-1">📱 Original Post:</div>
                    <div className="bg-white rounded overflow-hidden h-32 relative">
                      <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                        <div className="text-gray-500 text-xs">Loading preview...</div>
                      </div>
                      <iframe 
                        src={comment.promotion_cast_url} 
                        className="w-full h-full border-0 relative z-10" 
                        title={`Preview of post for comment #${comment.id}`}
                        loading="lazy"
                        sandbox="allow-scripts allow-same-origin"
                        onLoad={(e) => {
                          const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                          if (skeleton) skeleton.style.display = 'none';
                        }}
                        onError={(e) => {
                          const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                          if (skeleton) {
                            skeleton.innerHTML = '<div class="text-red-500 text-xs">❌ Preview unavailable</div>';
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Additional Details */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Commenter FID: {comment.user_fid}</div>
                    <div>Promoter FID: {comment.promoter_fid}</div>
                    <div>Cast Hash: {comment.cast_hash}</div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
