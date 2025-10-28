import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestFuelRecords() {
  try {
    console.log('🚛 เริ่มสร้างข้อมูลการเติมน้ำมันทดสอบ...');

    // ดึงรถทั้งหมดจาก database
    const vehicles = await prisma.vehicle.findMany({
      select: {
        id: true,
        licensePlate: true,
        brand: true,
        model: true,
        mainDriver: {
          select: {
            driverName: true,
            driverLicense: true
          }
        },
        backupDriver: {
          select: {
            driverName: true,
            driverLicense: true
          }
        }
      }
    });

    if (vehicles.length === 0) {
      console.log('❌ ไม่พบรถในระบบ กรุณาสร้างข้อมูลรถก่อน');
      return;
    }

    console.log(`📋 พบรถในระบบ ${vehicles.length} คัน`);

    // สร้างข้อมูลการเติมน้ำมัน 100 รายการ
    const fuelRecords = [];
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    for (let i = 0; i < 100; i++) {
      // สุ่มเลือกรถ
      const randomVehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      
      // สุ่มวันที่ในเดือนตุลาคม 2025
      const randomDate = new Date(
        startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
      );

      // สุ่มปริมาณน้ำมัน (20-80 ลิตร)
      const fuelAmount = Math.floor(Math.random() * 60) + 20;

      // สุ่มเลขไมล์ (50,000-200,000 กม.)
      const odometer = Math.floor(Math.random() * 150000) + 50000;

      // สุ่มประเภทคนขับ
      const driverTypes = ['main', 'backup', 'other'];
      const randomDriverType = driverTypes[Math.floor(Math.random() * driverTypes.length)];

      let driverName = '';
      let driverLicense = '';

      switch (randomDriverType) {
        case 'main':
          driverName = randomVehicle.mainDriver?.driverName || 'คนขับหลัก';
          driverLicense = randomVehicle.mainDriver?.driverLicense || '';
          break;
        case 'backup':
          driverName = randomVehicle.backupDriver?.driverName || 'คนขับรอง';
          driverLicense = randomVehicle.backupDriver?.driverLicense || '';
          break;
        case 'other':
          driverName = `คนขับแทน ${i % 5 + 1}`;
          driverLicense = '';
          break;
      }

      // สุ่มหมายเหตุ
      const remarks = [
        '',
        'เติมเต็มถัง',
        'เติมตอนเช้า',
        'เติมก่อนเดินทางไกล',
        'เติมหลังจากงาน',
        'เติมน้ำมันราคาพิเศษ',
        'เติมที่ปั๊มประจำ',
        'เติมในเมือง',
        'เติมระหว่างทาง'
      ];
      const randomRemark = remarks[Math.floor(Math.random() * remarks.length)];

      fuelRecords.push({
        vehicleId: randomVehicle.id,
        fuelDate: randomDate,
        fuelAmount: fuelAmount,
        odometer: odometer,
        driverType: randomDriverType,
        driverName: driverName,
        driverLicense: driverLicense || null,
        remark: randomRemark || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // บันทึกลงฐานข้อมูล
    console.log('💾 กำลังบันทึกข้อมูลลงฐานข้อมูล...');
    
    await prisma.fuelRecord.createMany({
      data: fuelRecords
    });

    console.log('✅ สร้างข้อมูลการเติมน้ำมันเสร็จสิ้น!');
    console.log(`📊 สรุปข้อมูลที่สร้าง:`);
    console.log(`   - จำนวนรายการ: ${fuelRecords.length} รายการ`);
    console.log(`   - ช่วงวันที่: ${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`);
    console.log(`   - รถที่ใช้: ${vehicles.length} คัน`);
    
    // แสดงสถิติต่างๆ
    const totalFuel = fuelRecords.reduce((sum, record) => sum + record.fuelAmount, 0);
    const avgFuel = totalFuel / fuelRecords.length;
    const vehicleCount = new Set(fuelRecords.map(r => r.vehicleId)).size;
    
    console.log(`   - ปริมาณน้ำมันรวม: ${totalFuel.toLocaleString('th-TH')} ลิตร`);
    console.log(`   - เฉลี่ยต่อครั้ง: ${avgFuel.toFixed(2)} ลิตร`);
    console.log(`   - จำนวนรถที่เติม: ${vehicleCount} คัน`);

    // แสดงรายการรถที่เติมและจำนวนครั้ง
    const vehicleStats = fuelRecords.reduce((stats, record) => {
      const vehicle = vehicles.find(v => v.id === record.vehicleId);
      const key = vehicle?.licensePlate || 'ไม่ทราบ';
      stats[key] = (stats[key] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    console.log('\n📈 สถิติการเติมน้ำมันตามรถ:');
    Object.entries(vehicleStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([licensePlate, count]) => {
        console.log(`   - ${licensePlate}: ${count} ครั้ง`);
      });

    console.log('\n🎯 ตอนนี้คุณสามารถไปดูรายงาน PDF ได้แล้ว!');
    console.log('📱 ไปที่: http://localhost:3000/reports/reports-fuel-records');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// เรียกใช้ function
createTestFuelRecords();