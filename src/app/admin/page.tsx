"use client"

import { useState, useEffect } from "react";
import { FiArrowLeft, FiUsers, FiDollarSign, FiActivity, FiEye, FiRefreshCw, FiCalendar, FiUser, FiLink, FiMessageSquare } from "react-icons/fi";
import Link from "next/link";

interface Promotion {
  id: number;
  fid: number;
  username: string;
  display_name: string | null;
  cast_url: string;
  share_text: string | null;
  reward_per_share: number;
  total_budget: number;
  remaining_budget: number;
  shares_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  blockchain_hash: string | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPromotions: 0,
    totalRewards: 0,
    pendingRewards: 0
  });

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Promóciók betöltése
  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/promotions?status=${selectedStatus}`);
      if (!response.ok) {
        throw new Error('Hiba a promóciók betöltésekor');
      }
      
      const data = await response.json();
      setPromotions(data.promotions || []);
      
      // Statisztikák számítása
      const totalPromotions = data.promotions?.length || 0;
      const totalBudget = data.promotions?.reduce((sum: number, p: Promotion) => sum + p.total_budget, 0) || 0;
      const totalSpent = data.promotions?.reduce((sum: number, p: Promotion) => sum + (p.total_budget - p.remaining_budget), 0) || 0;
      const totalRemaining = data.promotions?.reduce((sum: number, p: Promotion) => sum + p.remaining_budget, 0) || 0;
      
      setStats({
        totalUsers: new Set(data.promotions?.map((p: Promotion) => p.fid)).size,
        totalPromotions,
        totalRewards: totalSpent,
        pendingRewards: totalRemaining
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba történt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [selectedStatus]);

  // Dátum formázás
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Szám formázás
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Státusz szín
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30';
      case 'paused': return 'text-yellow-400 bg-yellow-900/30';
      case 'completed': return 'text-blue-400 bg-blue-900/30';
      case 'inactive': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  // Progress számítás
  const calculateProgress = (promo: Promotion): number => {
    if (promo.total_budget === 0) return 0;
    const spent = promo.total_budget - promo.remaining_budget;
    return Math.round((spent / promo.total_budget) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0f1419] text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/promote" className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
              <FiArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
          </div>
          
          <button
            onClick={fetchPromotions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            Frissítés
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiUsers className="text-blue-400" size={24} />
              <h3 className="text-lg font-semibold">Felhasználók</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats.totalUsers}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiActivity className="text-green-400" size={24} />
              <h3 className="text-lg font-semibold">Promóciók</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.totalPromotions}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiDollarSign className="text-purple-400" size={24} />
              <h3 className="text-lg font-semibold">Elköltött CHESS</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{formatNumber(stats.totalRewards)}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiDollarSign className="text-yellow-400" size={24} />
              <h3 className="text-lg font-semibold">Fennmaradó CHESS</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{formatNumber(stats.pendingRewards)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#23283a] rounded-xl p-4 border border-gray-700 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-gray-300 font-medium">Szűrés státusz szerint:</span>
            <div className="flex gap-2">
              {['all', 'active', 'paused', 'completed', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' ? 'Összes' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Promotions List */}
        <div className="bg-[#23283a] rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FiActivity className="text-green-400" />
              Promóciók ({promotions.length})
            </h2>
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border-b border-red-600 text-red-200">
              Hiba: {error}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Promóciók betöltése...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nincsenek promóciók a kiválasztott szűrővel.
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {promotions.map((promo) => (
                <div key={promo.id} className="p-6 hover:bg-gray-800/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Bal oldal - Alapadatok */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm text-gray-400">#{promo.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promo.status)}`}>
                          {promo.status}
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <FiCalendar size={12} />
                          {formatDate(promo.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <FiUser className="text-blue-400" size={16} />
                        <span className="font-medium">@{promo.username}</span>
                        {promo.display_name && (
                          <span className="text-gray-400">({promo.display_name})</span>
                        )}
                        <span className="text-sm text-gray-500">FID: {promo.fid}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <FiLink className="text-purple-400" size={16} />
                        <a 
                          href={promo.cast_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-purple-300 hover:text-purple-200 truncate max-w-md"
                        >
                          {promo.cast_url}
                        </a>
                      </div>

                      {promo.share_text && (
                        <div className="flex items-start gap-2 mb-2">
                          <FiMessageSquare className="text-green-400 mt-1" size={16} />
                          <span className="text-gray-300 text-sm">{promo.share_text}</span>
                        </div>
                      )}
                    </div>

                    {/* Jobb oldal - Statisztikák */}
                    <div className="lg:w-80">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-lg font-bold text-green-400">{formatNumber(promo.reward_per_share)}</div>
                          <div className="text-xs text-gray-400">CHESS/megosztás</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-lg font-bold text-blue-400">{promo.shares_count}</div>
                          <div className="text-xs text-gray-400">Megosztások</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-lg font-bold text-purple-400">{formatNumber(promo.total_budget)}</div>
                          <div className="text-xs text-gray-400">Teljes költségvetés</div>
                        </div>
                        <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                          <div className="text-lg font-bold text-yellow-400">{formatNumber(promo.remaining_budget)}</div>
                          <div className="text-xs text-gray-400">Fennmaradó</div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${calculateProgress(promo)}%` }}
                        ></div>
                      </div>
                      <div className="text-center text-sm text-gray-400">
                        {calculateProgress(promo)}% felhasználva
                      </div>

                      {promo.blockchain_hash && (
                        <div className="mt-2 text-xs text-gray-500 truncate">
                          TX: {promo.blockchain_hash}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}