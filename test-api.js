const http = require('http');

const ADMIN_API_KEY = 'admin-api-key-12345';
const REVIEWER_API_KEY = 'reviewer-api-key-67890';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ statusCode: res.statusCode, headers: res.headers, body: response });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Starting API integration tests...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    });
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.body)}\n`);

    // Test 2: List books without auth (should fail)
    console.log('2. Testing books endpoint without authentication...');
    const noAuthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/books',
      method: 'GET'
    });
    console.log(`   Status: ${noAuthResponse.statusCode}`);
    console.log(`   Error: ${JSON.stringify(noAuthResponse.body)}\n`);

    // Test 3: List books with admin auth
    console.log('3. Testing books endpoint with admin authentication...');
    const booksResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/books',
      method: 'GET',
      headers: {
        'x-api-key': ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${booksResponse.statusCode}`);
    console.log(`   Books found: ${booksResponse.body?.data?.length || 0}\n`);

    // Test 4: Create a new book (should create audit log)
    console.log('4. Creating a new book (should trigger audit)...');
    const newBook = {
      title: 'Test Book',
      authors: 'Test Author',
      publishedBy: 'Test Publisher'
    };
    const createResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/books',
      method: 'POST',
      headers: {
        'x-api-key': ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    }, newBook);
    console.log(`   Status: ${createResponse.statusCode}`);
    if (createResponse.statusCode === 201) {
      console.log(`   Created book: ${createResponse.body.title}\n`);
    } else {
      console.log(`   Error: ${JSON.stringify(createResponse.body)}\n`);
    }

    // Test 5: Check audit logs (admin only)
    console.log('5. Checking audit logs...');
    const auditResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/audits',
      method: 'GET',
      headers: {
        'x-api-key': ADMIN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${auditResponse.statusCode}`);
    console.log(`   Audit logs found: ${auditResponse.body?.data?.length || 0}`);
    if (auditResponse.body?.data?.length > 0) {
      console.log(`   Latest audit: ${auditResponse.body.data[0].action} on ${auditResponse.body.data[0].entity}\n`);
    }

    // Test 6: Try to access audit logs with reviewer (should fail)
    console.log('6. Testing audit access with reviewer role (should fail)...');
    const reviewerAuditResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/audits',
      method: 'GET',
      headers: {
        'x-api-key': REVIEWER_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Status: ${reviewerAuditResponse.statusCode}`);
    console.log(`   Error: ${JSON.stringify(reviewerAuditResponse.body)}\n`);

    console.log('✅ API integration tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();