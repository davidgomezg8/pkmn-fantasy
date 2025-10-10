import { PrismaClient } from '@prisma/client';

// Declaramos una variable global para el cliente de Prisma para que no se cree una nueva instancia con cada recarga en desarrollo.
declare global {
  var prisma: PrismaClient | undefined;
}

const client = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = client;

export default client;
