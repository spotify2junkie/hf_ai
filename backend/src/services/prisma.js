/**
 * Prisma Client Singleton Service
 *
 * Provides a single instance of PrismaClient throughout the application.
 * Implements best practices for connection management and hot reload support.
 * Includes connection pool monitoring and query performance tracking.
 */

const { PrismaClient } = require('../generated/prisma');

/**
 * Connection pool metrics
 */
const connectionMetrics = {
  queriesExecuted: 0,
  totalQueryDuration: 0,
  slowQueries: [], // Queries taking > 1000ms
  errors: 0,
  lastError: null,
};

/**
 * PrismaClient is attached to the global object in development
 * to prevent exhausting database connections during hot reloads.
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });
} else {
  // In development, use a global variable to preserve the client across module reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }
  prisma = global.prisma;
}

/**
 * Monitor query performance
 */
prisma.$on('query', (e) => {
  connectionMetrics.queriesExecuted++;
  connectionMetrics.totalQueryDuration += e.duration;

  // Track slow queries (> 1000ms)
  if (e.duration > 1000) {
    const slowQuery = {
      query: e.query.substring(0, 100), // First 100 chars
      duration: e.duration,
      timestamp: new Date().toISOString(),
    };

    connectionMetrics.slowQueries.push(slowQuery);

    // Keep only last 10 slow queries
    if (connectionMetrics.slowQueries.length > 10) {
      connectionMetrics.slowQueries.shift();
    }

    console.warn(`[Prisma] Slow query detected (${e.duration}ms): ${slowQuery.query}...`);
  }

  // Log queries in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Prisma Query] ${e.query.substring(0, 80)}... (${e.duration}ms)`);
  }
});

/**
 * Monitor errors
 */
prisma.$on('error', (e) => {
  connectionMetrics.errors++;
  connectionMetrics.lastError = {
    message: e.message,
    timestamp: new Date().toISOString(),
  };
  console.error('[Prisma Error]', e);
});

/**
 * Monitor warnings
 */
prisma.$on('warn', (e) => {
  console.warn('[Prisma Warning]', e);
});

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

/**
 * Get connection pool metrics
 * @returns {Object} Current metrics
 */
function getConnectionMetrics() {
  return {
    ...connectionMetrics,
    averageQueryDuration:
      connectionMetrics.queriesExecuted > 0
        ? Math.round(connectionMetrics.totalQueryDuration / connectionMetrics.queriesExecuted)
        : 0,
    uptime: process.uptime(),
  };
}

/**
 * Reset connection metrics (useful for testing)
 */
function resetConnectionMetrics() {
  connectionMetrics.queriesExecuted = 0;
  connectionMetrics.totalQueryDuration = 0;
  connectionMetrics.slowQueries = [];
  connectionMetrics.errors = 0;
  connectionMetrics.lastError = null;
}

module.exports = prisma;
module.exports.getConnectionMetrics = getConnectionMetrics;
module.exports.resetConnectionMetrics = resetConnectionMetrics;
