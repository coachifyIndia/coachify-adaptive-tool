const https = require('http');

async function testAPI() {
  // Login first
  const loginData = JSON.stringify({
    email: 'rahul.sharma@testmail.com',
    password: 'Test@123'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const token = await new Promise((resolve, reject) => {
    const req = https.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.data.access_token);
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('✓ Got auth token');

  // Start session
  const sessionData = JSON.stringify({
    module_id: 1,
    session_type: 'drill',
    session_size: 10
  });

  const sessionOptions = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/v1/practice/start',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': sessionData.length
    }
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request(sessionOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(sessionData);
    req.end();
  });

  console.log('\n✓ API Response:');
  console.log(JSON.stringify(response, null, 2));
}

testAPI().catch(console.error);
