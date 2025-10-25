import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ฟังก์ชันสำหรับ soft delete รถ (กำหนด isActive = false)
async function deactivateVehicle(licensePlate: string) {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { 
        licensePlate: licensePlate,
        isActive: true 
      }
    });

    if (!vehicle) {
      console.log(`❌ ไม่พบรถทะเบียน ${licensePlate} หรือรถถูกปิดใช้งานแล้ว`);
      return false;
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { 
        isActive: false,
        updatedBy: 'system'
      }
    });

    console.log(`✅ ปิดใช้งานรถ ${licensePlate} (${vehicle.brand} ${vehicle.model}) สำเร็จ`);
    return true;

  } catch (error) {
    console.error(`❌ เกิดข้อผิดพลาดขณะปิดใช้งานรถ ${licensePlate}:`, error);
    return false;
  }
}

// ฟังก์ชันสำหรับเปิดใช้งานรถ
async function activateVehicle(licensePlate: string) {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { 
        licensePlate: licensePlate,
        isActive: false 
      }
    });

    if (!vehicle) {
      console.log(`❌ ไม่พบรถทะเบียน ${licensePlate} หรือรถเปิดใช้งานอยู่แล้ว`);
      return false;
    }

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { 
        isActive: true,
        updatedBy: 'system'
      }
    });

    console.log(`✅ เปิดใช้งานรถ ${licensePlate} (${vehicle.brand} ${vehicle.model}) สำเร็จ`);
    return true;

  } catch (error) {
    console.error(`❌ เกิดข้อผิดพลาดขณะเปิดใช้งานรถ ${licensePlate}:`, error);
    return false;
  }
}

// ฟังก์ชันสำหรับลบรถจริง (hard delete)
async function deleteVehicle(licensePlate: string) {
  try {
    const vehicle = await prisma.vehicle.findFirst({
      where: { licensePlate: licensePlate }
    });

    if (!vehicle) {
      console.log(`❌ ไม่พบรถทะเบียน ${licensePlate}`);
      return false;
    }

    // ตรวจสอบว่ามีข้อมูลที่เกี่ยวข้องหรือไม่
    const relatedData = await Promise.all([
      prisma.fuelRecord.count({ where: { vehicleId: vehicle.id } }),
      prisma.tripRecord.count({ where: { vehicleId: vehicle.id } })
    ]);

    const [fuelRecords, tripRecords] = relatedData;

    if (fuelRecords > 0 || tripRecords > 0) {
      console.log(`⚠️  รถ ${licensePlate} มีข้อมูลที่เกี่ยวข้อง:`);
      console.log(`   - บันทึกการเติมน้ำมัน: ${fuelRecords} รายการ`);
      console.log(`   - บันทึกการเดินทาง: ${tripRecords} รายการ`);
      console.log(`   แนะนำให้ใช้การปิดใช้งาน (deactivate) แทนการลบ`);
      return false;
    }

    await prisma.vehicle.delete({
      where: { id: vehicle.id }
    });

    console.log(`✅ ลบรถ ${licensePlate} (${vehicle.brand} ${vehicle.model}) สำเร็จ`);
    return true;

  } catch (error) {
    console.error(`❌ เกิดข้อผิดพลาดขณะลบรถ ${licensePlate}:`, error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('🚗 Vehicle Management Script\\n');
    console.log('การใช้งาน:');
    console.log('  npm run manage:vehicles deactivate <ทะเบียนรถ>   # ปิดใช้งานรถ');
    console.log('  npm run manage:vehicles activate <ทะเบียนรถ>     # เปิดใช้งานรถ');
    console.log('  npm run manage:vehicles delete <ทะเบียนรถ>       # ลบรถ (ถาวร)\\n');
    console.log('ตัวอย่าง:');
    console.log('  npm run manage:vehicles deactivate กท-1001');
    console.log('  npm run manage:vehicles activate กท-1001');
    console.log('  npm run manage:vehicles delete กท-1001');
    return;
  }

  const [action, licensePlate] = args;

  console.log(`🚗 กำลัง${action === 'deactivate' ? 'ปิดใช้งาน' : action === 'activate' ? 'เปิดใช้งาน' : 'ลบ'}รถทะเบียน: ${licensePlate}\\n`);

  try {
    let success = false;

    switch (action) {
      case 'deactivate':
        success = await deactivateVehicle(licensePlate);
        break;
      case 'activate':
        success = await activateVehicle(licensePlate);
        break;
      case 'delete':
        success = await deleteVehicle(licensePlate);
        break;
      default:
        console.log(`❌ การดำเนินการ "${action}" ไม่ถูกต้อง`);
        console.log('การดำเนินการที่ใช้ได้: deactivate, activate, delete');
    }

    if (success) {
      console.log('\\n✅ ดำเนินการเสร็จสิ้น');
    } else {
      console.log('\\n❌ ดำเนินการไม่สำเร็จ');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();