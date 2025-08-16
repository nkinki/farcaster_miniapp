"use client"

import { useState } from "react";
import { FiArrowLeft, FiUsers, FiDollarSign, FiActivity } from "react-icons/fi";
import Link from "next/link";

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPromotions: 0,
    totalRewards: 0,
    pendingRewards: 0
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a1f2e] to-[#0f1419] text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/promote" className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiUsers className="text-blue-400" size={24} />
              <h3 className="text-lg font-semibold">Total Users</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats.totalUsers}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiActivity className="text-green-400" size={24} />
              <h3 className="text-lg font-semibold">Promotions</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.totalPromotions}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiDollarSign className="text-purple-400" size={24} />
              <h3 className="text-lg font-semibold">Total Rewards</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{stats.totalRewards}</p>
          </div>

          <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <FiDollarSign className="text-yellow-400" size={24} />
              <h3 className="text-lg font-semibold">Pending Rewards</h3>
            </div>
            <p className="text-3xl font-bold text-yellow-400">{stats.pendingRewards}</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#23283a] rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
          <p className="text-gray-400">
            Admin dashboard is under development. Statistics and management tools will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}