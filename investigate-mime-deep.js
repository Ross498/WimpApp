// Deep MIME Investigation - Check deployment vs browser behavior
const https = require('https');

function makeRequest(url, headers = {}) {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/css,*/*;q=0.1',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      console.log(`\n🔍 Request to: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Content-Type: ${res.headers['content-type']}`);
      console.log(`Content-Length: ${res.headers['content-length']}`);
      console.log(`Last-Modified: ${res.headers['last-modified']}`);
      console.log(`Cache-Control: ${res.headers['cache-control']}`);
      console.log(`Server: ${res.headers['server']}`);
      console.log(`X-Powered-By: ${res.headers['x-powered-by']}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const firstBytes = data.substring(0, 200);
        console.log(`First 200 chars: ${firstBytes}...`);
        
        // Check for HTML content
        if (firstBytes.includes('<!DOCTYPE') || firstBytes.includes('<html')) {
          console.log(`❌ SERVING HTML CONTENT!`);
        } else if (firstBytes.includes('@tailwind') || firstBytes.includes('*,:before')) {
          console.log(`✅ VALID CSS CONTENT`);
        } else {
          console.log(`⚠️ Unknown content type`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function runDeepInvestigation() {
  console.log('🕵️ DEEP MIME TYPE INVESTIGATION');
  console.log('================================');
  
  // Test with different User-Agents to simulate browser behavior
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', // iPhone Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', // Desktop Chrome
    'curl/7.81.0', // Command line
  ];
  
  for (const ua of userAgents) {
    console.log(`\n📱 Testing with User-Agent: ${ua.substring(0, 50)}...`);
    await makeRequest('https://wimpapp.co.za/assets/index.css', {
      'User-Agent': ua
    });
  }
  
  // Test if the issue is caching
  console.log(`\n🔄 Testing with cache-busting timestamp`);
  const timestamp = Date.now();
  await makeRequest(`https://wimpapp.co.za/assets/index.css?t=${timestamp}`);
  
  // Test direct deployment difference
  console.log(`\n🏗️ Testing deployment consistency`);
  await makeRequest('https://wimpapp.co.za/manifest.json');
  
  console.log(`\n📊 INVESTIGATION COMPLETE`);
  console.log(`If all requests show proper CSS content with text/css MIME type,`);
  console.log(`the issue may be browser-specific caching or PWA behavior.`);
}

runDeepInvestigation().catch(console.error);