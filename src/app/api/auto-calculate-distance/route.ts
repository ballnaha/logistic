import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOOGLE_DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// พิกัดบริษัท PSC
const COMPANY_LAT = 13.537051;
const COMPANY_LONG = 100.2173051;

// ฟังก์ชันอัปเดตการใช้งาน Google Maps (แบบ optional)
async function updateGoogleMapsUsage(type: 'distance', count: number = 1) {
  setTimeout(async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, count })
      });
      
      if (response.ok) {
        console.log(`✅ Quota tracking updated: ${type} +${count}`);
      }
    } catch (error: any) {
      console.log('⚠️ Quota tracking unavailable, continuing without tracking');
    }
  }, 150);
}

// ฟังก์ชันคำนวณระยะทางจาก Google Maps Distance Matrix API
async function calculateDistanceFromGoogle(
  customerLat: number,
  customerLng: number
): Promise<{ distance: number; duration: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key not configured');
    return null;
  }

  try {
    const origins = `${COMPANY_LAT},${COMPANY_LONG}`;
    const destinations = `${customerLat},${customerLng}`;
    
    const url = `${GOOGLE_DISTANCE_MATRIX_API_URL}?origins=${origins}&destinations=${destinations}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=th`;
    
    console.log('🚗 Calling Google Distance Matrix API...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Google Distance Matrix API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.error(`Google Distance Matrix error: ${data.status}`);
      if (data.status === 'OVER_QUERY_LIMIT') {
        console.error('⚠️ Google Maps quota exceeded');
      }
      return null;
    }

    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      console.error('No valid route found');
      return null;
    }

    // ระยะทางในเมตร แปลงเป็นกิโลเมตร
    const distanceInKm = element.distance.value / 1000;
    // ระยะเวลาในวินาที
    const durationInSeconds = element.duration.value;

    console.log(`✅ Distance: ${distanceInKm.toFixed(2)} km, Duration: ${Math.round(durationInSeconds / 60)} min`);

    // อัปเดตการใช้งาน quota
    updateGoogleMapsUsage('distance', 1);

    return {
      distance: parseFloat(distanceInKm.toFixed(2)),
      duration: durationInSeconds
    };
  } catch (error) {
    console.error('Error calculating distance from Google:', error);
    return null;
  }
}

// POST: คำนวณระยะทางสำหรับลูกค้า 1 รายตาม customer code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerCode } = body;

    if (!customerCode) {
      return NextResponse.json(
        { success: false, error: 'Customer code is required' },
        { status: 400 }
      );
    }

    // ค้นหาลูกค้าจากฐานข้อมูล
    const customer = await prisma.customer.findUnique({
      where: { cmCode: customerCode }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ามีพิกัดหรือไม่
    if (!customer.lat || !customer.long) {
      return NextResponse.json(
        { success: false, error: 'Customer does not have GPS coordinates' },
        { status: 400 }
      );
    }

    const lat = parseFloat(customer.lat.toString());
    const lng = parseFloat(customer.long.toString());

    // คำนวณระยะทางจาก Google Maps
    const result = await calculateDistanceFromGoogle(lat, lng);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to calculate distance from Google Maps' },
        { status: 500 }
      );
    }

    // อัปเดตระยะทางในฐานข้อมูล
    const updatedCustomer = await prisma.customer.update({
      where: { cmCode: customerCode },
      data: {
        cmMileage: result.distance
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        customerCode: updatedCustomer.cmCode,
        customerName: updatedCustomer.cmName,
        distance: result.distance,
        duration: result.duration,
        durationMinutes: Math.round(result.duration / 60),
        previousDistance: customer.cmMileage ? parseFloat(customer.cmMileage.toString()) : null
      }
    });

  } catch (error: any) {
    console.error('Error in auto-calculate-distance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET: ดึงรายการลูกค้าทั้งหมดที่มีพิกัด GPS
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all' | 'no-distance' | 'with-distance'
    
    let whereCondition: any = {
      AND: [
        { lat: { not: null } },
        { long: { not: null } },
        { isActive: true }
      ]
    };

    // ถ้าระบุ filter
    if (filter === 'no-distance') {
      // เฉพาะลูกค้าที่ยังไม่มีระยะทาง
      whereCondition.AND.push({
        OR: [
          { cmMileage: null },
          { cmMileage: 0 }
        ]
      });
    } else if (filter === 'with-distance') {
      // เฉพาะลูกค้าที่มีระยะทางแล้ว
      whereCondition.AND.push({
        AND: [
          { cmMileage: { not: null } },
          { cmMileage: { gt: 0 } }
        ]
      });
    }
    // ถ้าไม่ระบุ filter หรือเป็น 'all' จะดึงทั้งหมดที่มี GPS

    const customers = await prisma.customer.findMany({
      where: whereCondition,
      select: {
        id: true,
        cmCode: true,
        cmName: true,
        cmAddress: true,
        cmPhone: true,
        cmSalesname: true,
        lat: true,
        long: true,
        cmMileage: true,
      },
      orderBy: {
        cmCode: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      count: customers.length,
      filter: filter || 'all',
      data: customers.map(c => ({
        id: c.id,
        customerCode: c.cmCode,
        customerName: c.cmName,
        address: c.cmAddress,
        phone: c.cmPhone,
        salesname: c.cmSalesname,
        lat: c.lat ? parseFloat(c.lat.toString()) : null,
        lng: c.long ? parseFloat(c.long.toString()) : null,
        currentDistance: c.cmMileage ? parseFloat(c.cmMileage.toString()) : null
      }))
    });

  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
