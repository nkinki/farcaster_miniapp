const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 Testing promotions API...');
    
    const response = await fetch('http://localhost:3000/api/promotions');
    const data = await response.json();
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Total promotions:', data.promotions?.length || 0);
    
    // Check first few promotions for action_type
    if (data.promotions && data.promotions.length > 0) {
      console.log('\n🔍 First 3 promotions:');
      data.promotions.slice(0, 3).forEach((promo, index) => {
        console.log(`  ${index + 1}. ID: ${promo.id}, Username: @${promo.username}, Action Type: "${promo.action_type || 'NULL'}", Status: ${promo.status}`);
      });
      
      // Check for like_recast promotions
      const likeRecastPromos = data.promotions.filter(p => p.action_type === 'like_recast');
      console.log(`\n🎯 Like & Recast promotions: ${likeRecastPromos.length}`);
      
      if (likeRecastPromos.length > 0) {
        likeRecastPromos.slice(0, 3).forEach((promo, index) => {
          console.log(`  ${index + 1}. ID: ${promo.id}, Username: @${promo.username}, Budget: ${promo.remaining_budget}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPI();
