// Test script to verify distance rate calculation
const testDistanceRateAPI = async () => {
  try {
    console.log('🧪 Testing System Settings API...');
    
    // Test API endpoint
    const response = await fetch('http://localhost:3000/api/system-settings/distance_rate');
    const result = await response.json();
    
    console.log('📊 API Response:', result);
    
    if (response.ok && result.value) {
      const rate = parseFloat(result.value);
      console.log('✅ Distance Rate:', rate);
      
      // Test calculation
      const testDistance = 100; // km
      const calculatedCost = testDistance * rate;
      console.log(`💰 Test Calculation: ${testDistance} km × ${rate} = ${calculatedCost} บาท`);
      
    } else {
      console.log('❌ API Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('🚨 Test Error:', error);
  }
};

// Test data transformation
const testTripRecordTransformation = () => {
  const mockApiRecord = {
    id: 1,
    estimatedDistance: '120.5',
    totalAllowance: '500',
    fuelCost: '800',
    tollFee: '50',
    repairCost: '200',
    tripItems: [
      { totalPrice: '100' },
      { totalPrice: '150' }
    ]
  };
  
  const distanceRate = 1.2;
  
  console.log('🧪 Testing Trip Record Transformation...');
  console.log('📋 Mock Data:', mockApiRecord);
  
  // Simulate transformation logic
  const suppliesCost = mockApiRecord.tripItems.reduce((sum, ti) => {
    const val = parseFloat(ti.totalPrice || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const allowance = parseFloat(mockApiRecord.totalAllowance || '0') || 0;
  const repairCost = parseFloat(mockApiRecord.repairCost || '0') || 0;
  const fuel = parseFloat(mockApiRecord.fuelCost || '0') || 0;
  const toll = parseFloat(mockApiRecord.tollFee || '0') || 0;
  
  const estimatedDistance = parseFloat(mockApiRecord.estimatedDistance) || 0;
  const distanceCheck = estimatedDistance * distanceRate;
  
  const driverExpenses = allowance + distanceCheck + suppliesCost;
  const companyExpenses = fuel + toll + repairCost;
  const totalCosts = driverExpenses + companyExpenses;
  
  console.log('💰 Calculation Results:', {
    distanceRate,
    estimatedDistance,
    distanceCheck,
    allowance,
    suppliesCost,
    fuel,
    toll,
    repairCost,
    driverExpenses,
    companyExpenses,
    totalCosts
  });
};

console.log('🚀 Starting Tests...');
testDistanceRateAPI();
testTripRecordTransformation();