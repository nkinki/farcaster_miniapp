"use client"

import { useState, useEffect } from 'react';
import { FiShoppingCart, FiCheck, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Link from 'next/link';

interface LotteryRound {
  id: number;
  draw_number: number;
  jackpot: number;
  total_tickets: number;
  status: string;
  start_time: string;
  end_time: string;
}

interface LotteryStats {
  total_tickets: number;
  active_tickets: number;
  total_jackpot: number;
  last_draw_number: number;
  next_draw_time: string;
}

export default function BuyALamboPage() {
  const [currentRound, setCurrentRound] = useState<LotteryRound | null>(null);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Generate available ticket numbers (1-100) - but only show 20 per page
  const totalNumbers = 100;
  const numbersPerPage = 20;
  const totalPages = Math.ceil(totalNumbers / numbersPerPage);

  const getPageNumbers = (page: number) => {
    const start = (page - 1) * numbersPerPage + 1;
    const end = Math.min(page * numbersPerPage, totalNumbers);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const availableNumbers = getPageNumbers(currentPage);

  const fetchData = async () => {
    try {
      const [roundResponse, statsResponse] = await Promise.all([
        fetch('/api/lottery/current-round'),
        fetch('/api/lottery/stats')
      ]);

      if (roundResponse.ok) {
        const roundData = await roundResponse.json();
        setCurrentRound(roundData.round);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleNumberClick = (number: number) => {
    if (selectedNumbers.includes(number)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== number));
    } else if (selectedNumbers.length < 10) {
      setSelectedNumbers([...selectedNumbers, number]);
    }
  };

  const handlePurchase = async () => {
    if (selectedNumbers.length === 0) {
      setError('Please select at least one ticket number');
      return;
    }

    setIsPurchasing(true);
    setError(null);
    setSuccess(null);

    try {
      // Mock user data for testing - ezt később Farcaster auth-val cseréljük
      const mockUserData = {
        fid: 12345, // Test FID
        playerAddress: '0x1234567890123456789012345678901234567890',
        playerName: 'Test User',
        playerAvatar: 'https://example.com/avatar.jpg'
      };

      const response = await fetch('/api/lottery/purchase-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: mockUserData.fid,
          ticketNumbers: selectedNumbers,
          playerAddress: mockUserData.playerAddress,
          playerName: mockUserData.playerName,
          playerAvatar: mockUserData.playerAvatar
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase tickets');
      }

      setSuccess(`Successfully purchased ${selectedNumbers.length} tickets!`);
      setSelectedNumbers([]);
      fetchData(); // Refresh data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const clearSelection = () => {
    setSelectedNumbers([]);
    setError(null);
  };

  const totalCost = selectedNumbers.length * 20000; // 20,000 CHESS per ticket

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(timeString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 text-white p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-6xl font-bold text-yellow-400 mb-4">🏎️ BUY A LAMBO</h1>
          <p className="text-2xl text-purple-300 mb-2">Lottery System</p>
          <p className="text-gray-400">Win a Lamborghini with $CHESS tokens!</p>
        </div>

        {/* Admin Link */}
        <div className="text-center">
          <Link 
            href="/lottery-admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            🎰 Admin Panel
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Lottery Info */}
          <div className="space-y-6">
            {/* Current Round Info */}
            <div className="bg-[#23283a] rounded-xl p-6 border border-purple-500/30">
              <h2 className="text-2xl font-bold mb-4 text-yellow-400">Current Round #{currentRound?.draw_number || 'N/A'}</h2>
              {currentRound ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-400 mb-2">
                      {formatNumber(currentRound.jackpot)} $CHESS
                    </div>
                    <div className="text-yellow-300 text-lg">Jackpot</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {formatNumber(currentRound.total_tickets)}/100
                      </div>
                      <div className="text-cyan-300 text-sm">Tickets Sold</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">
                        {currentRound.status}
                      </div>
                      <div className="text-purple-300 text-sm">Status</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Time:</span>
                      <span className="text-white">{formatTime(currentRound.start_time)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">End Time:</span>
                      <span className="text-white">{formatTime(currentRound.end_time)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-center">No active round found</p>
              )}
            </div>

            {/* Lottery Statistics */}
            <div className="bg-[#23283a] rounded-xl p-6 border border-pink-500/30">
              <h2 className="text-xl font-bold mb-4 text-pink-400">Lottery Statistics</h2>
              {stats ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tickets:</span>
                    <span className="font-bold">{formatNumber(stats.total_tickets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Tickets:</span>
                    <span className="font-bold">{formatNumber(stats.active_tickets)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Jackpot:</span>
                    <span className="font-bold text-yellow-400">{formatNumber(stats.total_jackpot)} $CHESS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Draw:</span>
                    <span className="font-bold">#{stats.last_draw_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Next Draw:</span>
                    <span className="font-bold">{formatTime(stats.next_draw_time)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No statistics available</p>
              )}
            </div>

            {/* How It Works */}
            <div className="bg-[#23283a] rounded-xl p-6 border border-green-500/30">
              <h2 className="text-xl font-bold mb-4 text-green-400">How It Works</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">1</div>
                  <p>Buy lottery tickets for 20,000 $CHESS each</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">2</div>
                  <p>Choose your lucky numbers from 1-100</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">3</div>
                  <p>When round ends, a random number is drawn</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5">4</div>
                  <p>If you win, you get the entire jackpot!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Ticket Purchase */}
          <div className="space-y-6">
            <div className="bg-[#23283a] rounded-xl p-6 border border-yellow-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Buy Lottery Tickets</h3>
                <div className="text-sm text-gray-400">
                  Round #{currentRound?.draw_number || 'N/A'}
                </div>
              </div>

              {/* Ticket Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">
                    Select Ticket Numbers (1-100)
                  </span>
                  <span className="text-gray-400 text-sm">
                    {selectedNumbers.length}/10 selected
                  </span>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <FiChevronLeft />
                    Previous
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    Next
                    <FiChevronRight />
                  </button>
                </div>

                {/* Numbers Grid */}
                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                  {availableNumbers.map((number) => (
                    <button
                      key={number}
                      onClick={() => handleNumberClick(number)}
                      disabled={isPurchasing}
                      className={`
                        w-12 h-12 rounded text-sm font-medium transition-all
                        ${selectedNumbers.includes(number)
                          ? 'bg-green-500 text-white scale-110'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }
                        ${isPurchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                {/* Page Info */}
                <div className="text-center mt-2 text-xs text-gray-400">
                  Showing numbers {(currentPage - 1) * numbersPerPage + 1} - {Math.min(currentPage * numbersPerPage, totalNumbers)}
                </div>
              </div>

              {/* Selection Summary */}
              {selectedNumbers.length > 0 && (
                <div className="bg-gray-700 rounded-lg p-3 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">Selected Numbers:</span>
                    <button
                      onClick={clearSelection}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      <FiX className="inline mr-1" />
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNumbers.sort((a, b) => a - b).map((number) => (
                      <span
                        key={number}
                        className="bg-green-600 text-white px-2 py-1 rounded text-sm"
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-gray-400">Total Cost: </span>
                    <span className="text-white font-bold">
                      {totalCost.toLocaleString()} $CHESS
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={selectedNumbers.length === 0 || isPurchasing}
                className={`
                  w-full py-4 px-6 rounded-lg font-bold text-lg transition-all mt-4
                  ${selectedNumbers.length === 0 || isPurchasing
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }
                `}
              >
                {isPurchasing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Purchasing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <FiShoppingCart className="mr-2" />
                    Buy {selectedNumbers.length} Ticket{selectedNumbers.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900 border border-red-700 rounded-lg p-3 mt-4 text-red-200">
                  <div className="flex items-center">
                    <FiX className="mr-2" />
                    {error}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-900 border border-green-700 rounded-lg p-3 mt-4 text-green-200">
                  <div className="flex items-center">
                    <FiCheck className="mr-2" />
                    {success}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="text-xs text-gray-400 text-center mt-4">
                <p>• Each ticket costs 20,000 $CHESS</p>
                <p>• Maximum 10 tickets per purchase</p>
                <p>• Draw happens automatically when round ends</p>
                <p>• Navigate through pages to see all 100 numbers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>🎰 BUY A LAMBO Lottery System - Powered by $CHESS</p>
          <p>70% of ticket sales go to next round • 30% to treasury</p>
        </div>
      </div>
    </div>
  );
}
