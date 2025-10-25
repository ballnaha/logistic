import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // เพิ่มการตั้งค่าสำหรับประสิทธิภาพและ timeout
  datasources: {
    db: {
      url: process.env.MYSQL_DATABASE_URL,
    },
  },
  // เปิด query logging ใน development เพื่อ debug
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
