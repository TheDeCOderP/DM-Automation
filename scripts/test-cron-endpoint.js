// Test script for cron endpoint
async function testCronEndpoint() {
  console.log('🧪 Testing Cron Endpoint...\n');
  
  const url = 'http://localhost:3000/api/cron-jobs/publish-post';
  const token = 'sk_cron_secure_token_2024_prabisha_dma';
  
  console.log('📡 Endpoint:', url);
  console.log('🔑 Token:', token);
  console.log('\n⏳ Sending request...\n');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📦 Response Data:\n');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ SUCCESS! Cron endpoint is working!');
      console.log(`\n📈 Summary:`);
      console.log(`   - Processed: ${data.processed || 0} posts`);
      console.log(`   - Success: ${data.successCount || 0}`);
      console.log(`   - Failed: ${data.failedCount || 0}`);
    } else {
      console.log('\n❌ ERROR! Cron endpoint returned an error');
    }
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error('\nMake sure:');
    console.error('1. Development server is running (npm run dev)');
    console.error('2. Database is accessible');
    console.error('3. .env file has CRON_SECRET_TOKEN');
  }
}

testCronEndpoint();
