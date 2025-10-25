import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

// GET - Check if document number already exists
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentNumber = searchParams.get('documentNumber');
    const excludeId = searchParams.get('excludeId'); // For edit mode - exclude current record

    if (!documentNumber) {
      return NextResponse.json({ error: 'Document number is required' }, { status: 400 });
    }

    // Check if document number exists (exclude current record if editing)
    const whereCondition: any = {
      documentNumber: documentNumber.trim(),
    };

    if (excludeId) {
      whereCondition.id = {
        not: parseInt(excludeId)
      };
    }

    const existingRecord = await prisma.tripRecord.findFirst({
      where: whereCondition,
      select: {
        id: true,
        documentNumber: true,
        departureDate: true,
        vehicle: {
          select: {
            licensePlate: true
          }
        },
        customer: {
          select: {
            cmCode: true,
            cmName: true
          }
        }
      }
    });

    if (existingRecord) {
      return NextResponse.json({
        exists: true,
        existingRecord: {
          id: existingRecord.id,
          documentNumber: existingRecord.documentNumber,
          departureDate: existingRecord.departureDate,
          vehicle: existingRecord.vehicle,
          customer: existingRecord.customer
        }
      });
    }

    return NextResponse.json({ exists: false });

  } catch (error) {
    console.error('Error validating document number:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}