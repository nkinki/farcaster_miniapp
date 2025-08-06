// Script a claim signature tesztelésére
const { createPublicClient, http, parseUnits } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');

// Szerződés adatok
const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';
const REWARDS_CLAIM_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_recipient", "type": "address" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" },
      { "internalType": "uint256", "name": "_nonce", "type": "uint256" },
      { "internalType": "bytes", "name": "_signature", "type": "bytes" }
    ],
    "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "nonces",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view", "type": "function"
  }
];

async function testClaimSignature() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  // Test adatok
  const testRecipient = '0x1234567890123456789012345678901234567890'; // Dummy address
  const testAmount = parseUnits('10', 18); // 10 CHESS
  
  try {
    console.log('🔍 Testing claim signature generation...');
    
    // Lekérjük a nonce-t
    const nonce = await publicClient.readContract({
      address: REWARDS_CLAIM_ADDRESS,
      abi: REWARDS_CLAIM_ABI,
      functionName: 'nonces',
      args: [testRecipient]
    });
    
    console.log('Current nonce for test address:', nonce.toString());
    
    // Szimuláljuk a claim hívást (dry run)
    try {
      const result = await publicClient.simulateContract({
        address: REWARDS_CLAIM_ADDRESS,
        abi: REWARDS_CLAIM_ABI,
        functionName: 'claim',
        args: [testRecipient, testAmount, nonce, '0x1234'], // Dummy signature
        account: testRecipient
      });
      
      console.log('✅ Contract call simulation successful');
    } catch (simError) {
      console.log('❌ Contract call simulation failed:', simError.message);
      
      // Próbáljuk más paraméter sorrenddel
      console.log('\n🔄 Trying different parameter order...');
      
      // Próbáljuk: recipient, amount, signature, nonce
      try {
        const result2 = await publicClient.simulateContract({
          address: REWARDS_CLAIM_ADDRESS,
          abi: [{
            "inputs": [
              { "internalType": "address", "name": "_recipient", "type": "address" },
              { "internalType": "uint256", "name": "_amount", "type": "uint256" },
              { "internalType": "bytes", "name": "_signature", "type": "bytes" },
              { "internalType": "uint256", "name": "_nonce", "type": "uint256" }
            ],
            "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function"
          }],
          functionName: 'claim',
          args: [testRecipient, testAmount, '0x1234', nonce],
          account: testRecipient
        });
        
        console.log('✅ Alternative parameter order works!');
        console.log('   Correct order: recipient, amount, signature, nonce');
      } catch (altError) {
        console.log('❌ Alternative parameter order also failed:', altError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing claim signature:', error.message);
  }
}

testClaimSignature();