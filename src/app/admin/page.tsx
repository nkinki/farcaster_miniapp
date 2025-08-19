"use client"

import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';

interface PendingVerification {
  id: number;
  action_id: number;
  promotion_id: number;
  user_fid: number;
  user_username: string;
  action_type: string;
  cast_hash: string;
  cast_url: string;
  reward_per_share: number;
  remaining_budget: number;
  created_at: string;
  notes: string;
}

export default function AdminPage() {
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/verify-like-recast');
      if (response.ok) {
        const data = await response.json();
        setPendingVerifications(data.pendingVerifications || []);
      } else {
        console.error('Failed to fetch verifications');
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (actionId: number, verified: boolean, notes?: string) => {
    try {
      setProcessing(actionId);
      const response = await fetch('/api/admin/verify-like-recast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          verified,
          adminId: 1, // Hardcoded admin ID for now
          notes: notes || (verified ? 'Manually verified by admin' : 'Rejected by admin')
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Verification result:', data.message);
        
        // Refresh the list
        await fetchPendingVerifications();
      } else {
        const errorData = await response.json();
        console.error('Verification failed:', errorData.error);
        alert(`Verification failed: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error during verification:', error);
      alert('Verification failed');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 flex items-center justify-center">
        <div className="text-purple-400 text-2xl font-bold animate-pulse">Loading Admin Panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white text-center mb-2">🔐 Admin Panel</h1>
          <p className="text-purple-300 text-center">Manual Verification for Like & Recast Actions</p>
        </div>

        <div className="mb-4 flex justify-between items-center">
          <div className="text-white">
            <span className="text-lg font-semibold">Pending Verifications: </span>
            <span className="text-purple-300 text-xl font-bold">{pendingVerifications.length}</span>
          </div>
          <button
            onClick={fetchPendingVerifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {pendingVerifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-2xl text-green-400 mb-2">✅</div>
            <div className="text-white text-xl">No pending verifications!</div>
            <div className="text-purple-300">All like & recast actions have been processed.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingVerifications.map((verification) => (
              <div key={verification.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-purple-300 text-sm font-semibold">User</div>
                    <div className="text-white">@{verification.user_username} (FID: {verification.user_fid})</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm font-semibold">Action</div>
                    <div className="text-white capitalize">{verification.action_type}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm font-semibold">Reward</div>
                    <div className="text-green-400 font-bold">{verification.reward_per_share} $CHESS</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-sm font-semibold">Budget</div>
                    <div className="text-white">{verification.remaining_budget} remaining</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-purple-300 text-sm font-semibold mb-2">Cast URL</div>
                  <div className="text-white break-all bg-gray-800 p-2 rounded">
                    {verification.cast_url}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-purple-300 text-sm font-semibold mb-2">Cast Hash</div>
                  <div className="text-white break-all bg-gray-800 p-2 rounded font-mono text-sm">
                    {verification.cast_hash || 'No hash provided'}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-purple-300 text-sm font-semibold mb-2">Submitted</div>
                  <div className="text-white">
                    {new Date(verification.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerification(verification.action_id, true)}
                    disabled={processing === verification.action_id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processing === verification.action_id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <FiCheck size={20} />
                    )}
                    Verify & Grant Reward
                  </button>
                  
                  <button
                    onClick={() => handleVerification(verification.action_id, false)}
                    disabled={processing === verification.action_id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processing === verification.action_id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <FiX size={20} />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/promote"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            ← Back to Promotions
          </a>
        </div>
      </div>
    </div>
  );
}