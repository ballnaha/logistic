import { NextRequest, NextResponse } from 'next/server';

// Google Maps Distance Matrix API
const GOOGLE_DISTANCE_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// OpenStreetMap OSRM API (fallback)
const OSRM_API_URL = 'https://router.project-osrm.org/route/v1/driving';

// ฟังก์ชันอัปเดตการใช้งาน Google Maps (แบบ optional - ไม่บล็อกการทำงาน)
async function updateGoogleMapsUsage(type: 'geocoding' | 'distance', count: number = 1) {
  // ใช้ setTimeout เพื่อไม่ให้บล็อก main request และจับ error ได้ดีขึ้น
  setTimeout(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, count })
      });
      
      if (response.ok) {
        console.log(`✅ Quota tracking updated: ${type} +${count}`);
      } else {
        console.log(`⚠️ Quota tracker responded with ${response.status}, continuing without tracking`);
      }
    } catch (error: any) {
      // ซ่อน error details ที่ไม่จำเป็น เพื่อไม่ให้ console รกเกินไป
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️ Quota tracker offline, continuing without tracking');
      } else {
        console.log('⚠️ Quota tracking unavailable, continuing without tracking');
      }
    }
  }, 150); // เพิ่มเวลารอเป็น 150ms เพื่อให้ main request ส่งกลับก่อน
}

// ฟังก์ชันคำนวณระยะทางด้วย Google Maps Distance Matrix
async function calculateDistanceWithGoogle(
  originLat: number, 
  originLng: number, 
  destLat: number, 
  destLng: number,
  options: {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    avoid?: string[];
    trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  } = {}
): Promise<{ distance: number; duration?: number; source: string }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }

  const origins = `${originLat},${originLng}`;
  const destinations = `${destLat},${destLng}`;

  // ตั้งค่าพารามิเตอร์สำหรับความแม่นยำสูงสุด
  const {
    mode = 'driving',
    avoid = [],
    trafficModel = 'best_guess'
  } = options;

  let urlParams = new URLSearchParams({
    origins,
    destinations,
    units: 'metric',
    mode,
    traffic_model: trafficModel,
    departure_time: 'now',
    key: GOOGLE_MAPS_API_KEY || '',
    region: 'th',
    language: 'th'
  });

  // เพิ่มพารามิเตอร์ avoid ถ้ามี
  if (avoid.length > 0) {
    urlParams.append('avoid', avoid.join('|'));
  }

  const url = `${GOOGLE_DISTANCE_API_URL}?${urlParams.toString()}`;

  console.log('🌐 Google Distance Matrix URL:', url.replace(GOOGLE_MAPS_API_KEY || '', 'API_KEY_HIDDEN'));
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Google Distance Matrix API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🌐 Google Distance Matrix response:', JSON.stringify(data, null, 2));

  if (data.status !== 'OK') {
    if (data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('OVER_QUOTA');
    }
    throw new Error(`Google Distance Matrix error: ${data.status}`);
  }

  const element = data.rows[0]?.elements[0];
  
  if (!element || element.status !== 'OK') {
    throw new Error(`No route found: ${element?.status || 'UNKNOWN'}`);
  }

  // อัปเดตการใช้งานโควต้า (แบบ async ไม่บล็อก)
  updateGoogleMapsUsage('distance', 1);

  const distanceKm = element.distance.value / 1000;
  console.log(`✅ Google Maps distance: ${element.distance.text} (${distanceKm.toFixed(2)} km)`);
  console.log(`⏱️ Google Maps duration: ${element.duration?.text} (${element.duration?.value} seconds)`);

  // ใช้ระยะทางแบบทศนิยม 1 ตำแหน่งเพื่อความสม่ำเสมอ
  const preciseDistance = Math.round(distanceKm * 10) / 10; // ปัดเศษ 1 ตำแหน่ง

  return {
    distance: preciseDistance, // ระยะทางจาก Google Maps (1 ทศนิยม)
    duration: element.duration?.value, // เวลาเป็นวินาที
    source: 'google'
  };
}

// ฟังก์ชันคำนวณระยะทางด้วย OSRM (OpenStreetMap)
async function calculateDistanceWithOSRM(
  originLat: number, 
  originLng: number, 
  destLat: number, 
  destLng: number
): Promise<{ distance: number; duration?: number; source: string }> {
  const url = `${OSRM_API_URL}/${originLng},${originLat};${destLng},${destLat}?overview=false&steps=false`;

  console.log('🗺️ OSRM URL:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`OSRM API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🗺️ OSRM response:', JSON.stringify(data, null, 2));

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];
  const distanceKm = route.distance / 1000;
  
  console.log(`✅ OSRM distance: ${distanceKm.toFixed(2)} km`);
  console.log(`⏱️ OSRM duration: ${route.duration} seconds`);

  // ปัดเศษเป็นทศนิยม 1 ตำแหน่งเพื่อความสม่ำเสมอ
  const preciseDistance = Math.round(distanceKm * 10) / 10;

  return {
    distance: preciseDistance, // ระยะทางจาก OSRM (1 ทศนิยม)
    duration: route.duration, // เวลาเป็นวินาที
    source: 'openstreetmap'
  };
}

// ฟังก์ชันคำนวณระยะทางแบบเส้นตรง (Haversine formula)
function calculateHaversineDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // รัศมีโลกในกิโลเมตร
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originLat, originLng, destLat, destLng } = body;

    // ตรวจสอบ input
    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'กรุณาระบุพิกัดต้นทางและปลายทางครบถ้วน' 
        },
        { status: 400 }
      );
    }

    const origLat = parseFloat(originLat);
    const origLng = parseFloat(originLng);
    const dstLat = parseFloat(destLat);
    const dstLng = parseFloat(destLng);

    // ตรวจสอบว่าพิกัดถูกต้อง
    if (isNaN(origLat) || isNaN(origLng) || isNaN(dstLat) || isNaN(dstLng)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'พิกัดไม่ถูกต้อง' 
        },
        { status: 400 }
      );
    }

    let result: { distance: number; duration?: number; source: string };
    let quotaMessage = '';

    // ลองใช้ Google Maps เป็นหลัก
    if (GOOGLE_MAPS_API_KEY) {
      try {
        console.log('Using Google Maps Distance Matrix API...');
        console.log(`📏 Distance calculation: (${origLat}, ${origLng}) → (${dstLat}, ${dstLng})`);
        
        // ตั้งค่าสำหรับการขนส่งพัสดุ (หลีกเลี่ยงทางด่วนที่มีค่าทางด่วน)
        const routingOptions = {
          mode: 'driving' as const,
          avoid: [], // ไม่หลีกเลี่ยงอะไรเพื่อให้ได้เส้นทางที่เร็วที่สุด
          trafficModel: 'best_guess' as const
        };
        
        result = await calculateDistanceWithGoogle(origLat, origLng, dstLat, dstLng, routingOptions);
        quotaMessage = '🌟 ใช้ Google Maps สำหรับความแม่นยำสูงสุด (รวมสภาพการจราจร)';
      } catch (error: any) {
        console.log('Google Maps failed, falling back to OSRM:', error.message);
        
        if (error.message === 'OVER_QUOTA') {
          quotaMessage = '⚠️ เกินโควต้า Google Maps แล้ว ใช้ OpenStreetMap แทน';
        } else {
          quotaMessage = '⚠️ Google Maps ไม่สามารถใช้งานได้ ใช้ OpenStreetMap แทน';
        }
        
        // ลอง OSRM
        try {
          result = await calculateDistanceWithOSRM(origLat, origLng, dstLat, dstLng);
        } catch (osrmError) {
          console.log('OSRM also failed, using Haversine fallback');
          quotaMessage = '⚠️ ไม่สามารถใช้ routing API ได้ ใช้การคำนวณแบบเส้นตรง';
          result = {
            distance: calculateHaversineDistance(origLat, origLng, dstLat, dstLng),
            source: 'haversine'
          };
        }
      }
    } else {
      // ไม่มี Google Maps API key ให้ใช้ OSRM
      quotaMessage = '📍 ใช้ OpenStreetMap เนื่องจากไม่มี Google Maps API key';
      
      try {
        console.log('No Google Maps API key, using OSRM...');
        result = await calculateDistanceWithOSRM(origLat, origLng, dstLat, dstLng);
      } catch (osrmError) {
        console.log('OSRM failed, using Haversine fallback');
        quotaMessage = '⚠️ ไม่สามารถใช้ routing API ได้ ใช้การคำนวณแบบเส้นตรง';
        result = {
          distance: calculateHaversineDistance(origLat, origLng, dstLat, dstLng),
          source: 'haversine'
        };
      }
    }

    // ใช้ทศนิยม 1 ตำแหน่งสำหรับทุก source เพื่อความสม่ำเสมอ
    const finalDistance = Math.round(result.distance * 10) / 10; // 1 ตำแหน่งทศนิยมทุก source
    
    // แจ้งเตือนถ้าระยะทางดูผิดปกติ
    let warningMessage = '';
    if (finalDistance > 500) {
      warningMessage = '⚠️ ระยะทางดูมากเกินไป อาจมีข้อผิดพลาดในพิกัด';
      console.warn(`🚨 Suspicious distance: ${finalDistance} km - please check coordinates`);
    } else if (finalDistance < 0.1) {
      warningMessage = '⚠️ ระยะทางน้อยมาก อาจเป็นจุดเดียวกัน';
      console.warn(`🚨 Very short distance: ${finalDistance} km - coordinates might be the same`);
    }

    return NextResponse.json({
      success: true,
      data: {
        distance: finalDistance, // ปัดเศษ 1 ตำแหน่ง
        duration: result.duration,
        source: result.source,
        unit: 'km',
        warning: warningMessage
      },
      message: `คำนวณระยะทางสำเร็จ: ${finalDistance} กม.${warningMessage ? ' ' + warningMessage : ''}`,
      meta: {
        source: result.source,
        quota_message: quotaMessage,
        is_google_maps: result.source === 'google',
        coordinates: {
          origin: { lat: origLat, lng: origLng },
          destination: { lat: dstLat, lng: dstLng }
        }
      }
    });

  } catch (error: any) {
    console.error('Distance calculation error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'เกิดข้อผิดพลาดในการคำนวณระยะทาง กรุณาลองใหม่อีกครั้ง',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// GET สำหรับทดสอบ
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originLat = searchParams.get('originLat');
  const originLng = searchParams.get('originLng');
  const destLat = searchParams.get('destLat');
  const destLng = searchParams.get('destLng');

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'กรุณาระบุ originLat, originLng, destLat, destLng ใน query parameters' 
      },
      { status: 400 }
    );
  }

  // เรียกใช้ POST method เดียวกัน
  return POST(new NextRequest(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originLat: parseFloat(originLat),
      originLng: parseFloat(originLng),
      destLat: parseFloat(destLat),
      destLng: parseFloat(destLng)
    })
  }));
}
