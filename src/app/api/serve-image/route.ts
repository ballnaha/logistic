import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imagePath = searchParams.get('path');
    
    if (!imagePath) {
      return NextResponse.json(
        { error: 'Image path is required' },
        { status: 400 }
      );
    }

    console.log('🖼️ Serving image:', imagePath);

    // ตรวจสอบความปลอดภัยของ path
    if (imagePath.includes('..') || !imagePath.startsWith('/uploads/')) {
      console.error('❌ Invalid path:', imagePath);
      return NextResponse.json(
        { error: 'Invalid path' },
        { status: 400 }
      );
    }

    // แปลง URL path เป็น file system path
    const relativePath = imagePath.replace(/^\//, ''); // เอา / หน้าออก
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    
    console.log('📂 Full file path:', fullPath);

    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    if (!existsSync(fullPath)) {
      console.error('❌ File not found:', fullPath);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // อ่านไฟล์
    const imageBuffer = await readFile(fullPath);
    console.log('✅ File read successfully, size:', imageBuffer.length);

    // กำหนด content type ตามนามสกุลไฟล์
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.jpg':
      case '.jpeg':
      default:
        contentType = 'image/jpeg';
        break;
    }

    console.log('📄 Content type:', contentType);

    // ส่งกลับไฟล์รูปภาพ
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('❌ Error serving image:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
