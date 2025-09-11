"use client"

import { useState } from 'react';
import { useAccount } from 'wagmi';
import PaymentFormWithComments from '@/components/PaymentFormWithComments';
import { FEATURES, getFeatureStatus } from '@/config/features';

// Mock user data for testing
const mockUser = {
  fid: 12345,
  username: 'testuser',
  displayName: 'Test User'
};

export default function TestCommentsPage() {
  const { address, isConnected } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [featureStatus, setFeatureStatus] = useState(getFeatureStatus());

  const handleCreateSuccess = (promotion: any) => {
    console.log('Promotion created successfully:', promotion);
    alert(`Promotion created! ID: ${promotion.id}`);
    setShowForm(false);
  };

  const handleCreateCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 Test Comments Feature
          </h1>
          <p className="text-gray-300">
            This is a test page for the new comment functionality
          </p>
        </div>

        {/* Feature Status */}
        <div className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79]">
          <h2 className="text-xl font-bold text-white mb-4">Feature Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Comments:</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                featureStatus.comments ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {featureStatus.comments ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Enhanced Promotions:</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                featureStatus.enhancedPromotions ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {featureStatus.enhancedPromotions ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Comment Analytics:</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                featureStatus.commentAnalytics ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {featureStatus.commentAnalytics ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Debug Mode:</span>
              <span className={`px-2 py-1 rounded text-sm font-bold ${
                featureStatus.debugMode ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
              }`}>
                {featureStatus.debugMode ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          </div>
        </div>

        {/* Wallet Status */}
        <div className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79]">
          <h2 className="text-xl font-bold text-white mb-4">Wallet Status</h2>
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-300">
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
            {isConnected && address && (
              <span className="text-gray-400 font-mono text-sm">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            )}
          </div>
        </div>

        {/* Test Form */}
        <div className="bg-[#23283a] rounded-2xl p-6 mb-8 border border-[#a64d79]">
          <h2 className="text-xl font-bold text-white mb-4">Test Comment Form</h2>
          
          {!FEATURES.ENABLE_COMMENTS ? (
            <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300">
                ⚠️ Comments feature is disabled. Set ENABLE_COMMENTS=true in your environment variables to test.
              </p>
            </div>
          ) : !isConnected ? (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300">
                ⚠️ Please connect your wallet to test the comment functionality.
              </p>
            </div>
          ) : (
            <div>
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  🧪 Test Comment Form
                </button>
              ) : (
                <div className="border border-gray-600 rounded-lg p-4">
                  <PaymentFormWithComments
                    user={mockUser}
                    onSuccess={handleCreateSuccess}
                    onCancel={handleCreateCancel}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79]">
          <h2 className="text-xl font-bold text-white mb-4">Test Instructions</h2>
          <div className="text-gray-300 space-y-2">
            <p>1. Make sure your wallet is connected</p>
            <p>2. Set ENABLE_COMMENTS=true in your .env.local file</p>
            <p>3. Click "Test Comment Form" to open the new form</p>
            <p>4. Select comment templates and add custom text</p>
            <p>5. Test the promotion creation with comments</p>
            <p>6. Check the database for the new data structure</p>
          </div>
        </div>

        {/* Back to Main App */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            ← Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}
