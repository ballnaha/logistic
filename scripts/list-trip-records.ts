import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTripRecords() {
  console.log('🚛 Trip Records Database Summary\\n');

  try {
    // ดึงข้อมูล trip records พร้อมข้อมูลที่เกี่ยวข้อง
    const tripRecords = await prisma.tripRecord.findMany({
      include: {
        vehicle: {
          select: {
            licensePlate: true,
            brand: true,
            model: true,
            vehicleType: true
          }
        },
        customer: {
          select: {
            cmCode: true,
            cmName: true,
            cmMileage: true
          }
        },
        tripItems: {
          include: {
            item: {
              select: {
                ptPart: true,
                ptDesc1: true,
                ptUm: true
              }
            }
          }
        }
      },
      orderBy: [
        { departureDate: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20 // แสดงแค่ 20 รายการล่าสุด
    });

    if (tripRecords.length === 0) {
      console.log('❌ ไม่พบ trip records ในฐานข้อมูล');
      return;
    }

    // สถิติรวม
    const totalTrips = await prisma.tripRecord.count();
    const totalDistance = await prisma.tripRecord.aggregate({
      _sum: {
        actualDistance: true,
        estimatedDistance: true
      }
    });

    const totalAllowance = await prisma.tripRecord.aggregate({
      _sum: {
        totalAllowance: true,
        fuelCost: true,
        tollFee: true,
        repairCost: true
      }
    });

    console.log(`📊 สถิติรวม:`);
    console.log(`🚛 Trip Records ทั้งหมด: ${totalTrips} รายการ`);
    console.log(`📏 ระยะทางรวม (ประมาณ): ${totalDistance._sum.estimatedDistance?.toFixed(2) || 0} กม.`);
    console.log(`📏 ระยะทางรวม (จริง): ${totalDistance._sum.actualDistance?.toFixed(2) || 0} กม.`);
    console.log(`💰 ค่าเบี้ยเลี้ยงรวม: ${totalAllowance._sum.totalAllowance?.toFixed(2) || 0} บาท`);
    console.log(`⛽ ค่าน้ำมันรวม: ${totalAllowance._sum.fuelCost?.toFixed(2) || 0} บาท`);
    console.log(`🛣️  ค่าทางด่วนรวม: ${totalAllowance._sum.tollFee?.toFixed(2) || 0} บาท`);
    console.log(`🔧 ค่าซ่อมแซมรวม: ${totalAllowance._sum.repairCost?.toFixed(2) || 0} บาท\\n`);

    // จัดกลุ่มตามเดือน
    const groupedByMonth = tripRecords.reduce((acc, trip) => {
      const monthKey = trip.departureDate.toISOString().substring(0, 7); // YYYY-MM
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(trip);
      return acc;
    }, {} as Record<string, typeof tripRecords>);

    console.log(`📋 รายการ Trip Records (${tripRecords.length} รายการล่าสุด):`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    Object.entries(groupedByMonth)
      .sort(([a], [b]) => b.localeCompare(a)) // เรียงจากเดือนล่าสุด
      .forEach(([month, trips]) => {
        const [year, monthNum] = month.split('-');
        const monthNames = [
          'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const monthName = monthNames[parseInt(monthNum) - 1];
        
        console.log(`\\n📅 ${monthName} ${year} (${trips.length} รายการ):`);
        
        trips.forEach((trip, index) => {
          const departureStr = trip.departureDate.toLocaleDateString('th-TH');
          const returnStr = trip.returnDate?.toLocaleDateString('th-TH') || 'ยังไม่กลับ';
          
          console.log(`${index + 1}. ${trip.documentNumber || 'ไม่มีเลขที่'}`);
          console.log(`   🚗 รถ: ${trip.vehicle.licensePlate} (${trip.vehicle.brand} ${trip.vehicle.model || ''})`);
          console.log(`   📍 ลูกค้า: ${trip.customer.cmName} (${trip.customer.cmCode})`);
          console.log(`   📅 ออก: ${departureStr} ${trip.departureTime} | กลับ: ${returnStr} ${trip.returnTime || ''}`);
          console.log(`   👤 คนขับ: ${trip.driverName || 'ไม่ระบุ'} (${trip.driverType || 'ไม่ระบุ'})`);
          console.log(`   📏 ระยะทาง: ${trip.estimatedDistance} กม. (ประมาณ) | ${trip.actualDistance || 'ไม่ระบุ'} กม. (จริง)`);
          console.log(`   💰 ค่าใช้จ่าย: เบี้ยเลี้ยง ${trip.totalAllowance} บาท | น้ำมัน ${trip.fuelCost || 0} บาท | ทางด่วน ${trip.tollFee || 0} บาท`);
          
          if (trip.tripItems.length > 0) {
            console.log(`   📦 สินค้า (${trip.tripItems.length} รายการ):`);
            trip.tripItems.forEach((item, itemIndex) => {
              console.log(`      ${itemIndex + 1}. ${item.item.ptDesc1} - ${item.quantity} ${item.unit} @ ${item.unitPrice || 0} บาท = ${item.totalPrice || 0} บาท`);
            });
          }
          
          if (trip.remark) {
            console.log(`   📝 หมายเหตุ: ${trip.remark}`);
          }
          console.log('');
        });
      });

    // สถิติแยกตามประเภทรถ
    console.log('\\n📊 สถิติแยกตามประเภทรถ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const vehicleStats = await prisma.tripRecord.groupBy({
      by: ['vehicleId'],
      _count: {
        id: true
      },
      _sum: {
        actualDistance: true,
        totalAllowance: true,
        fuelCost: true
      }
    });

    const vehicleDetails = await prisma.vehicle.findMany({
      where: {
        id: {
          in: vehicleStats.map(stat => stat.vehicleId)
        }
      },
      select: {
        id: true,
        licensePlate: true,
        brand: true,
        model: true,
        vehicleType: true
      }
    });

    vehicleStats
      .sort((a, b) => (b._count.id || 0) - (a._count.id || 0))
      .forEach(stat => {
        const vehicle = vehicleDetails.find(v => v.id === stat.vehicleId);
        if (vehicle) {
          const typeIcon = {
            'Truck': '🚛',
            'Pickup': '🚚',
            'ForkLift': '🏗️',
            'Van': '🚐',
            'Car': '🚗'
          }[vehicle.vehicleType] || '🚙';
          
          console.log(`${typeIcon} ${vehicle.licensePlate} (${vehicle.brand} ${vehicle.model || ''}):`);
          console.log(`   📊 จำนวนเที่ยว: ${stat._count.id || 0} เที่ยว`);
          console.log(`   📏 ระยะทางรวม: ${stat._sum.actualDistance?.toFixed(2) || 0} กม.`);
          console.log(`   💰 ค่าเบี้ยเลี้ยงรวม: ${stat._sum.totalAllowance?.toFixed(2) || 0} บาท`);
          console.log(`   ⛽ ค่าน้ำมันรวม: ${stat._sum.fuelCost?.toFixed(2) || 0} บาท`);
          console.log('');
        }
      });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล trip records:', error);
  }
}

async function main() {
  try {
    await listTripRecords();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();