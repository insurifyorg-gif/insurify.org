// Test script: Simulate submitting a claim to the backend
const http = require('http');

const claimData = {
  policy_number: 'POL-1768091073309-D3O25QLXI',
  customer_name: 'Test User',
  customer_email: 'test@example.com',
  claim_type: 'Auto',
  claim_date: '2026-01-11',
  description: 'Test claim submission',
  claimed_amount: 5000
};

const postData = JSON.stringify(claimData);

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/claims/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('[TEST] Submitting claim to http://localhost:8080/api/claims/submit');
console.log('[TEST] Claim data:', claimData);

const req = http.request(options, (res) => {
  let data = '';
  console.log(`[TEST] Response Status: ${res.statusCode}`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('[TEST] Response:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('[TEST] Response (raw):', data);
    }
  });
});

req.on('error', (e) => {
  console.error('[TEST] Request error:', e.message);
  console.error('[TEST] Make sure your backend server is running on port 8080');
});

req.write(postData);
req.end();
