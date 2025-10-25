import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: ดึงประวัติความเสียหายของทะเบียนรถใน 1 เดือนที่ผ่านมา
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vehiclePlate = searchParams.get('vehiclePlate');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const excludeIdParam = searchParams.get('excludeId');

    if (!vehiclePlate) {
      return NextResponse.json(
        { message: 'กรุณาระบุทะเบียนรถ' },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { message: 'กรุณาระบุวันที่เริ่มต้น' },
        { status: 400 }
      );
    }

    // ดึงข้อมูลการประเมินของทะเบียนรถนี้ตามช่วงวันที่ (จำกัดในเดือนเดียวกันถ้ามี endDate)
    const whereClause: any = {
      vehiclePlate: vehiclePlate,
      damageFound: true,
      evaluationDate: {
        gte: new Date(startDate)
      }
    };

    if (endDate) {
      whereClause.evaluationDate.lte = new Date(endDate);
    }

    // ตัดเรคคอร์ดที่กำลังแก้ไขออก (ถ้าระบุ excludeId)
    if (excludeIdParam) {
      const excludeId = parseInt(excludeIdParam, 10);
      if (!isNaN(excludeId)) {
        whereClause.id = { not: excludeId };
      }
    }

    const evaluations = await (prisma as any).evaluation.findMany({
      where: whereClause,
      select: {
        id: true,
        damageValue: true,
        evaluationDate: true
      },
      orderBy: {
        evaluationDate: 'desc'
      }
    });

    // คำนวณจำนวนครั้งและมูลค่ารวม
    const damageCount = evaluations.length;
    const totalDamageValue = evaluations.reduce((sum, evaluation) => {
      return sum + Number(evaluation.damageValue);
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        vehiclePlate,
        damageCount,
        totalDamageValue,
        evaluations: evaluations.map(evaluation => ({
          id: evaluation.id,
          damageValue: Number(evaluation.damageValue),
          evaluationDate: evaluation.evaluationDate
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching vehicle history:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'เกิดข้อผิดพลาดในการดึงประวัติทะเบียนรถ', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
