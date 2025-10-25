import { NextRequest, NextResponse } from 'next/server';

// Test API endpoint to verify distance rate calculation
export async function GET() {
  try {
    console.log('🧪 Testing Distance Rate System...');
    
    // Test database connection and get distance rate
    const settingsResponse = await fetch('http://localhost:3000/api/system-settings/distance_rate');
    const settingsResult = await settingsResponse.json();
    
    console.log('📊 Settings API Response:', settingsResult);
    
    if (!settingsResponse.ok || !settingsResult.value) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to load distance rate from database',
        details: settingsResult 
      });
    }
    
    const distanceRate = parseFloat(settingsResult.value);
    
    // Mock trip record data for testing
    const mockTripRecord = {
      id: 999,
      estimatedDistance: 120.5,
      totalAllowance: 500,
      fuelCost: 800,
      tollFee: 50,
      repairCost: 200,
      tripItems: [
        { totalPrice: 100 },
        { totalPrice: 150 }
      ]
    };
    
    // Perform calculations
    const suppliesCost = mockTripRecord.tripItems.reduce((sum, ti) => sum + ti.totalPrice, 0);
    const allowance = mockTripRecord.totalAllowance;
    const fuel = mockTripRecord.fuelCost;
    const toll = mockTripRecord.tollFee;
    const repairCost = mockTripRecord.repairCost;
    
    const estimatedDistance = mockTripRecord.estimatedDistance;
    const distanceCheck = estimatedDistance * distanceRate;
    
    const driverExpenses = allowance + distanceCheck + suppliesCost;
    const companyExpenses = fuel + toll + repairCost;
    const totalCosts = driverExpenses + companyExpenses;
    
    const testResults = {
      success: true,
      distanceRate,
      mockData: mockTripRecord,
      calculations: {
        estimatedDistance,
        distanceCheck: Math.round(distanceCheck * 100) / 100,
        allowance,
        suppliesCost,
        fuel,
        toll,
        repairCost,
        driverExpenses: Math.round(driverExpenses * 100) / 100,
        companyExpenses: Math.round(companyExpenses * 100) / 100,
        totalCosts: Math.round(totalCosts * 100) / 100
      },
      formula: `ค่าระยะทาง = ระยะทางจากระบบ (${estimatedDistance}) × อัตรา (${distanceRate}) = ${Math.round(distanceCheck * 100) / 100} บาท`
    };
    
    console.log('✅ Test Results:', testResults);
    
    return NextResponse.json(testResults);
    
  } catch (error) {
    console.error('🚨 Test Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}