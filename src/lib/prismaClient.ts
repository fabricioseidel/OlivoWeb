import { PrismaClient } from "../generated/prisma";

// Evitar múltiples instancias en desarrollo debido a hot-reloading
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prismaClient = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;
