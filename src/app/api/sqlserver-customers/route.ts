import { NextRequest, NextResponse } from 'next/server';
import { getAllCustomersNoPaging } from '../../../lib/sqlserver';

// GET - ดึงรายการลูกค้าทั้งหมดจาก SQL Server
export async function GET(request: NextRequest) {
  try {
    const customers = await getAllCustomersNoPaging();
    
    // แปลงข้อมูลให้เหมาะสมสำหรับ dropdown
    const customerOptions = customers.map(customer => ({
      code: customer.BusinessPartnerCustomerCode || '',
      name: customer.Name_1 || '',
      fullName: `${customer.BusinessPartnerCustomerCode || ''} - ${customer.Name_1 || ''}`,
      address: `${customer.Street || ''} ${customer.District || ''} ${customer.City || ''}`.trim(),
      phone: customer.TelephoneNoMobilePhone || '', // เพิ่มข้อมูลเบอร์โทรศัพท์
    }));

    return NextResponse.json({
      success: true,
      data: customerOptions,
    });
  } catch (error) {
    console.error('Error fetching customers from SQL Server:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถดึงข้อมูลลูกค้าจาก SQL Server ได้' 
      },
      { status: 500 }
    );
  }
}
