import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const GOOGLE_DISTANCE_MATRIX_API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// พิกัดบริษัท PSC
const COMPANY_LAT = 13.537051;
const COMPANY_LONG = 100.2173051;

// ฟังก์ชันอัปเดตการใช้งาน Google Maps
async function updateGoogleMapsUsage(count: number) {
  setTimeout(async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/quota-tracker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'distance', count })
      });
    } catch (error) {
      console.log('⚠️ Quota tracking unavailable');
    }
  }, 150);
}

// ฟังก์ชันคำนวณระยะทางหลายจุดพร้อมกัน (batch)
async function calculateBatchDistances(
  destinations: Array<{ id: number; lat: number; lng: number; code: string }>
): Promise<Array<{ id: number; code: string; distance: number | null; duration: number | null; error?: string }>> {
  
  if (!GOOGLE_MAPS_API_KEY) {
    return destinations.map(d => ({
      id: d.id,
      code: d.code,
      distance: null,
      duration: null,
      error: 'Google Maps API key not configured'
    }));
  }

  // Google Distance Matrix API รองรับสูงสุด 25 destinations ต่อ request
  const BATCH_SIZE = 25;
  const results: Array<{ id: number; code: string; distance: number | null; duration: number | null; error?: string }> = [];

  for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
    const batch = destinations.slice(i, i + BATCH_SIZE);
    
    try {
      const origins = `${COMPANY_LAT},${COMPANY_LONG}`;
      const destinationsParam = batch.map(d => `${d.lat},${d.lng}`).join('|');
      
      const url = `${GOOGLE_DISTANCE_MATRIX_API_URL}?origins=${origins}&destinations=${destinationsParam}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=th`;
      
      console.log(`🚗 Calling Google Distance Matrix API for batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        batch.forEach(d => {
          results.push({
            id: d.id,
            code: d.code,
            distance: null,
            duration: null,
            error: `API error: ${response.status}`
          });
        });
        continue;
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        batch.forEach(d => {
          results.push({
            id: d.id,
            code: d.code,
            distance: null,
            duration: null,
            error: `API status: ${data.status}`
          });
        });
        continue;
      }

      // ประมวลผลแต่ละ destination
      const elements = data.rows[0]?.elements || [];
      batch.forEach((dest, index) => {
        const element = elements[index];
        
        if (element && element.status === 'OK') {
          const distanceInKm = element.distance.value / 1000;
          const durationInSeconds = element.duration.value;
          
          results.push({
            id: dest.id,
            code: dest.code,
            distance: parseFloat(distanceInKm.toFixed(2)),
            duration: durationInSeconds
          });
        } else {
          results.push({
            id: dest.id,
            code: dest.code,
            distance: null,
            duration: null,
            error: element?.status || 'Unknown error'
          });
        }
      });

      // อัปเดต quota
      updateGoogleMapsUsage(batch.length);

      // รอสักครู่เพื่อไม่ให้ส่ง request เร็วเกินไป
      if (i + BATCH_SIZE < destinations.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }

    } catch (error: any) {
      console.error('Error in batch:', error);
      batch.forEach(d => {
        results.push({
          id: d.id,
          code: d.code,
          distance: null,
          duration: null,
          error: error.message
        });
      });
    }
  }

  return results;
}

// POST: อัปเดตระยะทางหลายรายพร้อมกัน
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerCodes } = body;

    if (!customerCodes || !Array.isArray(customerCodes) || customerCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer codes array is required' },
        { status: 400 }
      );
    }

    // ค้นหาลูกค้าทั้งหมดที่ระบุ
    const customers = await prisma.customer.findMany({
      where: {
        cmCode: { in: customerCodes }
      },
      select: {
        id: true,
        cmCode: true,
        cmName: true,
        lat: true,
        long: true,
        cmMileage: true
      }
    });

    // แยกลูกค้าที่ไม่พบในฐานข้อมูล
    const notFoundCodes = customerCodes.filter(
      code => !customers.find(c => c.cmCode === code)
    );

    // กรองเฉพาะลูกค้าที่มีพิกัด
    const validCustomers = customers.filter(c => c.lat && c.long);
    
    // แยกลูกค้าที่ไม่มีพิกัด
    const noGpsCustomers = customers.filter(c => !c.lat || !c.long);

    // ถ้าไม่มีลูกค้าที่สามารถคำนวณได้เลย
    if (validCustomers.length === 0) {
      const messages = [];
      
      if (notFoundCodes.length > 0) {
        messages.push(`ไม่พบในระบบ: ${notFoundCodes.join(', ')}`);
      }
      
      if (noGpsCustomers.length > 0) {
        messages.push(`ไม่มีพิกัด GPS: ${noGpsCustomers.map(c => c.cmCode).join(', ')}`);
      }

      return NextResponse.json({
        success: false,
        error: 'ไม่มีลูกค้าที่สามารถคำนวณระยะทางได้',
        details: messages.join(' | '),
        notFound: notFoundCodes,
        noGps: noGpsCustomers.map(c => ({ code: c.cmCode, name: c.cmName }))
      }, { status: 400 });
    }

    // เตรียมข้อมูลสำหรับคำนวณ
    const destinations = validCustomers.map(c => ({
      id: c.id,
      code: c.cmCode,
      lat: parseFloat(c.lat!.toString()),
      lng: parseFloat(c.long!.toString())
    }));

    console.log(`📊 Processing ${destinations.length} customers for distance calculation...`);

    // คำนวณระยะทางแบบ batch
    const calculationResults = await calculateBatchDistances(destinations);

    // อัปเดตฐานข้อมูล
    const updatePromises = calculationResults
      .filter(r => r.distance !== null)
      .map(result =>
        prisma.customer.update({
          where: { id: result.id },
          data: { cmMileage: result.distance }
        })
      );

    await Promise.all(updatePromises);

    // สรุปผลลัพธ์
    const successful = calculationResults.filter(r => r.distance !== null);
    const failed = calculationResults.filter(r => r.distance === null);

    return NextResponse.json({
      success: true,
      summary: {
        total: customerCodes.length,
        requested: customerCodes.length,
        found: customers.length,
        validGps: validCustomers.length,
        calculated: calculationResults.length,
        successful: successful.length,
        failed: failed.length,
        notFound: notFoundCodes.length,
        noGps: noGpsCustomers.length
      },
      warnings: {
        notFoundCodes: notFoundCodes,
        noGpsCustomers: noGpsCustomers.map(c => ({ code: c.cmCode, name: c.cmName }))
      },
      results: calculationResults.map(r => {
        const customer = validCustomers.find(c => c.id === r.id);
        return {
          customerCode: r.code,
          customerName: customer?.cmName,
          distance: r.distance,
          durationMinutes: r.duration ? Math.round(r.duration / 60) : null,
          previousDistance: customer?.cmMileage ? parseFloat(customer.cmMileage.toString()) : null,
          status: r.distance !== null ? 'success' : 'failed',
          error: r.error
        };
      })
    });

  } catch (error: any) {
    console.error('Error in batch-update-distance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
