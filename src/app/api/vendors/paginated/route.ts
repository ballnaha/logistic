import { NextRequest, NextResponse } from 'next/server';
import { getVendorsPaginated } from '../../../../lib/sqlvendor';

// Paginated vendor API for better performance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search') || '';
    
    // ดึงข้อมูล vendor จาก SQL Server
    const result = await getVendorsPaginated(page, limit, search);
    
    // แปลงเป็น format ที่ต้องการ
    const vendorOptions = result.vendors.map((vendor) => ({
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
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasMore: (page * limit) < result.total
      }
    });
  } catch (error: any) {
    console.error('Error fetching paginated vendors:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้รับจ้างช่วง', error: error.message },
      { status: 500 }
    );
  }
}
