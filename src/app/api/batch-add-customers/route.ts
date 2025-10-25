import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOOGLE_DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const GOOGLE_GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// พิกัดบริษัท PSC
const COMPANY_LAT = 13.537051;
const COMPANY_LONG = 100.2173051;

// ฟังก์ชันอัปเดตการใช้งาน Google Maps
async function updateGoogleMapsUsage(type: 'geocoding' | 'distance', count: number) {
  setTimeout(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, count })
      });
    } catch (error) {
      console.log('⚠️ Quota tracking unavailable');
    }
  }, 150);
}

// ฟังก์ชันค้นหาพิกัดจากที่อยู่
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_MAPS_API_KEY || !address) {
    return null;
  }

  try {
    const url = `${GOOGLE_GEOCODING_API_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&region=th&language=th&components=country:TH`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      updateGoogleMapsUsage('geocoding', 1);
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

// ฟังก์ชันคำนวณระยะทางจาก Google Maps Distance Matrix API
async function calculateDistance(lat: number, lng: number): Promise<number | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    const origins = `${COMPANY_LAT},${COMPANY_LONG}`;
    const destinations = `${lat},${lng}`;
    
    const url = `${GOOGLE_DISTANCE_MATRIX_API_URL}?origins=${origins}&destinations=${destinations}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=th`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const distanceInKm = data.rows[0].elements[0].distance.value / 1000;
      updateGoogleMapsUsage('distance', 1);
      return parseFloat(distanceInKm.toFixed(2));
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}

// POST: บันทึกและคำนวณระยะทางลูกค้าหลายรายพร้อมกัน
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customers, createdBy } = body;

    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customers array is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Processing ${customers.length} customers...`);

    const results = [];
    const errors = [];

    for (const customerData of customers) {
      try {
        const { code, name, address, phone, salesname } = customerData;

        if (!code || !name) {
          errors.push({
            code: code || 'Unknown',
            name: name || 'Unknown',
            error: 'ข้อมูลไม่ครบถ้วน (ต้องมีรหัสและชื่อ)'
          });
          continue;
        }

        // ตรวจสอบว่ามีลูกค้านี้ในระบบแล้วหรือไม่
        const existingCustomer = await prisma.customer.findUnique({
          where: { cmCode: code }
        });

        if (existingCustomer) {
          results.push({
            code,
            name,
            status: 'skipped',
            message: 'มีในระบบแล้ว',
            distance: existingCustomer.cmMileage ? parseFloat(existingCustomer.cmMileage.toString()) : null
          });
          continue;
        }

        // ค้นหาพิกัด GPS จากที่อยู่
        let lat: number | null = null;
        let lng: number | null = null;
        let distance: number | null = null;

        if (address && address.trim()) {
          console.log(`🔍 Geocoding address for ${code}...`);
          const coords = await geocodeAddress(address);
          
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;

            // คำนวณระยะทาง
            console.log(`📏 Calculating distance for ${code}...`);
            distance = await calculateDistance(lat, lng);
          }

          // รอ 200ms เพื่อไม่ให้เรียก API เร็วเกินไป
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // บันทึกลงฐานข้อมูล
        const newCustomer = await prisma.customer.create({
          data: {
            cmCode: code,
            cmName: name,
            cmAddress: address || null,
            cmPhone: phone || null,
            cmSalesname: salesname || null,
            lat: lat,
            long: lng,
            cmMileage: distance,
            isActive: true,
            createdBy: createdBy || 'System',
            updatedBy: createdBy || 'System'
          }
        });

        results.push({
          code,
          name,
          status: 'success',
          message: 'บันทึกสำเร็จ',
          hasGps: lat && lng ? true : false,
          distance: distance,
          lat: lat,
          lng: lng
        });

        console.log(`✅ Created customer ${code} ${distance ? `with distance ${distance} km` : 'without GPS'}`);

      } catch (error: any) {
        console.error(`Error processing customer ${customerData.code}:`, error);
        errors.push({
          code: customerData.code || 'Unknown',
          name: customerData.name || 'Unknown',
          error: error.message || 'เกิดข้อผิดพลาด'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const withGpsCount = results.filter(r => r.status === 'success' && r.hasGps).length;
    const withDistanceCount = results.filter(r => r.status === 'success' && r.distance !== null).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: customers.length,
        success: successCount,
        skipped: skippedCount,
        failed: errors.length,
        withGps: withGpsCount,
        withDistance: withDistanceCount
      },
      results,
      errors
    });

  } catch (error: any) {
    console.error('Error in batch-add-customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
