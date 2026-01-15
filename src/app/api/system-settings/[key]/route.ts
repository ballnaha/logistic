import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      );
    }

    // Query system_settings table
    const setting = await prisma.$queryRaw`
      SELECT value FROM system_settings WHERE setting_key = ${key} LIMIT 1
    `;

    if (!setting || (Array.isArray(setting) && setting.length === 0)) {
      return NextResponse.json(
        { error: 'Setting not found' },
        { status: 404 }
      );
    }

    // Handle the result - Prisma returns an array
    const result = Array.isArray(setting) ? setting[0] : setting;

    return NextResponse.json({
      key,
      value: result.value,
      success: true
    });

  } catch (error) {
    console.error('Error fetching system setting:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch system setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Optional: Allow updating system settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    const { value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Setting key and value are required' },
        { status: 400 }
      );
    }

    // Update or insert system setting
    await prisma.$executeRaw`
      INSERT INTO system_settings (setting_key, value, updated_at) 
      VALUES (${key}, ${value}, NOW())
      ON DUPLICATE KEY UPDATE 
      value = VALUES(value), 
      updated_at = VALUES(updated_at)
    `;

    return NextResponse.json({
      key,
      value,
      success: true,
      message: 'Setting updated successfully'
    });

  } catch (error) {
    console.error('Error updating system setting:', error);
    return NextResponse.json(
      {
        error: 'Failed to update system setting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}