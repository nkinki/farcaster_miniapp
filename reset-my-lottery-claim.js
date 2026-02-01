// Reset lottery claim for FID 815252
require('dotenv').config();

async function resetClaim() {
    const winningId = 19;
    const playerFid = 815252;

    try {
        console.log('\n🔄 Resetting lottery claim...\n');

        const response = await fetch('http://localhost:3000/api/lottery/reset-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ winningId, playerFid })
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ SUCCESS! Your claim has been reset.\n');
            console.log('📋 Details:');
            console.log(`   - Winning ID: ${winningId}`);
            console.log(`   - Amount: ${result.winning.amount_won} CHESS`);
            console.log(`   - Status: Ready to claim again\n`);
            console.log('🎯 Next Steps:');
            console.log('   1. Open the app');
            console.log('   2. Go to "Buy a Lambo" lottery');
            console.log('   3. Click "Your Winnings"');
            console.log('   4. Click "Claim Prize" button');
            console.log('   5. Wait for the transaction to complete\n');
        } else {
            console.log('❌ Error:', result.error);
            console.log('\n💡 Alternative: Use the database script instead');
        }

    } catch (error) {
        console.error('❌ Failed to connect to API:', error.message);
        console.log('\n💡 Make sure your dev server is running:');
        console.log('   npm run dev');
        console.log('\nOr use the database script: node reset-claim-db.js');
    }
}

resetClaim();
