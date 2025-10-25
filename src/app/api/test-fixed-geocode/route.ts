import { NextRequest, NextResponse } from 'next/server';

// เรียกใช้ geocoding function โดยตรง
async function testGeocoding(address: string, companyName: string) {
  const body = JSON.stringify({ address, companyName });
  const request = new NextRequest('http://localhost:3002/api/geocoding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  });
  
  // Import และเรียกใช้ POST handler โดยตรง
  const { POST: geocodingPOST } = await import('../geocoding/route');
  return await geocodingPOST(request);
}

// เรียกใช้ distance function โดยตรง  
async function testDistance(originLat: number, originLng: number, destLat: number, destLng: number) {
  const body = JSON.stringify({ originLat, originLng, destLat, destLng });
  const request = new NextRequest('http://localhost:3002/api/distance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body
  });
  
  // Import และเรียกใช้ POST handler โดยตรง
  const { POST: distancePOST } = await import('../distance/route');
  return await distancePOST(request);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName = 'บริษัท เค. เอส โลหะการพิมพ์ จำกัด', address = '27 หมู่ 4 ถนนพหลโยธิน จ. ปทุมธานี' } = body;

    console.log('🧪 Testing fixed geocoding with:', { companyName, address });

    // เรียกใช้ geocoding function โดยตรงแทนการ fetch
    const geocodingResponse = await testGeocoding(address, companyName);
    const geocodingResult = await geocodingResponse.json();

    if (!geocodingResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Geocoding failed',
        details: geocodingResult.error
      });
    }

    const location = geocodingResult.data[0];
    
    // ตรวจสอบว่าอยู่ในปทุมธานี
    const isInPathumThani = location.lat >= 13.8 && location.lat <= 14.2 && location.lng >= 100.4 && location.lng <= 100.7;

    if (!isInPathumThani) {
      return NextResponse.json({
        success: false,
        error: 'Location not in Pathum Thani',
        location: location,
        details: `Coordinates: ${location.lat}, ${location.lng} are outside Pathum Thani bounds`
      });
    }

    // ทดสอบระยะทาง โดยเรียกใช้ function โดยตรง
    const distanceResponse = await testDistance(13.537051, 100.2173051, location.lat, location.lng);
    const distanceResult = await distanceResponse.json();

    if (!distanceResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Distance calculation failed',
        details: distanceResult.error
      });
    }

    const distance = distanceResult.data.distance;
    const isReasonableDistance = distance >= 70 && distance <= 110; // ±20% of 88.5 km

    return NextResponse.json({
      success: true,
      data: {
        geocoding: {
          query_used: location.query_used,
          formatted_address: location.formatted_address,
          coordinates: {
            lat: location.lat,
            lng: location.lng
          },
          is_in_pathum_thani: isInPathumThani
        },
        distance: {
          value: distance,
          unit: 'km',
          source: distanceResult.data.source,
          is_reasonable: isReasonableDistance,
          expected_range: '70-110 km',
          target_distance: 88.5
        },
        validation: {
          coordinates_valid: isInPathumThani,
          distance_valid: isReasonableDistance,
          overall_success: isInPathumThani && isReasonableDistance
        }
      },
      message: `✅ Fixed geocoding test: ${isInPathumThani && isReasonableDistance ? 'SUCCESS' : 'NEEDS_ADJUSTMENT'}`
    });

  } catch (error: any) {
    console.error('Fixed geocoding test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
