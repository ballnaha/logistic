import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: ดึงแบบประเมินรายการเดียว
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const evaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });

    if (!evaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Calculate total score
    const totalScore = evaluation.driverCooperation + evaluation.vehicleCondition + (evaluation.damageScore || 0);

    return NextResponse.json({
      ...evaluation,
      totalScore
    });
  } catch (error: any) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT: แก้ไขแบบประเมิน
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      contractorName,
      vehiclePlate,
      evaluationDate,
      site,
      driverCooperation,
      vehicleCondition,
      damageFound,
      damageValue,
      damageScore,
      remark
    } = body;

    // Validation
    if (!contractorName || !vehiclePlate || !evaluationDate || !site || 
        driverCooperation === undefined || vehicleCondition === undefined || 
        damageFound === undefined) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (![1, 2, 3, 4].includes(driverCooperation)) {
      return NextResponse.json(
        { message: 'คะแนนความร่วมมือไม่ถูกต้อง (1-4)' },
        { status: 400 }
      );
    }

    if (![0, 3].includes(vehicleCondition)) {
      return NextResponse.json(
        { message: 'คะแนนสภาพรถไม่ถูกต้อง (0 หรือ 3)' },
        { status: 400 }
      );
    }

    if (damageFound && (!damageValue || damageValue < 0)) {
      return NextResponse.json(
        { message: 'กรุณากรอกมูลค่าความเสียหายที่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check if evaluation exists
    const existingEvaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });
    
    if (!existingEvaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Update evaluation
    const updatedEvaluation = await (prisma as any).evaluation.update({
      where: { id: id },
      data: {
        contractorName: contractorName,
        vehiclePlate: vehiclePlate,
        evaluationDate: new Date(evaluationDate),
        site: site,
        driverCooperation: driverCooperation,
        vehicleCondition: vehicleCondition,
        damageFound: damageFound,
        damageValue: damageValue || 0,
        damageScore: damageScore || 0,
        remark: remark || '',
        updatedAt: new Date()
      }
    });

    // Calculate total score
    const totalScore = updatedEvaluation.driverCooperation + updatedEvaluation.vehicleCondition + (updatedEvaluation.damageScore || 0);

    return NextResponse.json({
      ...updatedEvaluation,
      totalScore
    });
  } catch (error: any) {
    console.error('Error updating evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการแก้ไขแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE: ลบแบบประเมิน
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID ไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Check if evaluation exists
    const existingEvaluation = await (prisma as any).evaluation.findUnique({
      where: { id: id }
    });
    
    if (!existingEvaluation) {
      return NextResponse.json(
        { message: 'ไม่พบแบบประเมินที่ระบุ' },
        { status: 404 }
      );
    }

    // Delete evaluation
    await (prisma as any).evaluation.delete({
      where: { id: id }
    });

    return NextResponse.json({ message: 'ลบแบบประเมินเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Error deleting evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการลบแบบประเมิน', error: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
