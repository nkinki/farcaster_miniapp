"use client"

import { useState, useEffect } from "react";
import { FiCheck, FiX, FiClock, FiEye, FiExternalLink } from "react-icons/fi";

interface PendingComment {
  id: number;
  promotion_id: number;
  user_fid: number;
  username: string;
  comment_text: string;
  cast_hash: string;
  reward_amount: number;
  status: string;
  created_at: string;
  cast_url: string;
  share_text: string;
}

interface PendingCommentsManagerProps {
  promoterFid: number;
}

export default function PendingCommentsManager({ promoterFid }: PendingCommentsManagerProps) {
  const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPendingComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/pending-comments?promoterFid=${promoterFid}&status=pending`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pending comments');
      }

      setPendingComments(data.pendingComments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingComments();
  }, [promoterFid]);

  const handleApproveReject = async (commentId: number, action: 'approve' | 'reject', reviewNotes?: string) => {
    setActionLoading(commentId);
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
          adminFid: promoterFid,
          reviewNotes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} comment`);
      }

      // Remove the comment from the list
      setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // Show success message
      alert(`Comment ${action}d successfully! ${action === 'approve' ? 'Reward credited to user.' : ''}`);
      
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-slate-300">
          <FiClock className="animate-spin" />
          <span>Loading pending comments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 border border-red-600 p-4 rounded-lg">
        <p className="text-red-200">Error: {error}</p>
      </div>
    );
  }

  if (pendingComments.length === 0) {
    return (
      <div className="bg-slate-800 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-slate-300">
          <FiCheck />
          <span>No pending comments to review</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FiClock className="text-yellow-400" />
          Pending Comments ({pendingComments.length})
        </h3>
        <button
          onClick={fetchPendingComments}
          className="text-slate-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {pendingComments.map((comment) => (
          <div key={comment.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-slate-300">@{comment.username}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-sm text-slate-400">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-sm text-green-400 font-medium">
                    {comment.reward_amount} $CHESS
                  </span>
                </div>
                
                <div className="bg-slate-600 p-3 rounded border-l-4 border-blue-400 mb-3">
                  <p className="text-white text-sm">{comment.comment_text}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Original post:</span>
                  <a
                    href={comment.cast_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <FiExternalLink size={12} />
                    View Post
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleApproveReject(comment.id, 'approve')}
                disabled={actionLoading === comment.id}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {actionLoading === comment.id ? (
                  <FiClock className="animate-spin" size={14} />
                ) : (
                  <FiCheck size={14} />
                )}
                Approve
              </button>
              
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason (optional):');
                  handleApproveReject(comment.id, 'reject', reason || undefined);
                }}
                disabled={actionLoading === comment.id}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <FiX size={14} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
