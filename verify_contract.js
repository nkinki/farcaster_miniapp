// Script a szerződés létezésének ellenőrzésére
const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';

async function verifyContract() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  try {
    console.log('🔍 Verifying contract at:', REWARDS_CLAIM_ADDRESS);
    
    // Ellenőrizzük, hogy van-e kód a címen
    const code = await publicClient.getBytecode({
      address: REWARDS_CLAIM_ADDRESS
    });
    
    if (!code || code === '0x') {
      console.log('❌ CRITICAL: No contract code found at this address!');
      console.log('   This address is not a deployed contract.');
      return;
    }
    
    console.log('✅ Contract code found');
    console.log('Code length:', code.length, 'characters');
    
    // Próbáljuk meg meghívni egy egyszerű view funkciót
    const REWARDS_CLAIM_ABI = [
      {
        "inputs": [],
        "name": "owner",
        "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    try {
      const owner = await publicClient.readContract({
        address: REWARDS_CLAIM_ADDRESS,
        abi: REWARDS_CLAIM_ABI,
        functionName: 'owner'
      });
      
      console.log('✅ Contract is responsive');
      console.log('Owner address:', owner);
      
    } catch (ownerError) {
      console.log('⚠️  Could not read owner (function might not exist)');
    }
    
    // Próbáljuk meg a nonces funkciót
    const NONCES_ABI = [
      {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "nonces",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ];
    
    try {
      const testAddress = '0x1234567890123456789012345678901234567890';
      const nonce = await publicClient.readContract({
        address: REWARDS_CLAIM_ADDRESS,
        abi: NONCES_ABI,
        functionName: 'nonces',
        args: [testAddress]
      });
      
      console.log('✅ Nonces function works');
      console.log('Test nonce:', nonce.toString());
      
    } catch (nonceError) {
      console.log('❌ Nonces function failed:', nonceError.message);
    }
    
  } catch (error) {
    console.error('❌ Error verifying contract:', error.message);
  }
}

verifyContract();