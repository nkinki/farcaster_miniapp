async function checkAirdropClaims() {
    try {
        console.log('🔍 Checking airdrop_claims for ifun (FID: 439015)\n');

        const response = await fetch('https://farc-nu.vercel.app/api/debug/check-airdrop-claim?fid=439015');
        const data = await response.json();

        console.log(JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkAirdropClaims();
