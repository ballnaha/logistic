import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // สร้าง default users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@logistic.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
    },
  });

  const testUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: hashedPassword,
      email: 'user@logistic.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
    },
  });

  console.log('✅ Users created:', { adminUser, testUser });

  // สร้าง sample vehicle (optional)
  const existingVehicle = await prisma.vehicle.findFirst({
    where: { 
      licensePlate: 'กท-1234',
      isActive: true 
    }
  });

  if (!existingVehicle) {
    const sampleVehicle = await prisma.vehicle.create({
      data: {
        licensePlate: 'กท-1234',
        brand: 'Toyota',
        model: 'Vios',
        color: 'White',
        vehicleType: 'Car',
        ownerId: adminUser.id,
        createdBy: adminUser.username,
      },
    });
    console.log('✅ Sample vehicle created:', sampleVehicle);
  } else {
    console.log('✅ Sample vehicle already exists');
  }
  console.log('🌱 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
