import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { writeFile, mkdir, unlink } from 'fs/promises';

const prisma = new PrismaClient();

// PUT /api/drivers/[id] - แก้ไขข้อมูลคนขับ
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 });
    }

    // ตรวจสอบว่าคนขับมีอยู่จริง
    const existingDrivers = await prisma.$queryRaw<any[]>`
      SELECT * FROM drivers WHERE id = ${driverId}
    `;

    if (existingDrivers.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const existingDriver = existingDrivers[0];

    const formData = await request.formData();
    const driverName = formData.get('driverName') as string;
    const driverLicense = formData.get('driverLicense') as string;
    const phone = formData.get('phone') as string;
    const remark = formData.get('remark') as string;
    const driverImageFile = formData.get('driverImage') as File | null;

    if (!driverName || !driverLicense) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อคนขับและเลขใบขับขี่' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่าเลขใบขับขี่ซ้ำหรือไม่ (ยกเว้นตัวเอง)
    const duplicateDrivers = await prisma.$queryRaw<{id: number}[]>`
      SELECT id FROM drivers WHERE driver_license = ${driverLicense} AND id != ${driverId}
    `;

    if (duplicateDrivers.length > 0) {
      return NextResponse.json(
        { error: 'เลขใบขับขี่นี้มีอยู่ในระบบแล้ว' },
        { status: 400 }
      );
    }

    let driverImagePath = existingDriver.driver_image;

    // อัปโหลดรูปภาพใหม่ถ้ามี
    if (driverImageFile && driverImageFile.size > 0) {
      const bytes = await driverImageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // สร้าง filename ที่ไม่ซ้ำ
      const timestamp = Date.now();
      const originalName = driverImageFile.name;
      const extension = originalName.split('.').pop();
      const filename = `driver_${timestamp}.${extension}`;
      
      // เส้นทางสำหรับบันทึกไฟล์
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'driver');
      const newImagePath = `/uploads/driver/${filename}`;
      const fullPath = path.join(uploadDir, filename);

      // สร้างโฟลเดอร์ถ้ายังไม่มี
      await mkdir(uploadDir, { recursive: true });

      // บันทึกไฟล์ใหม่
      await writeFile(fullPath, buffer);

      // ลบไฟล์เก่าถ้ามี
      if (existingDriver.driver_image) {
        try {
          const oldImagePath = path.join(process.cwd(), 'public', existingDriver.driver_image);
          await unlink(oldImagePath);
        } catch (error) {
          console.warn('Could not delete old image:', error);
        }
      }

      driverImagePath = newImagePath;
    }

    // อัปเดตข้อมูลคนขับ
    await prisma.$queryRaw`
      UPDATE drivers SET 
        driver_name = ${driverName},
        driver_license = ${driverLicense},
        phone = ${phone || null},
        remark = ${remark || null},
        driver_image = ${driverImagePath || null},
        updated_by = ${session.user.username},
        updated_at = NOW()
      WHERE id = ${driverId}
    `;

    // ดึงข้อมูลคนขับที่อัปเดตแล้ว
    const updatedDrivers = await prisma.$queryRaw<any[]>`
      SELECT * FROM drivers WHERE id = ${driverId}
    `;
    const updatedDriver = updatedDrivers[0];

    return NextResponse.json({ 
      driver: {
        id: updatedDriver.id,
        driverName: updatedDriver.driver_name,
        driverLicense: updatedDriver.driver_license,
        driverImage: updatedDriver.driver_image,
        phone: updatedDriver.phone,
        remark: updatedDriver.remark,
        isActive: updatedDriver.is_active === 1,
        createdAt: updatedDriver.created_at.toISOString(),
        updatedAt: updatedDriver.updated_at.toISOString(),
        createdBy: updatedDriver.created_by,
        updatedBy: updatedDriver.updated_by,
      }
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/drivers/[id] - ลบคนขับ
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 });
    }

    // ตรวจสอบว่าคนขับมีอยู่จริง
    const existingDrivers = await prisma.$queryRaw<any[]>`
      SELECT * FROM drivers WHERE id = ${driverId}
    `;

    if (existingDrivers.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const existingDriver = existingDrivers[0];

    // ตรวจสอบว่าคนขับมีการใช้งานในระบบหรือไม่
    // 1. Check vehicles that use this driver as main or backup driver
    const vehiclesUsingDriver = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM vehicles 
      WHERE main_driver_id = ${driverId} OR backup_driver_id = ${driverId}
    `;

    // 2. Check trip records by driver license
    const driverLicense = existingDriver.driver_license;
    
    const tripRecords = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM trip_records WHERE driver_license = ${driverLicense}
    `;

    // 3. Check fuel records
    const fuelRecords = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM fuel_records WHERE driver_license = ${driverLicense}
    `;

    const vehicleCount = Number(vehiclesUsingDriver[0]?.count || 0);
    const tripCount = Number(tripRecords[0]?.count || 0);
    const fuelCount = Number(fuelRecords[0]?.count || 0);

    if (vehicleCount > 0 || tripCount > 0 || fuelCount > 0) {
      const usageDetails = [];
      if (vehicleCount > 0) usageDetails.push(`${vehicleCount} คันรถ`);
      if (tripCount > 0) usageDetails.push(`${tripCount} รายการเดินทาง`);
      if (fuelCount > 0) usageDetails.push(`${fuelCount} รายการเติมน้ำมัน`);
      
      return NextResponse.json(
        { 
          success: false,
          error: `ไม่สามารถลบคนขับที่มีการใช้งานในระบบได้ (${usageDetails.join(', ')})` 
        },
        { status: 400 }
      );
    }

    // ลบรูปภาพถ้ามี
    if (existingDriver.driver_image) {
      try {
        const imagePath = path.join(process.cwd(), 'public', existingDriver.driver_image);
        await unlink(imagePath);
      } catch (error) {
        console.warn('Could not delete image:', error);
      }
    }

    // ลบคนขับ
    await prisma.$queryRaw`
      DELETE FROM drivers WHERE id = ${driverId}
    `;

    return NextResponse.json({ 
      success: true,
      message: 'ลบข้อมูลคนขับสำเร็จ' 
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    
    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'ไม่สามารถลบข้อมูลคนขับได้' 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/drivers/[id] - toggle active status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: 'Invalid driver ID' }, { status: 400 });
    }

    const body = await request.json();

    // ตรวจสอบว่าคนขับมีอยู่จริง
    const existingDrivers = await prisma.$queryRaw<any[]>`
      SELECT * FROM drivers WHERE id = ${driverId}
    `;

    if (existingDrivers.length === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const existingDriver = existingDrivers[0];

    // ถ้าเป็น toggle-status action
    if (body.action === 'toggle-status') {
      const newActiveStatus = !existingDriver.is_active;
      
      // อัปเดตสถานะ
      await prisma.$queryRaw`
        UPDATE drivers SET 
          is_active = ${newActiveStatus ? 1 : 0},
          updated_by = ${session.user.username || session.user.email || 'system'},
          updated_at = NOW()
        WHERE id = ${driverId}
      `;

      return NextResponse.json({
        success: true,
        message: newActiveStatus ? 'เปิดใช้งานคนขับเรียบร้อยแล้ว' : 'ปิดใช้งานคนขับเรียบร้อยแล้ว',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating driver status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}