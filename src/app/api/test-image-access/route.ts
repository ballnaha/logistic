import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // รับ URL parameter
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Testing image access for:', imageUrl);

    // แปลง URL เป็น file path
    const relativePath = imageUrl.replace(/^\//, ''); // เอา / หน้าออก
    const fullPath = path.join(process.cwd(), 'public', relativePath);
    
    console.log('📂 Full file path:', fullPath);

    // ตรวจสอบว่าไฟล์มีอยู่หรือไม่
    const fileExists = existsSync(fullPath);
    console.log('📄 File exists:', fileExists);

    let fileStats = null;
    let fileSize = 0;
    
    if (fileExists) {
      try {
        const stats = require('fs').statSync(fullPath);
        fileStats = {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        };
        fileSize = stats.size;
        console.log('📊 File stats:', fileStats);
      } catch (statsError) {
        console.error('❌ Error getting file stats:', statsError);
      }
    }

    // ตรวจสอบ directory structure
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const carDir = path.join(uploadsDir, 'car');
    const driverDir = path.join(uploadsDir, 'driver');

    const dirInfo = {
      uploads: {
        exists: existsSync(uploadsDir),
        path: uploadsDir
      },
      car: {
        exists: existsSync(carDir),
        path: carDir,
        files: existsSync(carDir) ? require('fs').readdirSync(carDir).length : 0
      },
      driver: {
        exists: existsSync(driverDir),
        path: driverDir,
        files: existsSync(driverDir) ? require('fs').readdirSync(driverDir).length : 0
      }
    };

    console.log('📁 Directory info:', dirInfo);

    // ลองเข้าถึงไฟล์ผ่าน HTTP
    let httpAccessible = false;
    let httpError = null;
    
    try {
      const baseUrl = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const fullUrl = `${protocol}://${baseUrl}${imageUrl}`;
      
      console.log('🌐 Testing HTTP access:', fullUrl);
      
      const response = await fetch(fullUrl, { method: 'HEAD' });
      httpAccessible = response.ok;
      
      if (!response.ok) {
        httpError = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.log('🌐 HTTP accessible:', httpAccessible, httpError || '');
    } catch (error) {
      httpError = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ HTTP access error:', httpError);
    }

    const result = {
      success: true,
      imageUrl,
      fullPath,
      fileExists,
      fileStats,
      fileSize,
      dirInfo,
      httpTest: {
        accessible: httpAccessible,
        error: httpError
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd(),
        platform: process.platform
      },
      recommendations: []
    };

    // เพิ่มคำแนะนำตามผลการตรวจสอบ
    if (!fileExists) {
      result.recommendations.push('ไฟล์ไม่มีอยู่ในระบบ - ตรวจสอบการ upload');
    }
    
    if (fileExists && !httpAccessible) {
      result.recommendations.push('ไฟล์มีอยู่แต่เข้าถึงผ่าน HTTP ไม่ได้ - ตรวจสอบ Next.js static file serving');
    }
    
    if (fileExists && httpAccessible) {
      result.recommendations.push('ไฟล์ทำงานปกติ - ปัญหาอาจอยู่ที่ client-side rendering');
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Test image access error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
