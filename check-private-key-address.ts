import { ethers } from 'ethers';

const privateKey = '0x43600734717d2af7b2f75ed37952512713d858474808af7e9e06a037aa407b08';
const wallet = new ethers.Wallet(privateKey);
console.log('Address:', wallet.address);
