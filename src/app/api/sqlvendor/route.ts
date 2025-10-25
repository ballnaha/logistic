import { NextRequest, NextResponse } from 'next/server';
import { getAllVendorsNoPaging } from '../../../lib/sqlvendor';

// GET - ดึงรายการผู้รับจ้างช่วงทั้งหมดจาก SQL Server
export async function GET(request: NextRequest) {
  try {
    const vendors = await getAllVendorsNoPaging();
    
    // แปลงข้อมูลให้เหมาะสมสำหรับ dropdown
    const vendorOptions = vendors.map(vendor => ({
      code: vendor.VendorCode || '',
      name: vendor.Name1 || '',
      fullName: `${vendor.VendorCode || ''} - ${vendor.Name1 || ''}`,
      address: `${vendor.Street4 || ''} ${vendor.Street5 || ''} ${vendor.District || ''} ${vendor.City || ''}`.trim(),
      group: vendor.VendorGroup || '',
      purchaseOrg: vendor.PurchaseOrg || '',
      email: vendor.Email || '',
      telephone: vendor.Telephone || '',
    }));

    return NextResponse.json({
      success: true,
      data: vendorOptions,
    });
  } catch (error) {
    console.error('Error fetching vendors from SQL Server:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลผู้รับจ้างช่วงจาก SQL Server ได้' 
      },
      { status: 500 }
    );
  }
}
