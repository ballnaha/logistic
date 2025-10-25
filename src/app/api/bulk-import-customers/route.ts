import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCustomersByCodeRange } from '../../../lib/sqlserver';

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
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/api/quota-tracker`, {
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
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
}

// ฟังก์ชันคำนวณระยะทางจาก Google Maps
async function calculateDistance(originLat: number, originLng: number, destLat: number, destLng: number): Promise<{ distance: number; duration: number } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    const url = `${GOOGLE_DISTANCE_MATRIX_API_URL}?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&key=${GOOGLE_MAPS_API_KEY}&mode=driving&language=th`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      updateGoogleMapsUsage('distance', 1);
      
      const element = data.rows[0].elements[0];
      return {
        distance: parseFloat((element.distance.value / 1000).toFixed(2)), // แปลงเป็นกิโลเมตร
        duration: element.duration.value // วินาที
      };
    }
  } catch (error) {
    console.error('Distance calculation error:', error);
  }
  
  return null;
}

// POST: นำเข้าลูกค้าจาก SQL Server ตาม code range และคำนวณระยะทางพร้อมกัน
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startCode, endCode, createdBy, previewOnly = false } = body;

    if (!startCode || !endCode) {
      return NextResponse.json(
        { success: false, error: 'startCode และ endCode จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    console.log(`📊 ${previewOnly ? 'Preview' : 'Import'} ลูกค้าจากรหัส ${startCode} ถึง ${endCode}...`);

    // ดึงข้อมูลลูกค้าจาก SQL Server ตาม range
    const sqlCustomers = await getCustomersByCodeRange(startCode, endCode);
    
    // ถ้าเป็น preview mode ให้ return เฉพาะจำนวน
    if (previewOnly) {
      return NextResponse.json({
        success: true,
        summary: {
          total: sqlCustomers.length
        }
      });
    }

    if (sqlCustomers.length === 0) {
      return NextResponse.json({
        success: true,
        message: `ไม่พบลูกค้าในช่วงรหัส ${startCode} - ${endCode}`,
        summary: {
          total: 0,
          success: 0,
          skipped: 0,
          withGps: 0,
          withDistance: 0,
          failed: 0
        },
        results: []
      });
    }

    console.log(`📄 พบลูกค้า ${sqlCustomers.length} รายจาก SQL Server`);

    const results = [];
    const errors = [];
    let successCount = 0;
    let skippedCount = 0;
    let withGpsCount = 0;
    let withDistanceCount = 0;
    let failedCount = 0;

    for (const sqlCustomer of sqlCustomers) {
      try {
        const code = sqlCustomer.BusinessPartnerCustomerCode || '';
        const name = sqlCustomer.Name_1 || '';
        
        if (!code || !name) {
          errors.push({
            code: code || 'Unknown',
            name: name || 'Unknown',
            error: 'ข้อมูลไม่ครบถ้วน (ต้องมีรหัสและชื่อ)'
          });
          failedCount++;
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
          skippedCount++;
          continue;
        }

        // สร้างที่อยู่เต็ม
        const fullAddress = `${sqlCustomer.Street || ''} ${sqlCustomer.District || ''} ${sqlCustomer.City || ''}`.trim();

        let gpsData = null;
        let distanceData = null;

        // ถ้ามีที่อยู่ ให้ค้นหาพิกัด GPS
        if (fullAddress) {
          gpsData = await geocodeAddress(fullAddress);
          
          if (gpsData) {
            withGpsCount++;
            
            // คำนวณระยะทางจากพิกัดที่ได้
            distanceData = await calculateDistance(COMPANY_LAT, COMPANY_LONG, gpsData.lat, gpsData.lng);
            
            if (distanceData) {
              withDistanceCount++;
            }
          }
        }

        // บันทึกลูกค้าลงฐานข้อมูล
        const newCustomer = await prisma.customer.create({
          data: {
            cmCode: code,
            cmName: name,
            cmAddress: fullAddress || null,
            cmPhone: sqlCustomer.TelephoneNoMobilePhone || null,
            cmSalesname: '',
            lat: gpsData ? gpsData.lat.toString() : null,
            long: gpsData ? gpsData.lng.toString() : null,
            cmMileage: distanceData ? distanceData.distance : null,
            createdBy: createdBy || 'System',
            isActive: true
          }
        });

        results.push({
          code,
          name,
          status: 'success',
          hasGps: !!gpsData,
          distance: distanceData?.distance || null,
          duration: distanceData?.duration || null,
          address: fullAddress || null
        });

        successCount++;

        // รอสักครู่เพื่อไม่ให้เรียก API เร็วเกินไป
        if (gpsData || distanceData) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error: any) {
        console.error(`Error processing customer ${sqlCustomer.BusinessPartnerCustomerCode}:`, error);
        errors.push({
          code: sqlCustomer.BusinessPartnerCustomerCode || 'Unknown',
          name: sqlCustomer.Name_1 || 'Unknown',
          error: error.message
        });
        failedCount++;
      }
    }

    const summary = {
      total: sqlCustomers.length,
      success: successCount,
      skipped: skippedCount,
      withGps: withGpsCount,
      withDistance: withDistanceCount,
      failed: failedCount
    };

    console.log(`📊 สรุปผลการนำเข้า:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - ลบลูกค้าหลายรายพร้อมกัน
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerIds, customerCodes } = body;

    if ((!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) &&
        (!customerCodes || !Array.isArray(customerCodes) || customerCodes.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'customerIds หรือ customerCodes จำเป็นต้องระบุ' },
        { status: 400 }
      );
    }

    console.log(`🗑️ เริ่มลบลูกค้า ${customerIds?.length || customerCodes?.length} ราย...`);

    // สร้าง where condition
    const whereCondition: any = {};
    if (customerIds && customerIds.length > 0) {
      whereCondition.id = { in: customerIds };
    } else if (customerCodes && customerCodes.length > 0) {
      whereCondition.cmCode = { in: customerCodes };
    }

    // ตรวจสอบลูกค้าที่มีอยู่และลูกค้าที่มี trip records
    const existingCustomers = await prisma.customer.findMany({
      where: whereCondition,
      include: {
        tripRecords: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (existingCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'ไม่พบลูกค้าที่ต้องการลบ'
      }, { status: 404 });
    }

    // แยกลูกค้าที่สามารถลบได้และไม่สามารถลบได้
    const canDelete = existingCustomers.filter(customer => 
      !customer.tripRecords || customer.tripRecords.length === 0
    );
    const cannotDelete = existingCustomers.filter(customer => 
      customer.tripRecords && customer.tripRecords.length > 0
    );

    let deletedCount = 0;
    const results: Array<{id: number; code: string; name: string; status: string}> = [];
    const errors: Array<{id: number; code: string; name: string; error: string}> = [];

    // ลบลูกค้าที่สามารถลบได้
    if (canDelete.length > 0) {
      try {
        const deleteResult = await prisma.customer.deleteMany({
          where: {
            id: { in: canDelete.map(c => c.id) }
          }
        });
        
        deletedCount = deleteResult.count;
        
        canDelete.forEach(customer => {
          results.push({
            id: customer.id,
            code: customer.cmCode,
            name: customer.cmName,
            status: 'deleted'
          });
        });
      } catch (error: any) {
        console.error('Error deleting customers:', error);
        canDelete.forEach(customer => {
          errors.push({
            id: customer.id,
            code: customer.cmCode,
            name: customer.cmName,
            error: 'เกิดข้อผิดพลาดในการลบ'
          });
        });
      }
    }

    // เพิ่มลูกค้าที่ไม่สามารถลบได้
    cannotDelete.forEach(customer => {
      errors.push({
        id: customer.id,
        code: customer.cmCode,
        name: customer.cmName,
        error: 'มีบันทึกการเดินทางที่เกี่ยวข้อง'
      });
    });

    const summary = {
      total: existingCustomers.length,
      deleted: deletedCount,
      failed: cannotDelete.length + (canDelete.length - deletedCount)
    };

    console.log(`📊 สรุปผลการลบ:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
      message: `ลบลูกค้าสำเร็จ ${deletedCount} ราย${cannotDelete.length > 0 ? `, ไม่สามารถลบได้ ${cannotDelete.length} ราย` : ''}`
    });

  } catch (error: any) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}