import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ข้อมูลรถที่จะสร้าง
const vehicleData = [
  // รถบรรทุก (Truck)
  {
    licensePlate: 'กท-1001',
    brand: 'Isuzu',
    model: 'NPR 150',
    color: 'สีขาว',
    weight: 3500.00,
    fuelTank: 80.00,
    fuelConsume: 8.50,
    fuelConsumeMth: 800.00,
    vehicleType: 'Truck',
    driverName: 'สมชาย สุขใส',
    driverLicense: 'DL-12345678',
    backupDriverName: 'สมหมาย ใจดี',
    backupDriverLicense: 'DL-87654321',
    remark: 'รถบรรทุกสำหรับขนส่งสินค้าทั่วไป',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'นน-2002',
    brand: 'Mitsubishi',
    model: 'Fuso Canter',
    color: 'สีน้ำเงิน',
    weight: 4200.00,
    fuelTank: 90.00,
    fuelConsume: 7.20,
    fuelConsumeMth: 950.00,
    vehicleType: 'Truck',
    driverName: 'วิชัย เก่งกาจ',
    driverLicense: 'DL-11111111',
    backupDriverName: 'สมศักดิ์ มั่นคง',
    backupDriverLicense: 'DL-22222222',
    remark: 'รถบรรทุกขนาดกลาง สำหรับสินค้าหนัก',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'ขก-3003',
    brand: 'Hino',
    model: 'XZU720L',
    color: 'สีแดง',
    weight: 5000.00,
    fuelTank: 100.00,
    fuelConsume: 6.80,
    fuelConsumeMth: 1200.00,
    vehicleType: 'Truck',
    driverName: 'อนุชา รวดเร็ว',
    driverLicense: 'DL-33333333',
    backupDriverName: 'บุญเลิศ ปลอดภัย',
    backupDriverLicense: 'DL-44444444',
    remark: 'รถบรรทุกขนาดใหญ่ สำหรับขนส่งระยะไกล',
    isActive: true,
    createdBy: 'admin'
  },

  // รถกระบะ (Pickup)
  {
    licensePlate: 'ดส-4004',
    brand: 'Toyota',
    model: 'Hilux Revo',
    color: 'สีเทา',
    weight: 2100.00,
    fuelTank: 80.00,
    fuelConsume: 12.00,
    fuelConsumeMth: 400.00,
    vehicleType: 'Pickup',
    driverName: 'สมบัติ ชำนาญ',
    driverLicense: 'DL-55555555',
    backupDriverName: 'วัฒนา คล่องแคล่ว',
    backupDriverLicense: 'DL-66666666',
    remark: 'รถกระบะสำหรับขนส่งสินค้าขนาดเล็ก',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'ปท-5005',
    brand: 'Ford',
    model: 'Ranger',
    color: 'สีดำ',
    weight: 2200.00,
    fuelTank: 75.00,
    fuelConsume: 11.50,
    fuelConsumeMth: 350.00,
    vehicleType: 'Pickup',
    driverName: 'ชัยวัฒน์ มีสุข',
    driverLicense: 'DL-77777777',
    backupDriverName: 'ประเสริฐ ดีงาม',
    backupDriverLicense: 'DL-88888888',
    remark: 'รถกระบะสำหรับงานขนส่งทั่วไป',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'มค-6006',
    brand: 'Isuzu',
    model: 'D-Max',
    color: 'สีส้ม',
    weight: 2000.00,
    fuelTank: 76.00,
    fuelConsume: 13.00,
    fuelConsumeMth: 300.00,
    vehicleType: 'Pickup',
    driverName: 'กิตติ์ ขยันดี',
    driverLicense: 'DL-99999999',
    backupDriverName: 'สุรพล มั่นใจ',
    backupDriverLicense: 'DL-10101010',
    remark: 'รถกระบะสำหรับงานส่งด่วน',
    isActive: true,
    createdBy: 'admin'
  },

  // รถยก (ForkLift)
  {
    licensePlate: 'FL-7007',
    brand: 'Toyota',
    model: '8FD25',
    color: 'สีเหลือง',
    weight: 4500.00,
    fuelTank: 45.00,
    fuelConsume: 5.00,
    fuelConsumeMth: 200.00,
    vehicleType: 'ForkLift',
    driverName: 'ภูมิใจ แกร่งกล้า',
    driverLicense: 'FL-11111111',
    backupDriverName: 'นิรันดร์ เชี่ยวชาญ',
    backupDriverLicense: 'FL-22222222',
    remark: 'รถยกในโกดัง ยกได้ 2.5 ตัน',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'FL-8008',
    brand: 'Komatsu',
    model: 'FD30T-17',
    color: 'สีน้ำเงิน',
    weight: 5200.00,
    fuelTank: 50.00,
    fuelConsume: 4.50,
    fuelConsumeMth: 250.00,
    vehicleType: 'ForkLift',
    driverName: 'สมคิด ฉลาดกล',
    driverLicense: 'FL-33333333',
    backupDriverName: 'ชาติชาย ปลอดภัย',
    backupDriverLicense: 'FL-44444444',
    remark: 'รถยกขนาดใหญ่ ยกได้ 3 ตัน',
    isActive: true,
    createdBy: 'admin'
  },

  // รถตู้ (Van)
  {
    licensePlate: 'ศศ-9009',
    brand: 'Toyota',
    model: 'Hiace',
    color: 'สีขาว',
    weight: 2800.00,
    fuelTank: 70.00,
    fuelConsume: 10.00,
    fuelConsumeMth: 500.00,
    vehicleType: 'Van',
    driverName: 'เจริญ บริการดี',
    driverLicense: 'DL-12121212',
    backupDriverName: 'สุชาติ รอบคอบ',
    backupDriverLicense: 'DL-13131313',
    remark: 'รถตู้สำหรับขนส่งสินค้าในเมือง',
    isActive: true,
    createdBy: 'admin'
  },
  {
    licensePlate: 'ฮฮ-1010',
    brand: 'Nissan',
    model: 'Urvan',
    color: 'สีเงิน',
    weight: 2650.00,
    fuelTank: 65.00,
    fuelConsume: 10.50,
    fuelConsumeMth: 450.00,
    vehicleType: 'Van',
    driverName: 'ธีรยุทธ ซื่อสัตย์',
    driverLicense: 'DL-14141414',
    backupDriverName: 'ธนาคาร น่าเชื่อถือ',
    backupDriverLicense: 'DL-15151515',
    remark: 'รถตู้สำหรับงานส่งเอกสาร',
    isActive: true,
    createdBy: 'admin'
  }
];

async function createVehicles() {
  console.log('🚗 Starting vehicle creation...');

  // หาผู้ใช้ admin เพื่อกำหนดเป็น owner
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (!adminUser) {
    console.error('❌ Admin user not found. Please run seed script first.');
    return;
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const vehicleInfo of vehicleData) {
    try {
      // ตรวจสอบว่ามีรถที่มีทะเบียนเดียวกันอยู่แล้วหรือไม่
      const existingVehicle = await prisma.vehicle.findFirst({
        where: { 
          licensePlate: vehicleInfo.licensePlate,
          isActive: true 
        }
      });

      if (existingVehicle) {
        console.log(`⚠️  รถทะเบียน ${vehicleInfo.licensePlate} มีอยู่แล้ว - ข้าม`);
        skippedCount++;
        continue;
      }

      // สร้างรถใหม่
      const vehicle = await prisma.vehicle.create({
        data: {
          ...vehicleInfo,
          ownerId: adminUser.id,
          weight: vehicleInfo.weight ? parseFloat(vehicleInfo.weight.toString()) : null,
          fuelTank: vehicleInfo.fuelTank ? parseFloat(vehicleInfo.fuelTank.toString()) : null,
          fuelConsume: vehicleInfo.fuelConsume ? parseFloat(vehicleInfo.fuelConsume.toString()) : null,
          fuelConsumeMth: vehicleInfo.fuelConsumeMth ? parseFloat(vehicleInfo.fuelConsumeMth.toString()) : null,
        },
      });

      console.log(`✅ สร้างรถสำเร็จ: ${vehicle.licensePlate} (${vehicle.brand} ${vehicle.model})`);
      createdCount++;

    } catch (error) {
      console.error(`❌ เกิดข้อผิดพลาดขณะสร้างรถ ${vehicleInfo.licensePlate}:`, error);
    }
  }

  console.log('\n📊 สรุปผลการสร้างรถ:');
  console.log(`✅ สร้างสำเร็จ: ${createdCount} คัน`);
  console.log(`⚠️  ข้ามแล้ว: ${skippedCount} คัน`);
  console.log(`📝 รวมทั้งหมด: ${vehicleData.length} คัน`);
  console.log('\n🚗 Vehicle creation completed!');
}

async function main() {
  try {
    await createVehicles();
  } catch (error) {
    console.error('❌ Error during vehicle creation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();