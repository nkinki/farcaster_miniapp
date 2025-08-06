// Script a signer wallet címének ellenőrzésére
require('dotenv').config();
const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';

const SIGNER_ABI = [
  {
    "inputs": [],
    "name": "signerWallet",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkSignerWallet() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  try {
    console.log('🔍 Checking signer wallet for contract:', REWARDS_CLAIM_ADDRESS);
    
    const signerWallet = await publicClient.readContract({
      address: REWARDS_CLAIM_ADDRESS,
      abi: SIGNER_ABI,
      functionName: 'signerWallet'
    });
    
    console.log('\n📊 Signer Wallet Address:', signerWallet);
    
    // Ha van BACKEND_WALLET_PRIVATE_KEY, ellenőrizzük, hogy egyezik-e
    if (process.env.BACKEND_WALLET_PRIVATE_KEY) {
      const { privateKeyToAccount } = require('viem/accounts');
      const backendAccount = privateKeyToAccount(process.env.BACKEND_WALLET_PRIVATE_KEY);
      
      console.log('Backend wallet address:', backendAccount.address);
      
      if (backendAccount.address.toLowerCase() === signerWallet.toLowerCase()) {
        console.log('✅ Backend wallet matches signer wallet!');
      } else {
        console.log('❌ CRITICAL: Backend wallet does NOT match signer wallet!');
        console.log('   The signatures will be invalid.');
        console.log('   Expected signer:', signerWallet);
        console.log('   Current backend:', backendAccount.address);
      }
    } else {
      console.log('⚠️  BACKEND_WALLET_PRIVATE_KEY not set in environment');
    }
    
  } catch (error) {
    console.error('❌ Error checking signer wallet:', error.message);
  }
}

checkSignerWallet();