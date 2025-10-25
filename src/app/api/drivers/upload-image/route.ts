import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '../../../../lib/prisma';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('driverImage') as File;
    const driverId = formData.get('driverId') as string;
    const oldImagePath = formData.get('oldImagePath') as string;

    if (!file || !driverId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ไม่พบไฟล์รูปภาพหรือ ID คนขับ' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF)' 
        },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์ (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ขนาดไฟล์ต้องไม่เกิน 5MB' 
        },
        { status: 400 }
      );
    }

    // สร้างชื่อไฟล์ใหม่
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `driver_${driverId}_${timestamp}.${extension}`;
    
    // กำหนด path สำหรับบันทึกไฟล์
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'driver');
    const filepath = join(uploadDir, filename);
    const relativePath = `/uploads/driver/${filename}`;

    // สร้างโฟลเดอร์หากไม่มี
    const { mkdir } = await import('fs/promises');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // โฟลเดอร์มีอยู่แล้ว
    }

    // ลบรูปเดิมหากมี
    if (oldImagePath && oldImagePath.startsWith('/uploads/')) {
      const oldFilePath = join(process.cwd(), 'public', oldImagePath);
      try {
        if (existsSync(oldFilePath)) {
          await unlink(oldFilePath);
          console.log('Deleted old image:', oldFilePath);
        }
      } catch (error) {
        console.warn('Failed to delete old image:', error);
        // ไม่ให้ error นี้หยุดการทำงาน
      }
    }

    // บันทึกไฟล์ใหม่
    await writeFile(filepath, buffer);
    console.log('Saved new image:', filepath);

    // อัพเดท path ในฐานข้อมูล
    await prisma.driver.update({
      where: { id: parseInt(driverId) },
      data: {
        driverImage: relativePath,
        updatedBy: session.user.name || session.user.email,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        imagePath: relativePath,
        filename,
      },
      message: 'อัพโหลดรูปภาพสำเร็จ',
    });

  } catch (error) {
    console.error('Error uploading driver image:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'ไม่สามารถอัพโหลดรูปภาพได้' 
      },
      { status: 500 }
    );
  }
}