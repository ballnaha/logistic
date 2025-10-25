import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

// Helper function สำหรับลบไฟล์รูปภาพ
const deleteImageFile = async (imagePath: string | null) => {
  if (!imagePath) return;
  
  try {
    // ตรวจสอบว่าเป็น URL หรือ path
    if (imagePath.startsWith('http')) return; // ถ้าเป็น external URL ไม่ต้องลบ
    
    // สร้าง absolute path
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    await unlink(fullPath);
    console.log(`Deleted image: ${fullPath}`);
  } catch (error) {
    console.error(`Failed to delete image ${imagePath}:`, error);
    // ไม่ throw error เพราะอาจจะไฟล์ไม่มีอยู่แล้ว
  }
};

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - ดึงข้อมูลรถคันเดียว
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = parseInt(resolvedParams.id);
    
    const vehicle = await prisma.vehicle.findUnique({
      where: { 
        id: vehicleId,
        isActive: true,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
          mainDriver: {
            select: {
              id: true,
              driverName: true,
              driverLicense: true,
              driverImage: true,
            },
          },
          backupDriver: {
            select: {
              id: true,
              driverName: true,
              driverLicense: true,
              driverImage: true,
            },
          },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: vehicle,
    });
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PUT - แก้ไขข้อมูลรถ
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = parseInt(resolvedParams.id);
    const body = await request.json();

    // ตรวจสอบว่ารถมีอยู่หรือไม่
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, isActive: true },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const {
      // ข้อมูลหลัก
      licensePlate,
      brand,
      model,
      color,
      weight,
      fuelTank,
      fuelConsume,
      fuelConsumeMth,
      vehicleType,
      // คนขับ (ใช้ ID แทน)
      mainDriverId,
      backupDriverId,
      // คนขับหลัก (legacy - สำหรับ backward compatibility)
      driverName,
      driverLicense,
      driverImage,
      // คนขับรอง (legacy - สำหรับ backward compatibility)
      backupDriverName,
      backupDriverLicense,
      backupDriverImage,
      // อื่นๆ
      remark,
      carImage,
    } = body;

    // ตรวจสอบทะเบียนรถซ้ำ (เฉพาะเมื่อมีการแก้ไขทะเบียน)
    if (licensePlate !== undefined) {
      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          licensePlate: licensePlate,
          isActive: true,
          NOT: {
            id: vehicleId // ไม่นับรถคันปัจจุบัน
          }
        }
      });

      if (existingVehicle) {
        return NextResponse.json(
          { success: false, error: 'ทะเบียนรถนี้มีอยู่ในระบบแล้ว' },
          { status: 400 }
        );
      }
    }

    // ลบรูปเก่าเมื่อมีการเปลี่ยนรูปใหม่
    const deletePromises = [];
    
    if (carImage !== undefined && carImage !== existingVehicle.carImage) {
      deletePromises.push(deleteImageFile(existingVehicle.carImage));
    }
    
    // ลบรูปเก่าแบบ parallel
    if (deletePromises.length > 0) {
      await Promise.allSettled(deletePromises);
    }

    // อัพเดตข้อมูล
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        // ข้อมูลหลักใหม่
        ...(licensePlate !== undefined && { licensePlate }),
        ...(brand !== undefined && { brand }),
        ...(model !== undefined && { model }),
        ...(color !== undefined && { color }),
        ...(weight !== undefined && { weight: weight ? parseFloat(weight) : null }),
        ...(fuelTank !== undefined && { fuelTank: fuelTank ? parseFloat(fuelTank) : null }),
        ...(fuelConsume !== undefined && { fuelConsume: fuelConsume ? parseFloat(fuelConsume) : null }),
        ...(fuelConsumeMth !== undefined && { fuelConsumeMth: fuelConsumeMth ? parseFloat(fuelConsumeMth) : null }),
        ...(vehicleType !== undefined && { vehicleType }),
        // คนขับ (ใช้ ID แทน)
        ...(mainDriverId !== undefined && { 
          mainDriverId: mainDriverId ? parseInt(mainDriverId) : null 
        }),
        ...(backupDriverId !== undefined && { 
          backupDriverId: backupDriverId ? parseInt(backupDriverId) : null 
        }),
        // อื่นๆ
        ...(remark !== undefined && { remark }),
        ...(carImage !== undefined && { carImage }),
        // ข้อมูลเพิ่มเติม (เฉพาะที่จำเป็น)
        updatedBy: session.user.username || session.user.email || 'system',
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        mainDriver: {
          select: {
            id: true,
            driverName: true,
            driverLicense: true,
            driverImage: true,
          },
        },
        backupDriver: {
          select: {
            id: true,
            driverName: true,
            driverLicense: true,
            driverImage: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updatedVehicle,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// PATCH - สำหรับ toggle isActive status หรือเปิดใช้งานรถคืน
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = parseInt(resolvedParams.id);
    const body = await request.json();

    // ตรวจสอบว่ารถมีอยู่หรือไม่
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลรถ' },
        { status: 404 }
      );
    }

    // ถ้าเป็น toggle-status action
    if (body.action === 'toggle-status') {
      // Toggle isActive
      const updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          isActive: !existingVehicle.isActive,
          updatedBy: session.user.username || session.user.email || 'system',
        },
      });

      return NextResponse.json({
        success: true,
        message: updatedVehicle.isActive ? 'เปิดใช้งานรถเรียบร้อยแล้ว' : 'ปิดใช้งานรถเรียบร้อยแล้ว',
        data: updatedVehicle,
      });
    }

    // Default behavior - เปิดใช้งานรถคืน (สำหรับ backward compatibility)
    if (existingVehicle.isActive) {
      return NextResponse.json(
        { success: false, error: 'รถนี้ใช้งานอยู่แล้ว' },
        { status: 400 }
      );
    }

    // ตรวจสอบทะเบียนรถซ้ำกับรถที่ใช้งานอยู่ (ถ้ามีทะเบียน)
    if (existingVehicle.licensePlate) {
      const duplicateVehicle = await prisma.vehicle.findFirst({
        where: {
          licensePlate: existingVehicle.licensePlate,
          isActive: true,
          NOT: {
            id: vehicleId
          }
        }
      });

      if (duplicateVehicle) {
        return NextResponse.json(
          { success: false, error: 'ทะเบียนรถนี้มีรถอื่นใช้งานอยู่แล้ว' },
          { status: 400 }
        );
      }
    }

    // เปิดใช้งานรถคืน
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isActive: true,
        updatedBy: session.user.username || session.user.email || 'system',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'เปิดใช้งานรถสำเร็จ',
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถอัปเดตสถานะรถได้' },
      { status: 500 }
    );
  }
}

// DELETE - ลบรถแบบ hard delete (เฉพาะรถที่ยังไม่ถูกใช้งาน) หรือ soft delete (รถที่ใช้งานแล้ว)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true'; // สำหรับลบจริง

    // ตรวจสอบว่ารถมีอยู่หรือไม่
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลรถ' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ารถถูกใช้ใน trip records หรือ fuel records หรือยัง
    const [tripCount, fuelRecordCount] = await Promise.all([
      prisma.tripRecord.count({ where: { vehicleId } }),
      prisma.fuelRecord.count({ where: { vehicleId } }),
    ]);

    const isInUse = tripCount > 0 || fuelRecordCount > 0;

    if (isInUse && !forceDelete) {
      // ถ้ารถถูกใช้งานแล้วและไม่ใช่การลบบังคับ ให้ทำ soft delete
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          isActive: false,
          updatedBy: session.user.username || session.user.email || 'system',
        },
      });

      return NextResponse.json({
        success: true,
        message: `ยกเลิกใช้งานรถสำเร็จ ข้อมูลและรูปภาพถูกเก็บไว้เป็นประวัติ (พบการใช้งาน ${tripCount} เที่ยวรถ และ ${fuelRecordCount} รายการเติมน้ำมัน)`,
        type: 'soft_delete',
        usageInfo: {
          tripRecordsCount: tripCount,
          fuelRecordsCount: fuelRecordCount,
        },
      });
    } else {
      // ถ้ารถไม่ถูกใช้งานหรือเป็นการลบบังคับ ให้ทำ hard delete
      const deletePromises = [];
      
      // ลบรูปภาพ
      if (existingVehicle.carImage) {
        deletePromises.push(deleteImageFile(existingVehicle.carImage));
      }

      // ลบรูปภาพแบบ parallel
      if (deletePromises.length > 0) {
        await Promise.allSettled(deletePromises);
      }

      // ลบข้อมูลจากฐานข้อมูล (จะลบ related records ด้วยเพราะมี Cascade)
      await prisma.vehicle.delete({
        where: { id: vehicleId },
      });

      return NextResponse.json({
        success: true,
        message: isInUse 
          ? 'ลบรถและข้อมูลที่เกี่ยวข้องทั้งหมดเรียบร้อยแล้ว (รวมทั้งประวัติการใช้งาน)'
          : 'ลบรถเรียบร้อยแล้ว',
        type: 'hard_delete',
        deletedUsageInfo: forceDelete ? {
          tripRecordsCount: tripCount,
          fuelRecordsCount: fuelRecordCount,
        } : null,
      });
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบรถได้' },
      { status: 500 }
    );
  }
}
