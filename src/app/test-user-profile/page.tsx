"use client"

import UserProfile from "@/components/UserProfile";

export default function TestUserProfilePage() {
  // Mock user data for testing
  const mockUser = {
    fid: 815252,
    username: "allibaba",
    displayName: "Ali Baba",
    pfpUrl: "https://i.pravatar.cc/150?u=815252"
  };

  // Mock user stats based on our API data
  const mockUserStats = {
    totalEarnings: 15000,
    totalShares: 3,
    pendingRewards: 15000
  };

  const handleClaimSuccess = () => {
    console.log("Claim success callback triggered");
    alert("Claim success! (This is just a test)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-purple-900 px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white text-center mb-6">UserProfile Component Test</h1>
        
        <div className="mb-6">
          <UserProfile
            user={mockUser}
            userStats={mockUserStats}
            onClaimSuccess={handleClaimSuccess}
          />
        </div>

        <div className="bg-[#23283a] rounded-2xl p-6 border border-[#a64d79] text-white">
          <h2 className="text-lg font-bold mb-4">Expected Results:</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ <strong>User Avatar:</strong> Should show Ali Baba's profile picture</li>
            <li>✅ <strong>User Name:</strong> "Ali Baba" (@allibaba)</li>
            <li>✅ <strong>Total Earned:</strong> 15,000 (top right corner)</li>
            <li>✅ <strong>Total Shares:</strong> 3 (grid)</li>
            <li>✅ <strong>Pending Rewards:</strong> 15,000 (grid)</li>
            <li>✅ <strong>Claim Button:</strong> Should be ACTIVE and show "Claim 15000.00 $CHESS"</li>
            <li>✅ <strong>Claim Button Color:</strong> Green-blue gradient (not gray)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}