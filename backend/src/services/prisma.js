/**
 * Prisma Client Singleton Service
 *
 * Provides a single instance of PrismaClient throughout the application.
 * Implements best practices for connection management and hot reload support.
 */

const { PrismaClient } = require('../generated/prisma');

/**
 * PrismaClient is attached to the global object in development
 * to prevent exhausting database connections during hot reloads.
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} else {
  // In development, use a global variable to preserve the client across module reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
  }
  prisma = global.prisma;
}

/**
 * Gracefully disconnect Prisma Client on process termination
 */
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prisma;
