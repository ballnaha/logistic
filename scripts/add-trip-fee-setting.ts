import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTripFeeSetting() {
  try {
    console.log('Adding trip fee setting to database...');
    
    // Check if setting already exists
    const existing = await prisma.$queryRaw`
      SELECT * FROM system_settings WHERE setting_key = 'trip_fee' LIMIT 1
    ` as any[];

    if (existing.length > 0) {
      // Update existing
      await prisma.$executeRaw`
        UPDATE system_settings 
        SET value = '30', description = 'ค่าเที่ยว (บาท)', updated_at = NOW()
        WHERE setting_key = 'trip_fee'
      `;
      console.log('✓ Updated existing trip fee setting');
    } else {
      // Insert new
      await prisma.$executeRaw`
        INSERT INTO system_settings (setting_key, value, description, created_at, updated_at) 
        VALUES ('trip_fee', '30', 'ค่าเที่ยว (บาท)', NOW(), NOW())
      `;
      console.log('✓ Created new trip fee setting');
    }

    // Verify
    const result = await prisma.$queryRaw`
      SELECT * FROM system_settings WHERE setting_key = 'trip_fee'
    ` as any[];
    
    console.log('\nTrip Fee Setting:');
    console.log(result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTripFeeSetting();
