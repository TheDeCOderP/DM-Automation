const fetch = require('node-fetch');
require('dotenv').config();

async function testPublishOverdue() {
  try {
    console.log('=== Testing Publish Overdue Endpoint ===\n');
    
    const url = `${process.env.NEXTAUTH_URL}/api/posts/publish-overdue`;
    const token = process.env.CRON_SECRET_TOKEN;

    console.log(`URL: ${url}`);
    console.log(`Using CRON_SECRET_TOKEN: ${token ? '✓ Set' : '✗ Not set'}\n`);

    console.log('Calling endpoint...\n');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log(`Status: ${response.status} ${response.statusText}\n`);
    console.log('Response:');
    console.log(JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✓ Success!');
      if (data.processed > 0) {
        console.log(`\nPublished ${data.successCount} out of ${data.processed} overdue posts`);
        if (data.failedCount > 0) {
          console.log(`\n⚠️  ${data.failedCount} posts failed:`);
          data.results.failed.forEach((f, idx) => {
            console.log(`  ${idx + 1}. Post ${f.postId}: ${f.error}`);
          });
        }
      } else {
        console.log('\nNo overdue posts found.');
      }
    } else {
      console.log('\n✗ Failed!');
      console.log(`Error: ${data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testPublishOverdue();
