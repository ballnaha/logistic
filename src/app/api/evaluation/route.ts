import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Type definitions
interface EvaluationCreateInput {
  contractorName: string;
  vehiclePlate: string;
  site: string;
  transportType: string;
  // Domestic fields
  driverCooperation?: number;
  vehicleCondition?: number;
  damageFound: boolean;
  damageValue: number;
  damageScore: number;
  // International fields
  containerCondition?: number;
  punctuality?: number;
  productDamage?: number;
  // Common fields
  remark: string;
  evaluatedBy: string;
  evaluationDate: Date;
}

// GET: ดึงรายการแบบประเมินพร้อมตัวกรอง
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractorName = searchParams.get('contractorName');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Build filter object
    const where: any = {};

    if (contractorName) {
      where.contractorName = contractorName;
    }

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      where.evaluationDate = {
        gte: startDate,
        lte: endDate
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);

      where.evaluationDate = {
        gte: startDate,
        lte: endDate
      };
    }

    // ใช้ dynamic query สำหรับ evaluation table
    const evaluations = await (prisma as any).evaluation.findMany({
      where,
      orderBy: [
        { evaluationDate: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        contractorName: true,
        vehiclePlate: true,
        site: true,
        transportType: true,
        driverCooperation: true,
        vehicleCondition: true,
        damageFound: true,
        damageValue: true,
        damageScore: true,
        containerCondition: true,
        punctuality: true,
        productDamage: true,
        remark: true,
        evaluatedBy: true,
        evaluationDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // คำนวณ totalScore สำหรับแต่ละรายการ (ตามประเภทการขนส่ง)
    const evaluationsWithTotalScore = evaluations.map((evaluation: any) => {
      let totalScore = 0;

      if (evaluation.transportType?.toLowerCase() === 'international') {
        // International: containerCondition(3) + punctuality(3) + productDamage(4) = max 10
        totalScore = (evaluation.containerCondition || 0) +
          (evaluation.punctuality || 0) +
          (evaluation.productDamage || 0);
      } else {
        // Domestic: driverCooperation(4) + vehicleCondition(3) + damageScore(3) = max 10
        totalScore = (evaluation.driverCooperation || 0) +
          (evaluation.vehicleCondition || 0) +
          (evaluation.damageScore || 0);
      }

      return {
        ...evaluation,
        totalScore,
        damageValue: Number(evaluation.damageValue)
      };
    });

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
      transportType = 'domestic',
      // Domestic fields
      driverCooperation,
      vehicleCondition,
      damageFound,
      damageValue,
      damageScore,
      // International fields
      containerCondition,
      punctuality,
      productDamage,
      // Common fields
      remark,
      evaluatedBy,
      evaluationDate
    } = body;
    const normalizedTransportType = (transportType || 'domestic').toLowerCase();

    // Basic validation
    if (!contractorName || !vehiclePlate || !site) {
      const missingFields = [];
      if (!contractorName) missingFields.push('ชื่อผู้รับจ้างช่วง');
      if (!vehiclePlate) missingFields.push('ทะเบียนรถ');
      if (!site) missingFields.push('Site');

      return NextResponse.json(
        {
          message: `กรุณากรอกข้อมูลให้ครบถ้วน: ${missingFields.join(', ')}`,
          missingFields
        },
        { status: 400 }
      );
    }

    // Validation based on transport type
    if (normalizedTransportType === 'international') {
      // International validation
      if (containerCondition === undefined || containerCondition === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุสภาพตู้คอนเทนเนอร์' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3].includes(containerCondition)) {
        return NextResponse.json(
          { message: 'คะแนนสภาพตู้คอนเทนเนอร์ไม่ถูกต้อง (0-3)' },
          { status: 400 }
        );
      }
      if (punctuality === undefined || punctuality === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุการตรงต่อเวลา' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3].includes(punctuality)) {
        return NextResponse.json(
          { message: 'คะแนนการตรงต่อเวลาไม่ถูกต้อง (0-3)' },
          { status: 400 }
        );
      }
      if (productDamage === undefined || productDamage === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุความเสียหายของสินค้า' },
          { status: 400 }
        );
      }
      if (![0, 1, 2, 3, 4].includes(productDamage)) {
        return NextResponse.json(
          { message: 'คะแนนความเสียหายของสินค้าไม่ถูกต้อง (0-4)' },
          { status: 400 }
        );
      }
    } else {
      // Domestic validation
      if (driverCooperation === undefined || driverCooperation === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุการให้ความร่วมมือของคนรถ' },
          { status: 400 }
        );
      }
      if (![1, 2, 3, 4].includes(driverCooperation)) {
        return NextResponse.json(
          { message: 'คะแนนความร่วมมือไม่ถูกต้อง (1-4)' },
          { status: 400 }
        );
      }
      if (vehicleCondition === undefined || vehicleCondition === null) {
        return NextResponse.json(
          { message: 'กรุณาระบุสภาพความพร้อมของรถขนส่ง' },
          { status: 400 }
        );
      }
      if (![0, 3].includes(vehicleCondition)) {
        return NextResponse.json(
          { message: 'คะแนนสภาพรถไม่ถูกต้อง (0 หรือ 3)' },
          { status: 400 }
        );
      }
      if (damageFound === undefined) {
        return NextResponse.json(
          { message: 'กรุณาระบุความเสียหายของพัสดุ' },
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
    }

    // สร้างข้อมูลการประเมินใหม่
    const evaluationData: any = {
      contractorName,
      vehiclePlate,
      site,
      transportType: normalizedTransportType,
      remark: remark || '',
      evaluatedBy: evaluatedBy || '',
      evaluationDate: new Date(evaluationDate)
    };

    if (normalizedTransportType === 'international') {
      // International fields
      evaluationData.containerCondition = containerCondition;
      evaluationData.punctuality = punctuality;
      evaluationData.productDamage = productDamage;
      // Set domestic fields to null/default
      evaluationData.driverCooperation = null;
      evaluationData.vehicleCondition = null;
      evaluationData.damageFound = false;
      evaluationData.damageValue = 0;
      evaluationData.damageScore = 0;
    } else {
      // Domestic fields
      evaluationData.driverCooperation = driverCooperation;
      evaluationData.vehicleCondition = vehicleCondition;
      evaluationData.damageFound = damageFound;
      evaluationData.damageValue = damageValue || 0;
      evaluationData.damageScore = damageScore || 0;
      // Set international fields to null
      evaluationData.containerCondition = null;
      evaluationData.punctuality = null;
      evaluationData.productDamage = null;
    }

    const newEvaluation = await (prisma as any).evaluation.create({
      data: evaluationData
    });

    // คำนวณ totalScore
    let totalScore = 0;
    if (normalizedTransportType === 'international') {
      totalScore = (newEvaluation.containerCondition || 0) +
        (newEvaluation.punctuality || 0) +
        (newEvaluation.productDamage || 0);
    } else {
      totalScore = (newEvaluation.driverCooperation || 0) +
        (newEvaluation.vehicleCondition || 0) +
        (newEvaluation.damageScore || 0);
    }

    const evaluationWithTotalScore = {
      ...newEvaluation,
      totalScore,
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
