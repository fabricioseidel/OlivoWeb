import { PrismaClient } from "@prisma/client";

// Evitar múltiples instancias en desarrollo (hot reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prismaClient = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error']
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient;
