import { NextRequest, NextResponse } from 'next/server';
import { searchVendorsByName } from '../../../../lib/sqlvendor';

// Real-time vendor search API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!query.trim()) {
      return NextResponse.json({
        data: [],
        total: 0
      });
    }

    // ค้นหา vendor จาก SQL Server
    const vendors = await searchVendorsByName(query);
    
    // จำกัดจำนวนผลลัพธ์
    const limitedResults = vendors.slice(0, limit);
    
    // แปลงเป็น format ที่ต้องการ
    const vendorOptions = limitedResults.map((vendor) => ({
      code: vendor.VendorCode || '',
      name: vendor.Name1 || '',
      fullName: `${vendor.VendorCode} - ${vendor.Name1}`,
      address: vendor.Address || '',
      group: vendor.VendorGroup || '',
      purchaseOrg: vendor.PurchaseOrg || '',
      email: vendor.Email || '',
      telephone: vendor.Telephone || ''
    }));
    
    return NextResponse.json({
      data: vendorOptions,
      total: vendors.length,
      hasMore: vendors.length > limit
    });
  } catch (error: any) {
    console.error('Error searching vendors:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการค้นหาผู้รับจ้างช่วง', error: error.message },
      { status: 500 }
    );
  }
}
