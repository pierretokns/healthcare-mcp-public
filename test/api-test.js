#!/usr/bin/env node

/**
 * API Test Suite for Healthcare MCP Server
 * Tests all available endpoints to ensure they're working correctly
 */

const API_BASE_URL = 'https://healthcare-mcp-server.pierretokns.workers.dev';

async function makeRequest(endpoint, data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data: result
    };
  } catch (error) {
    return {
      status: 'ERROR',
      ok: false,
      data: { error: error.message }
    };
  }
}

async function runTests() {
  console.log('🏥 Healthcare MCP Server API Tests');
  console.log('=====================================\n');

  const tests = [
    {
      name: 'Health Check',
      endpoint: '/',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'FDA Drug Lookup',
      endpoint: '/fda_drug_lookup',
      data: { drug_name: 'aspirin', search_type: 'general' },
      expectedStatus: 200
    },
    {
      name: 'PubMed Search',
      endpoint: '/pubmed_search',
      data: { query: 'diabetes treatment', max_results: 3 },
      expectedStatus: 200
    },
    {
      name: 'BMI Calculation',
      endpoint: '/calculate_bmi',
      data: { height_meters: 1.75, weight_kg: 70 },
      expectedStatus: 200
    },
    {
      name: 'ICD Code Lookup',
      endpoint: '/lookup_icd_code',
      data: { code: 'E11' },
      expectedStatus: 200
    },
    {
      name: 'MedRxiv Search',
      endpoint: '/medrxiv_search',
      data: { query: 'COVID-19', sort_by: 'rel' },
      expectedStatus: 200
    },
    {
      name: 'NCBI Bookshelf Search',
      endpoint: '/ncbi_bookshelf_search',
      data: { query: 'diabetes' },
      expectedStatus: 200
    },
    {
      name: 'Health Topics Search',
      endpoint: '/health_topics_search',
      data: { topic: 'diabetes' },
      expectedStatus: 200
    },
    {
      name: 'Clinical Trials Search',
      endpoint: '/clinical_trials_search',
      data: { condition: 'cancer', status: 'recruiting' },
      expectedStatus: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);

    const result = await makeRequest(test.endpoint, test.data);

    if (result.status === test.expectedStatus && result.ok) {
      console.log(`✅ PASSED - Status: ${result.status}`);

      // Show sample data for successful tests
      if (result.data && typeof result.data === 'object') {
        if (result.data.status === 'success') {
          console.log(`   📊 Sample: ${JSON.stringify(result.data).substring(0, 100)}...`);
        } else if (result.data.status) {
          console.log(`   📊 Status: ${result.data.status}`);
        }
      }
    } else {
      console.log(`❌ FAILED - Status: ${result.status}`);
      console.log(`   📊 Error: ${JSON.stringify(result.data)}`);
      failed++;
    }

    console.log('');
  }

  // Test error handling
  console.log('🧪 Testing Error Handling');
  console.log('========================');

  const errorTests = [
    {
      name: 'Invalid Endpoint',
      endpoint: '/invalid_endpoint',
      expectedStatus: 404
    },
    {
      name: 'Invalid Method',
      endpoint: '/fda_drug_lookup',
      method: 'DELETE',
      expectedStatus: 405
    },
    {
      name: 'Invalid BMI Input',
      endpoint: '/calculate_bmi',
      data: { height_meters: -1, weight_kg: 70 },
      expectedStatus: 200 // Should return error in response body
    }
  ];

  for (const test of errorTests) {
    console.log(`🧪 Testing: ${test.name}`);

    const result = await makeRequest(test.endpoint, test.data);

    if (result.status === test.expectedStatus) {
      console.log(`✅ PASSED - Correctly returned ${result.status}`);
    } else {
      console.log(`❌ FAILED - Expected ${test.expectedStatus}, got ${result.status}`);
      failed++;
    }

    console.log('');
  }

  console.log('📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${tests.length + errorTests.length - failed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((tests.length + errorTests.length - failed) / (tests.length + errorTests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The Healthcare MCP Server is working perfectly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the server status.');
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with fetch support.');
  console.log('💡 Please upgrade to Node.js 18 or newer.');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);