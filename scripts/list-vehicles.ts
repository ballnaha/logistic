import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listVehicles() {
  console.log('📋 Vehicle Database Summary\n');

  try {
    // ดึงข้อมูลรถทั้งหมด
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { vehicleType: 'asc' },
        { licensePlate: 'asc' }
      ]
    });

    if (vehicles.length === 0) {
      console.log('❌ ไม่พบรถในฐานข้อมูล');
      return;
    }

    // จัดกลุ่มตามประเภทรถ
    const groupedVehicles = vehicles.reduce((acc, vehicle) => {
      if (!acc[vehicle.vehicleType]) {
        acc[vehicle.vehicleType] = [];
      }
      acc[vehicle.vehicleType].push(vehicle);
      return acc;
    }, {} as Record<string, typeof vehicles>);

    // แสดงสถิติรวม
    console.log(`🚗 รถทั้งหมด: ${vehicles.length} คัน\n`);

    // แสดงรถแยกตามประเภท
    Object.entries(groupedVehicles).forEach(([type, vehicleList]) => {
      const typeIcon = {
        'Truck': '🚛',
        'Pickup': '🚚',
        'ForkLift': '🏗️',
        'Van': '🚐',
        'Car': '🚗'
      }[type] || '🚙';

      console.log(`${typeIcon} ${type} (${vehicleList.length} คัน):`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      vehicleList.forEach((vehicle, index) => {
        const owner = vehicle.owner ? `${vehicle.owner.firstName} ${vehicle.owner.lastName}` : 'ไม่ระบุ';
        console.log(`${index + 1}. ${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model || ''} (${vehicle.color || 'ไม่ระบุสี'})`);
        console.log(`   คนขับหลัก: ${vehicle.driverName || 'ไม่ระบุ'}`);
        console.log(`   คนขับรอง: ${vehicle.backupDriverName || 'ไม่ระบุ'}`);
        console.log(`   เจ้าของ: ${owner}`);
        if (vehicle.remark) {
          console.log(`   หมายเหตุ: ${vehicle.remark}`);
        }
        console.log('');
      });
    });

    // สถิติสรุป
    console.log('📊 สถิติสรุป:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Object.entries(groupedVehicles).forEach(([type, vehicleList]) => {
      console.log(`${type}: ${vehicleList.length} คัน`);
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลรถ:', error);
  }
}

async function main() {
  try {
    await listVehicles();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();