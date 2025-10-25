import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface EvaluationCreateInput {
  contractorName: string;
  vehiclePlate: string;
  site: string;
  driverCooperation: number;
  vehicleCondition: number;
  damageFound: boolean;
  damageValue: number;
  damageScore: number;
  remark: string;
  evaluatedBy: string;
  evaluationDate: Date;
}

// GET: ดึงรายการแบบประเมินทั้งหมด
export async function GET(request: NextRequest) {
  try {
    // ใช้ dynamic query สำหรับ evaluation table
    const evaluations = await (prisma as any).evaluation.findMany({
      orderBy: [
        { evaluationDate: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        contractorName: true,
        vehiclePlate: true,
        site: true,
        driverCooperation: true,
        vehicleCondition: true,
        damageFound: true,
        damageValue: true,
        damageScore: true,
        remark: true,
        evaluatedBy: true,
        evaluationDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // คำนวณ totalScore สำหรับแต่ละรายการ
    const evaluationsWithTotalScore = evaluations.map((evaluation: any) => ({
      ...evaluation,
      totalScore: evaluation.driverCooperation + evaluation.vehicleCondition + evaluation.damageScore,
      damageValue: Number(evaluation.damageValue)
    }));

    return NextResponse.json(evaluationsWithTotalScore);
  } catch (error: any) {
    console.error('Error fetching evaluations:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบบประเมิน', error: error.message },
      { status: 500 }
    );
  }
}

// POST: สร้างแบบประเมินใหม่
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received evaluation data:', body);
    
    const {
      contractorName,
      vehiclePlate,
      site,
      driverCooperation,
      vehicleCondition,
      damageFound,
      damageValue,
      damageScore,
      remark,
      evaluatedBy,
      evaluationDate
    } = body;

    // Validation
    if (!contractorName || !vehiclePlate || !site || driverCooperation === undefined || driverCooperation === null || vehicleCondition === undefined || vehicleCondition === null || damageFound === undefined) {
      const missingFields = [];
      if (!contractorName) missingFields.push('ชื่อผู้รับจ้างช่วง');
      if (!vehiclePlate) missingFields.push('ทะเบียนรถ');
      if (!site) missingFields.push('Site');
      if (driverCooperation === undefined || driverCooperation === null) missingFields.push('การให้ความร่วมมือของคนรถ');
      if (vehicleCondition === undefined || vehicleCondition === null) missingFields.push('สภาพความพร้อมของรถขนส่ง');
      if (damageFound === undefined) missingFields.push('ความเสียหายของพัสดุ');
      
      return NextResponse.json(
        { 
          message: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`,
          missingFields 
        },
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

    if (![0, 1, 3].includes(damageScore)) {
      return NextResponse.json(
        { message: 'คะแนนความเสียหายไม่ถูกต้อง (0, 1, หรือ 3)' },
        { status: 400 }
      );
    }

    // สร้างข้อมูลการประเมินใหม่
    const newEvaluation = await (prisma as any).evaluation.create({
      data: {
        contractorName,
        vehiclePlate,
        site,
        driverCooperation,
        vehicleCondition,
        damageFound,
        damageValue: damageValue || 0,
        damageScore: damageScore || 0,
        remark: remark || '',
        evaluatedBy: evaluatedBy || '',
        evaluationDate: new Date(evaluationDate)
      }
    });

    // คำนวณ totalScore
    const evaluationWithTotalScore = {
      ...newEvaluation,
      totalScore: newEvaluation.driverCooperation + newEvaluation.vehicleCondition + newEvaluation.damageScore,
      damageValue: Number(newEvaluation.damageValue)
    };

    return NextResponse.json(evaluationWithTotalScore, { status: 201 });
  } catch (error: any) {
    console.error('Error creating evaluation:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดในการบันทึกแบบประเมิน', error: error.message },
      { status: 500 }
    );
  }
}
