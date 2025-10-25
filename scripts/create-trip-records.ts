import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ข้อมูล customers ตัวอย่าง
const customerData = [
  {
    cmCode: 'CM001',
    cmName: 'บริษัท ไทยแสตนเลส จำกัด',
    cmAddress: '123 ถนนรามคำแหง เขตบางเขน กรุงเทพฯ 10230',
    cmPhone: '02-123-4567',
    cmSalesname: 'สมชาย จันทร์เจ้า',
    cmMileage: 45.50,
    lat: 13.7563,
    long: 100.5018,
    isActive: true,
    createdBy: 'admin'
  },
  {
    cmCode: 'CM002',
    cmName: 'บริษัท เอเซีย ปลาสติก จำกัด',
    cmAddress: '456 ซอยลาดพร้าว 15 เขตจตุจักร กรุงเทพฯ 10900',
    cmPhone: '02-234-5678',
    cmSalesname: 'วิไล สุขสมบูรณ์',
    cmMileage: 32.20,
    lat: 13.8199,
    long: 100.5569,
    isActive: true,
    createdBy: 'admin'
  },
  {
    cmCode: 'CM003',
    cmName: 'บริษัท โรงงานกระดาษ ไทย จำกัด',
    cmAddress: '789 ถนนเพชรบุรี เขตราชเทวี กรุงเทพฯ 10400',
    cmPhone: '02-345-6789',
    cmSalesname: 'อนุชา ยิ่งยง',
    cmMileage: 28.75,
    lat: 13.7427,
    long: 100.5434,
    isActive: true,
    createdBy: 'admin'
  },
  {
    cmCode: 'CM004',
    cmName: 'บริษัท สยาม เคมิคอล จำกัด',
    cmAddress: '321 ถนนสุขุมวิท 21 เขตวัฒนา กรุงเทพฯ 10110',
    cmPhone: '02-456-7890',
    cmSalesname: 'ประยุทธ์ มั่นคง',
    cmMileage: 38.90,
    lat: 13.7391,
    long: 100.5693,
    isActive: true,
    createdBy: 'admin'
  },
  {
    cmCode: 'CM005',
    cmName: 'บริษัท นอร์ท สตีล จำกัด',
    cmAddress: '654 ถนนพหลโยธิน เขตลาดพร้าว กรุงเทพฯ 10230',
    cmPhone: '02-567-8901',
    cmSalesname: 'รัชนี ชาญศิลป์',
    cmMileage: 52.10,
    lat: 13.8047,
    long: 100.5634,
    isActive: true,
    createdBy: 'admin'
  }
];

// ข้อมูล items ตัวอย่าง
const itemData = [
  {
    ptPart: 'STL001',
    ptDesc1: 'เหล็กแผ่น สแตนเลส 304',
    ptDesc2: 'หนา 1.5 มม. ขนาด 1200x2400 มม.',
    ptUm: 'แผ่น',
    ptPrice: 2500.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'STL002',
    ptDesc1: 'เหล็กกล่อง สแตนเลส 316L',
    ptDesc2: 'ขนาด 50x50x2 มม. ยาว 6 เมตร',
    ptUm: 'เส้น',
    ptPrice: 1850.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'PLA001',
    ptDesc1: 'แผ่นพลาสติก ABS',
    ptDesc2: 'หนา 3 มม. ขนาด 1000x2000 มม.',
    ptUm: 'แผ่น',
    ptPrice: 450.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'PLA002',
    ptDesc1: 'ท่อ PVC ขาว',
    ptDesc2: 'เส้นผ่านศูนย์กลาง 4 นิ้ว ยาว 6 เมตร',
    ptUm: 'เส้น',
    ptPrice: 280.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'CHM001',
    ptDesc1: 'สารเคมี โซเดียมไฮดรอกไซด์',
    ptDesc2: 'บริสุทธิ์ 99% บรรจุถุง 25 กก.',
    ptUm: 'ถุง',
    ptPrice: 380.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'CHM002',
    ptDesc1: 'กรดซัลฟิวริก',
    ptDesc2: 'ความเข้มข้น 98% บรรจุขวด 1 ลิตร',
    ptUm: 'ขวด',
    ptPrice: 150.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'PAP001',
    ptDesc1: 'กระดาษแข็ง A4',
    ptDesc2: 'น้ำหนัก 300 แกรม บรรจุ 500 แผ่น',
    ptUm: 'รีม',
    ptPrice: 125.00,
    isActive: true,
    createdBy: 'admin'
  },
  {
    ptPart: 'PAP002',
    ptDesc1: 'กล่องกระดาษลูกฟูก',
    ptDesc2: 'ขนาด 30x20x15 ซม. แข็งแรงพิเศษ',
    ptUm: 'ใบ',
    ptPrice: 25.00,
    isActive: true,
    createdBy: 'admin'
  }
];

// ฟังก์ชันสำหรับสร้าง trip records แบบสุ่ม
function generateTripRecords(vehicleIds: number[], customerIds: number[], itemIds: number[]) {
  const tripRecords = [];
  const today = new Date();
  
  // สร้าง trip records ย้อนหลัง 3 เดือน
  for (let i = 0; i < 50; i++) {
    // สุ่มวันที่ย้อนหลัง 0-90 วัน
    const daysBack = Math.floor(Math.random() * 90);
    const departureDate = new Date(today);
    departureDate.setDate(today.getDate() - daysBack);
    
    // สุ่มเวลาออก (06:00 - 18:00)
    const departureHour = Math.floor(Math.random() * 12) + 6;
    const departureMinute = Math.floor(Math.random() * 4) * 15; // 00, 15, 30, 45
    const departureTime = `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`;
    
    // สุ่มจำนวนวัน (1-5 วัน)
    const days = Math.floor(Math.random() * 5) + 1;
    
    // คำนวณวันที่กลับ
    const returnDate = new Date(departureDate);
    returnDate.setDate(departureDate.getDate() + days - 1);
    
    // สุ่มเวลากลับ (08:00 - 20:00)
    const returnHour = Math.floor(Math.random() * 12) + 8;
    const returnMinute = Math.floor(Math.random() * 4) * 15;
    const returnTime = `${returnHour.toString().padStart(2, '0')}:${returnMinute.toString().padStart(2, '0')}`;
    
    // สุ่มระยะทาง
    const estimatedDistance = Math.floor(Math.random() * 400) + 50; // 50-450 km
    const actualDistance = estimatedDistance + (Math.random() - 0.5) * 20; // ±10 km
    
    // สุ่มไมล์
    const odometerBefore = Math.floor(Math.random() * 50000) + 10000;
    const odometerAfter = odometerBefore + Math.floor(actualDistance);
    
    // คำนวณค่าใช้จ่าย
    const allowanceRate = 150.00;
    const totalAllowance = days * allowanceRate;
    
    const fuelCost = Math.floor(Math.random() * 2000) + 500; // 500-2500 บาท
    const tollFee = Math.floor(Math.random() * 300) + 50; // 50-350 บาท
    const distanceCheckFee = days > 1 ? Math.floor(Math.random() * 200) + 100 : 0; // 100-300 บาท
    const repairCost = Math.random() > 0.8 ? Math.floor(Math.random() * 1500) + 200 : 0; // 20% chance
    
    // สุ่ม vehicle, customer
    const vehicleId = vehicleIds[Math.floor(Math.random() * vehicleIds.length)];
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    
    // สุ่มประเภทคนขับ
    const driverTypes = ['main', 'backup'];
    const driverType = driverTypes[Math.floor(Math.random() * driverTypes.length)];
    
    // ชื่อคนขับตัวอย่าง
    const mainDrivers = ['สมชาย สุขใส', 'วิชัย เก่งกาจ', 'อนุชา รวดเร็ว', 'สมบัติ ชำนาญ', 'ชัยวัฒน์ มีสุข'];
    const backupDrivers = ['สมหมาย ใจดี', 'สมศักดิ์ มั่นคง', 'บุญเลิศ ปลอดภัย', 'วัฒนา คล่องแคล่ว', 'ประเสริฐ ดีงาม'];
    
    const driverName = driverType === 'main' 
      ? mainDrivers[Math.floor(Math.random() * mainDrivers.length)]
      : backupDrivers[Math.floor(Math.random() * backupDrivers.length)];
    
    // เลขที่เอกสาร
    const documentNumber = `TR${departureDate.getFullYear()}${(departureDate.getMonth() + 1).toString().padStart(2, '0')}${(i + 1).toString().padStart(4, '0')}`;
    
    const tripRecord = {
      vehicleId,
      customerId,
      departureDate,
      departureTime,
      returnDate,
      returnTime,
      odometerBefore,
      odometerAfter,
      actualDistance: parseFloat(actualDistance.toFixed(2)),
      estimatedDistance: parseFloat(estimatedDistance.toFixed(2)),
      driverType,
      driverName,
      days,
      allowanceRate: parseFloat(allowanceRate.toFixed(2)),
      totalAllowance: parseFloat(totalAllowance.toFixed(2)),
      loadingDate: departureDate, // ใช้วันเดียวกับวันออก
      distanceCheckFee: parseFloat(distanceCheckFee.toFixed(2)),
      fuelCost: parseFloat(fuelCost.toFixed(2)),
      tollFee: parseFloat(tollFee.toFixed(2)),
      repairCost: parseFloat(repairCost.toFixed(2)),
      documentNumber,
      remark: Math.random() > 0.7 ? 'ขนส่งเรียบร้อย ไม่มีปัญหา' : null,
      createdBy: 'admin'
    };
    
    // สร้าง trip items สำหรับ trip record นี้
    const tripItems = [];
    const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per trip
    
    for (let j = 0; j < numItems; j++) {
      const itemId = itemIds[Math.floor(Math.random() * itemIds.length)];
      const quantity = Math.floor(Math.random() * 20) + 1; // 1-20 quantity
      const unitPrice = Math.random() * 1000 + 100; // 100-1100 บาท
      const totalPrice = quantity * unitPrice;
      
      tripItems.push({
        itemId,
        quantity: parseFloat(quantity.toFixed(2)),
        unit: 'ชิ้น',
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        totalPrice: parseFloat(totalPrice.toFixed(2)),
        remark: Math.random() > 0.8 ? 'ตรวจสอบคุณภาพแล้ว' : null
      });
    }
    
    tripRecords.push({ tripRecord, tripItems });
  }
  
  return tripRecords;
}

async function createTripRecords() {
  console.log('🚛 Starting trip records creation...');

  try {
    // 1. สร้าง customers และ items ก่อน
    console.log('📋 Creating customers...');
    const createdCustomers = [];
    for (const customer of customerData) {
      const existing = await prisma.customer.findUnique({
        where: { cmCode: customer.cmCode }
      });
      
      if (!existing) {
        const created = await prisma.customer.create({ data: customer });
        createdCustomers.push(created);
        console.log(`✅ สร้างลูกค้า: ${customer.cmName}`);
      } else {
        createdCustomers.push(existing);
        console.log(`⚠️  ลูกค้า ${customer.cmName} มีอยู่แล้ว`);
      }
    }

    console.log('📦 Creating items...');
    const createdItems = [];
    for (const item of itemData) {
      const existing = await prisma.item.findUnique({
        where: { ptPart: item.ptPart }
      });
      
      if (!existing) {
        const created = await prisma.item.create({ data: item });
        createdItems.push(created);
        console.log(`✅ สร้างสินค้า: ${item.ptDesc1}`);
      } else {
        createdItems.push(existing);
        console.log(`⚠️  สินค้า ${item.ptDesc1} มีอยู่แล้ว`);
      }
    }

    // 2. ดึงข้อมูลรถที่มีอยู่
    const vehicles = await prisma.vehicle.findMany({
      where: { isActive: true }
    });

    if (vehicles.length === 0) {
      console.log('❌ ไม่พบรถในระบบ กรุณารัน npm run create:vehicles ก่อน');
      return;
    }

    console.log(`🚗 พบรถ ${vehicles.length} คัน`);
    console.log(`👥 พบลูกค้า ${createdCustomers.length} ราย`);
    console.log(`📦 พบสินค้า ${createdItems.length} รายการ`);

    // 3. สร้าง trip records
    console.log('\\n🚛 Creating trip records...');
    const vehicleIds = vehicles.map(v => v.id);
    const customerIds = createdCustomers.map(c => c.id);
    const itemIds = createdItems.map(i => i.id);
    
    const tripRecordsData = generateTripRecords(vehicleIds, customerIds, itemIds);
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const { tripRecord, tripItems } of tripRecordsData) {
      try {
        // สร้าง trip record พร้อม trip items
        const created = await prisma.tripRecord.create({
          data: {
            ...tripRecord,
            tripItems: {
              create: tripItems
            }
          },
          include: {
            vehicle: true,
            customer: true,
            tripItems: {
              include: {
                item: true
              }
            }
          }
        });

        console.log(`✅ สร้าง Trip Record: ${created.documentNumber} - ${created.vehicle.licensePlate} -> ${created.customer.cmName}`);
        createdCount++;

      } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดขณะสร้าง trip record:`, error);
        skippedCount++;
      }
    }

    console.log('\\n📊 สรุปผลการสร้าง Trip Records:');
    console.log(`✅ สร้างสำเร็จ: ${createdCount} รายการ`);
    console.log(`❌ ล้มเหลว: ${skippedCount} รายการ`);
    console.log(`📝 รวมทั้งหมด: ${tripRecordsData.length} รายการ`);
    console.log('\\n🚛 Trip records creation completed!');

  } catch (error) {
    console.error('❌ Error during trip records creation:', error);
  }
}

async function main() {
  try {
    await createTripRecords();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();