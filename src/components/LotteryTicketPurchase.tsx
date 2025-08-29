"use client"

import { useState, useEffect } from 'react';
import { FiShoppingCart, FiCheck, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface LotteryTicketPurchaseProps {
  currentRound: any;
  onPurchaseSuccess: () => void;
}

export default function LotteryTicketPurchase({ currentRound, onPurchaseSuccess }: LotteryTicketPurchaseProps) {
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
      // Mock user data for testing
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
      onPurchaseSuccess();

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

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Buy Lottery Tickets</h3>
        <div className="text-sm text-gray-400">
          Round #{currentRound?.draw_number || 'N/A'}
        </div>
      </div>

      {/* Jackpot Display */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-white">
          {(currentRound?.jackpot || 1000000).toLocaleString()} $CHESS
        </div>
        <div className="text-sm text-yellow-100">Jackpot</div>
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
        <div className="bg-gray-700 rounded-lg p-3">
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
          w-full py-3 px-4 rounded-lg font-medium transition-all
          ${selectedNumbers.length === 0 || isPurchasing
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-700 text-white'
          }
        `}
      >
        {isPurchasing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
        <div className="bg-red-900 border border-red-700 rounded-lg p-3 text-red-200">
          <div className="flex items-center">
            <FiX className="mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-900 border border-green-700 rounded-lg p-3 text-green-200">
          <div className="flex items-center">
            <FiCheck className="mr-2" />
            {success}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-400 text-center">
        <p>• Each ticket costs 20,000 $CHESS</p>
        <p>• Maximum 10 tickets per purchase</p>
        <p>• Draw happens automatically when round ends</p>
        <p>• Navigate through pages to see all 100 numbers</p>
      </div>
    </div>
  );
}
