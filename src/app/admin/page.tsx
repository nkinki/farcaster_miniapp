"use client"

import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye, FiRefreshCw, FiBarChart, FiShare2, FiCopy } from 'react-icons/fi';

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

interface AdminStats {
  totalPromotions: number;
  activePromotions: number;
  totalShares: number;
  totalRewards: number;
  totalUsers: number;
  pendingVerifications: number;
  todayVerifications: number;
  totalBudget: number;
  remainingBudget: number;
  avgReward: string;
}

interface ShareablePromo {
  id: number;
  cast_url: string;
  reward_per_share: number;
  remaining_budget: number;
  total_budget: number;
  shares_count: number;
  action_type: string;
  status: string;
  author_username: string;
}

export default function AdminPage() {
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shareablePromos, setShareablePromos] = useState<ShareablePromo[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'promos' | 'verifications'>('stats');

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchShareablePromos = async () => {
    try {
      const response = await fetch('/api/admin/shareable-promos');
      if (response.ok) {
        const data = await response.json();
        setShareablePromos(data.promos || []);
      }
    } catch (error) {
      console.error('Error fetching shareable promos:', error);
    }
  };

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
          notes: notes || (verified ? 'Manually verified by admin' : 'Rejected by admin')
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Verification result:', data);
        
        // Remove the processed verification from the list
        setPendingVerifications(prev => 
          prev.filter(v => v.action_id !== actionId)
        );
        
        // Show success message
        alert(verified ? 'Action verified and reward granted!' : 'Action rejected successfully');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to process verification'}`);
      }
    } catch (error) {
      console.error('Error processing verification:', error);
      alert('Error processing verification');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchShareablePromos();
    fetchPendingVerifications();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading && activeTab === 'verifications') {
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
          <p className="text-purple-300 text-center">System Statistics & Promotion Management</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex justify-center">
          <div className="bg-[#23283a] rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiBarChart className="inline mr-2" size={16} />
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'promos'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiShare2 className="inline mr-2" size={16} />
              Shareable Promos
            </button>
            <button
              onClick={() => setActiveTab('verifications')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'verifications'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <FiCheck className="inline mr-2" size={16} />
              Verifications ({pendingVerifications.length})
            </button>
          </div>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Fő statisztikák */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.totalPromotions}</div>
                <div className="text-sm text-gray-300">Total Promotions</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.activePromotions}</div>
                <div className="text-sm text-gray-300">Active Promotions</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.totalShares}</div>
                <div className="text-sm text-gray-300">Total Shares</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.totalRewards}</div>
                <div className="text-sm text-gray-300">Total Rewards</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-pink-400">{stats.totalUsers}</div>
                <div className="text-sm text-gray-300">Total Users</div>
              </div>
            </div>

            {/* További statisztikák */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{stats.pendingVerifications || 0}</div>
                <div className="text-sm text-gray-300">Pending Verifications</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400">{stats.todayVerifications || 0}</div>
                <div className="text-sm text-gray-300">Today's Verifications</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">{stats.totalBudget || 0}</div>
                <div className="text-sm text-gray-300">Total Budget</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{stats.remainingBudget || 0}</div>
                <div className="text-sm text-gray-300">Remaining Budget</div>
              </div>
              <div className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-indigo-400">{stats.avgReward || '0.00'}</div>
                <div className="text-sm text-gray-300">Avg Reward/Share</div>
              </div>
            </div>
          </div>
        )}

        {/* Shareable Promos Tab */}
        {activeTab === 'promos' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Shareable Promotions</h2>
              <button
                onClick={fetchShareablePromos}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
              >
                <FiRefreshCw />
                Refresh
              </button>
            </div>
            {shareablePromos.map((promo) => (
              <div key={promo.id} className="bg-[#23283a] border border-[#a64d79] rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">ID</div>
                    <div className="text-white font-bold">#{promo.id}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Type</div>
                    <div className="text-white capitalize">{promo.action_type}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Reward</div>
                    <div className="text-green-400 font-bold">{promo.reward_per_share} $CHESS</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Budget</div>
                    <div className="text-white">{promo.remaining_budget}/{promo.total_budget}</div>
                  </div>
                  <div>
                    <div className="text-purple-300 text-xs font-semibold">Shares</div>
                    <div className="text-blue-400">{promo.shares_count}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(promo.cast_url)}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                    >
                      <FiCopy size={12} />
                      Copy URL
                    </button>
                  </div>
                </div>
                {/* Másolható szövegek */}
                <div className="mt-4 space-y-2">
                  <div className="text-purple-300 text-xs font-semibold">Cast URL (kattintható)</div>
                  <div 
                    className="bg-[#1a1f2e] border border-gray-600 rounded p-3 cursor-pointer hover:bg-[#252b3d] transition-colors"
                    onClick={() => copyToClipboard(promo.cast_url)}
                  >
                    <div className="text-blue-400 text-sm break-all select-all">{promo.cast_url}</div>
                  </div>
                  
                  <div className="text-purple-300 text-xs font-semibold">Share Text (másolható)</div>
                  <div 
                    className="bg-[#1a1f2e] border border-gray-600 rounded p-3 cursor-pointer hover:bg-[#252b3d] transition-colors"
                    onClick={() => copyToClipboard(`🎯 Earn ${promo.reward_per_share} $CHESS for ${promo.action_type}! Join the promotion: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank`)}
                  >
                    <div className="text-green-400 text-sm select-all">
                      🎯 Earn {promo.reward_per_share} $CHESS for {promo.action_type}! Join the promotion: https://farcaster.xyz/miniapps/NL6KZtrtF7Ih/apprank
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <div>
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
                        {verification.cast_hash}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-purple-300 text-sm font-semibold mb-2">Submitted</div>
                      <div className="text-white">
                        {new Date(verification.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-purple-300 text-sm font-semibold mb-2">Notes</div>
                      <div className="text-gray-300 bg-gray-800 p-2 rounded">
                        {verification.notes || 'No additional notes'}
                      </div>
                    </div>

                    <div className="flex gap-4">
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