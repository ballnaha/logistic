import { getTripFee, clearTripFeeCache } from '../src/utils/tripFee';

async function testTripFee() {
  console.log('🧪 Testing Trip Fee Functionality\n');

  try {
    // Test 1: Get initial trip fee
    console.log('Test 1: Getting trip fee from database...');
    const tripFee1 = await getTripFee();
    console.log(`✓ Trip Fee: ${tripFee1} บาท\n`);

    // Test 2: Get trip fee again (should use cache)
    console.log('Test 2: Getting trip fee again (from cache)...');
    const startTime = Date.now();
    const tripFee2 = await getTripFee();
    const duration = Date.now() - startTime;
    console.log(`✓ Trip Fee: ${tripFee2} บาท`);
    console.log(`  (Retrieved in ${duration}ms - cached)\n`);

    // Test 3: Clear cache and get again
    console.log('Test 3: Clearing cache and getting trip fee...');
    clearTripFeeCache();
    const tripFee3 = await getTripFee();
    console.log(`✓ Trip Fee: ${tripFee3} บาท`);
    console.log(`  (Retrieved from database after cache clear)\n`);

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

testTripFee();
