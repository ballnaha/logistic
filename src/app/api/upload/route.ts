import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

// ขนาดรูปภาพที่ต้องการ resize
const IMAGE_SIZES = {
  car: { width: 800, height: 600 },      // รูปภาพรถ
  driver: { width: 400, height: 400 },   // รูปภาพคนขับ
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Upload API called'); // Debug log
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'car' หรือ 'driver'

    console.log('📁 File received:', { 
      name: file?.name, 
      size: file?.size, 
      type: file?.type,
      uploadType: type 
    });

    if (!file) {
      console.error('❌ No file uploaded');
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!type || !['car', 'driver'].includes(type)) {
      console.error('❌ Invalid type:', type);
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "car" or "driver"' },
        { status: 400 }
      );
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed' },
        { status: 400 }
      );
    }

    // ตรวจสอบขนาดไฟล์ (สูงสุด 15MB)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { success: false, error: 'File size too large. Maximum 15MB allowed' },
        { status: 400 }
      );
    }

    // สร้างชื่อไฟล์ใหม่
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${type}_${timestamp}_${randomString}.jpg`; // แปลงเป็น .jpg ทั้งหมด

    console.log('📝 Generated filename:', fileName);

    // สร้างโฟลเดอร์ uploads ถ้าไม่มี
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    console.log('📂 Uploads directory:', uploadsDir);
    
    try {
      if (!existsSync(uploadsDir)) {
        console.log('🔨 Creating uploads directory...');
        await mkdir(uploadsDir, { recursive: true });
      }

      // สร้างโฟลเดอร์ตามประเภท
      const typeDir = path.join(uploadsDir, type);
      console.log('📂 Type directory:', typeDir);
      
      if (!existsSync(typeDir)) {
        console.log('🔨 Creating type directory...');
        await mkdir(typeDir, { recursive: true });
      }
    } catch (dirError) {
      console.error('❌ Directory creation error:', dirError);
      return NextResponse.json(
        { success: false, error: `Failed to create directory: ${dirError}` },
        { status: 500 }
      );
    }

    const filePath = path.join(uploadsDir, type, fileName);
    console.log('📍 Full file path:', filePath);

    // อ่านไฟล์และ resize
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('💾 Buffer created, size:', buffer.length);

    let processedBuffer: Buffer;
    
    try {
      // ตรวจสอบว่า sharp พร้อมใช้งานหรือไม่
      console.log('🖼️ Starting image processing with Sharp...');
      
      // ใช้ sharp เพื่อ resize และแปลงเป็น JPEG
      const resizeOptions = IMAGE_SIZES[type as keyof typeof IMAGE_SIZES];
      console.log('📐 Resize options:', resizeOptions);
      
      processedBuffer = await sharp(buffer)
        .resize(resizeOptions.width, resizeOptions.height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: 85,
          progressive: true
        })
        .toBuffer();
        
      console.log('✅ Image processed successfully, new size:', processedBuffer.length);
      
    } catch (sharpError) {
      console.error('❌ Sharp processing error:', sharpError);
      // Fallback: ใช้ไฟล์เดิมหาก Sharp ล้มเหลว
      console.log('🔄 Falling back to original file...');
      processedBuffer = buffer;
    }

    // เขียนไฟล์
    try {
      console.log('💾 Writing file to disk...');
      await writeFile(filePath, processedBuffer);
      console.log('✅ File written successfully');
    } catch (writeError) {
      console.error('❌ File write error:', writeError);
      return NextResponse.json(
        { success: false, error: `Failed to write file: ${writeError}` },
        { status: 500 }
      );
    }

    // สร้าง URL สำหรับเข้าถึงไฟล์
    const fileUrl = `/uploads/${type}/${fileName}`;
    console.log('🔗 File URL generated:', fileUrl);

    const response = {
      success: true,
      url: fileUrl,
      filename: fileName,
      size: processedBuffer.length,
      dimensions: IMAGE_SIZES[type as keyof typeof IMAGE_SIZES],
      message: 'File uploaded and processed successfully'
    };

    console.log('✅ Upload completed successfully:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // ส่งข้อมูลข้อผิดพลาดที่ละเอียดมากขึ้น
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
