import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { driverId, imagePath } = await request.json();

    if (!driverId || !imagePath) {
      return NextResponse.json(
        { error: 'Driver ID and image path are required' },
        { status: 400 }
      );
    }

    // Update driver record to remove image path
    const updatedDriver = await prisma.driver.update({
      where: { id: parseInt(driverId) },
      data: {
        driverImage: null,
        updatedBy: session.user?.username || session.user?.email || 'system',
      },
    });

    // Delete physical file
    try {
      // Handle different image path formats
      let fullImagePath = '';
      
      if (imagePath.startsWith('/uploads/driver/')) {
        fullImagePath = path.join(process.cwd(), 'public', imagePath);
      } else if (imagePath.startsWith('/api/serve-image')) {
        // Extract the actual file path from the API URL
        const url = new URL(`http://localhost${imagePath}`);
        const filePath = url.searchParams.get('path');
        if (filePath) {
          fullImagePath = path.join(process.cwd(), 'public', filePath);
        }
      } else {
        // Assume it's a relative path under uploads/driver/
        fullImagePath = path.join(process.cwd(), 'public', 'uploads', 'driver', path.basename(imagePath));
      }

      if (fullImagePath && fs.existsSync(fullImagePath)) {
        fs.unlinkSync(fullImagePath);
        console.log('✅ Deleted image file:', fullImagePath);
      } else {
        console.log('⚠️ Image file not found or path invalid:', fullImagePath);
      }
    } catch (fileError) {
      console.error('❌ Error deleting image file:', fileError);
      // Continue execution even if file deletion fails
    }

    return NextResponse.json({
      success: true,
      data: updatedDriver,
      message: 'Driver image deleted successfully',
    });

  } catch (error) {
    console.error('❌ Error deleting driver image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}