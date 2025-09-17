"use client"

import { useState, useEffect, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiExternalLink, FiUser, FiMessageSquare, FiDollarSign, FiAlertTriangle, FiLoader } from 'react-icons/fi';
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
    <div className="space-y-4 mt-4">
      <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold text-blue-300 mb-2">🔧 Admin Panel - All Pending Comments</h3>
        <p className="text-blue-200 text-sm">
          Total pending comments: <span className="font-bold text-blue-100">{pendingComments.length}</span>
        </p>
      </div>

      {pendingComments.map(comment => (
        <div key={comment.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-white">Pending Comment #{comment.id}</h4>
            <span className="text-sm text-yellow-400 flex items-center gap-1">
              <FiClock /> Pending
            </span>
          </div>
          
          {/* Original Post Preview */}
          <div className="bg-gray-900 rounded-lg p-3 mb-4">
            <div className="text-xs text-gray-400 mb-2">📱 Original Post Preview:</div>
            <div className="bg-white rounded overflow-hidden h-48 relative">
              {/* Loading Skeleton */}
              <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                <div className="text-gray-500 text-sm">Loading preview...</div>
              </div>
              <iframe 
                src={comment.promotion_cast_url} 
                className="w-full h-full border-0 relative z-10" 
                title={`Preview of post for comment #${comment.id}`}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
                onLoad={(e) => {
                  // Hide loading skeleton when iframe loads
                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                  if (skeleton) skeleton.style.display = 'none';
                }}
                onError={(e) => {
                  // Show error message if iframe fails to load
                  const skeleton = e.currentTarget.previousElementSibling as HTMLElement;
                  if (skeleton) {
                    skeleton.innerHTML = '<div class="text-red-500 text-sm">❌ Preview unavailable</div>';
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2 text-gray-300 text-sm mb-4">
            <p className="flex items-center gap-2">
              <FiUser /> <strong>Commenter:</strong> @{comment.username} (FID: {comment.user_fid})
            </p>
            <p className="flex items-center gap-2">
              <FiUser /> <strong>Promoter:</strong> @{comment.promoter_username} (FID: {comment.promoter_fid})
            </p>
            <p className="flex items-center gap-2">
              <FiMessageSquare /> <strong>Comment:</strong> "{comment.comment_text}"
            </p>
            <p className="flex items-center gap-2">
              <FiDollarSign /> <strong>Reward:</strong> {comment.reward_amount} $CHESS
            </p>
            <p className="flex items-center gap-2">
              <FiExternalLink /> <strong>Original Post:</strong> 
              <a href={comment.promotion_cast_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
                {comment.promotion_cast_url.split('/').pop()}
              </a>
            </p>
            <p className="text-xs text-gray-500">Submitted: {new Date(comment.created_at).toLocaleString()}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleAction(comment.id, 'approve')}
              disabled={processingId === comment.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {processingId === comment.id ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
              Approve
            </button>
            <button
              onClick={() => {
                const reason = prompt('Reason for rejection (optional):');
                handleAction(comment.id, 'reject', reason || undefined);
              }}
              disabled={processingId === comment.id}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {processingId === comment.id ? <FiLoader className="animate-spin" /> : <FiXCircle />}
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
