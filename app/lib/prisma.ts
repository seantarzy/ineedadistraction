import { PrismaClient } from '@prisma/client';

// Avoid hot-reload connection storms in dev by caching on globalThis.
const g = global as typeof globalThis & { _prisma?: PrismaClient };

export const prisma = g._prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') g._prisma = prisma;
