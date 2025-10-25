import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'fs';
import { access, constants } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      cwd: process.cwd(),
      sharp: false,
      uploadsDirectory: {
        exists: false,
        writable: false,
        path: ''
      }
    };

    // ตรวจสอบ Sharp
    try {
      const sharp = require('sharp');
      checks.sharp = !!sharp;
      console.log('✅ Sharp module loaded successfully');
    } catch (error) {
      console.log('❌ Sharp module not available:', error);
    }

    // ตรวจสอบโฟลเดอร์ uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    checks.uploadsDirectory.path = uploadsDir;
    
    try {
      // ตรวจสอบการมีอยู่ของโฟลเดอร์
      checks.uploadsDirectory.exists = existsSync(uploadsDir);
      
      if (checks.uploadsDirectory.exists) {
        // ตรวจสอบสิทธิ์การเขียน
        await access(uploadsDir, constants.W_OK);
        checks.uploadsDirectory.writable = true;
        console.log('✅ Uploads directory is writable');
      } else {
        console.log('❌ Uploads directory does not exist');
      }
    } catch (error) {
      console.log('❌ Uploads directory not writable:', error);
      checks.uploadsDirectory.writable = false;
    }

    // ตรวจสอบโฟลเดอร์ย่อย
    const subDirectories = ['car', 'driver'];
    const subDirChecks: Record<string, { exists: boolean; writable: boolean }> = {};
    
    for (const subDir of subDirectories) {
      const subDirPath = path.join(uploadsDir, subDir);
      subDirChecks[subDir] = {
        exists: existsSync(subDirPath),
        writable: false
      };
      
      if (subDirChecks[subDir].exists) {
        try {
          await access(subDirPath, constants.W_OK);
          subDirChecks[subDir].writable = true;
        } catch (error) {
          console.log(`❌ ${subDir} directory not writable:`, error);
        }
      }
    }

    const response = {
      success: true,
      checks,
      subDirectories: subDirChecks,
      message: 'Health check completed'
    };

    console.log('Health Check Results:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
