// Script az EIP712 domain adatok lekérdezésére
const { createPublicClient, http } = require('viem');
const { base } = require('viem/chains');

const REWARDS_CLAIM_ADDRESS = '0xb8d08800d79850375c10a96e87fd196c0e52aa5a';

const EIP712_ABI = [
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      { "internalType": "bytes1", "name": "fields", "type": "bytes1" },
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "version", "type": "string" },
      { "internalType": "uint256", "name": "chainId", "type": "uint256" },
      { "internalType": "address", "name": "verifyingContract", "type": "address" },
      { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
      { "internalType": "uint256[]", "name": "extensions", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkEIP712Domain() {
  const publicClient = createPublicClient({
    chain: base,
    transport: http()
  });

  try {
    console.log('🔍 Checking EIP712 domain for contract:', REWARDS_CLAIM_ADDRESS);
    
    const domainData = await publicClient.readContract({
      address: REWARDS_CLAIM_ADDRESS,
      abi: EIP712_ABI,
      functionName: 'eip712Domain'
    });
    
    console.log('\n📊 EIP712 Domain Data:');
    console.log('Fields:', domainData[0]);
    console.log('Name:', domainData[1]);
    console.log('Version:', domainData[2]);
    console.log('Chain ID:', domainData[3].toString());
    console.log('Verifying Contract:', domainData[4]);
    console.log('Salt:', domainData[5]);
    console.log('Extensions:', domainData[6]);
    
    console.log('\n🔧 Correct domain configuration:');
    console.log(`const domain = {`);
    console.log(`  name: '${domainData[1]}',`);
    console.log(`  version: '${domainData[2]}',`);
    console.log(`  chainId: ${domainData[3].toString()},`);
    console.log(`  verifyingContract: '${domainData[4]}',`);
    console.log(`};`);
    
  } catch (error) {
    console.error('❌ Error checking EIP712 domain:', error.message);
    console.log('This might mean the contract does not implement EIP712 standard properly.');
  }
}

checkEIP712Domain();