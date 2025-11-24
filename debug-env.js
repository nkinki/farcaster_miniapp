const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const files = ['.env', '.env.local', '.env.production', '.env.development'];

console.log('🔍 Checking environment files for DATABASE_URL...');

files.forEach(file => {
  if (fs.existsSync(file)) {
    const config = dotenv.parse(fs.readFileSync(file));
    if (config.DATABASE_URL) {
      const url = config.DATABASE_URL;
      const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
      const isNeon = url.includes('neon.tech');
      console.log(`📄 ${file}: Found DATABASE_URL`);
      console.log(`   - Type: ${isLocal ? 'Localhost' : (isNeon ? 'Neon (Cloud)' : 'Other')}`);
      console.log(`   - Preview: ${url.substring(0, 20)}...`);
    } else {
      console.log(`📄 ${file}: No DATABASE_URL found`);
    }
  } else {
    console.log(`📄 ${file}: File not found`);
  }
});
