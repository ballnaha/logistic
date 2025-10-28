import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearTestFuelRecords() {
  try {
    console.log('🗑️  เริ่มลบข้อมูลการเติมน้ำมันทดสอบ...');

    // ลบข้อมูลการเติมน้ำมันทั้งหมด
    const result = await prisma.fuelRecord.deleteMany({});

    console.log(`✅ ลบข้อมูลการเติมน้ำมันเสร็จสิ้น!`);
    console.log(`📊 จำนวนรายการที่ลบ: ${result.count} รายการ`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// เรียกใช้ function
clearTestFuelRecords();