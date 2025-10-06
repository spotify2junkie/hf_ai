const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const papersRouter = require('./routes/papers');
const aiInterpretationRouter = require('./routes/ai-interpretation');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting configuration
// NOTE: Using in-memory store. For production with multiple instances,
// consider using Redis store: https://github.com/express-rate-limit/rate-limit-redis
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health check endpoint
  skip: (req) => req.path === '/health' || req.path === '/api/papers/health' || req.path === '/api/ai-interpretation/health',
});

// Stricter rate limit for AI interpretation (resource intensive)
// Applied INSTEAD of general limiter (not in addition to)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 AI requests per hour
  message: 'AI interpretation rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even failed ones
});

// CORS configuration - restrict to known origins
const allowedOrigins = [
  'http://localhost:3000',  // React frontend
  'http://localhost:3002',  // Next.js frontend
  process.env.FRONTEND_URL, // Production frontend URL from env
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));

// Morgan logging - exclude Authorization header to prevent API key leakage
morgan.token('sanitized-headers', (req) => {
  const sanitized = { ...req.headers };
  if (sanitized.authorization) {
    sanitized.authorization = '[REDACTED]';
  }
  return JSON.stringify(sanitized);
});

// Use custom morgan format that doesn't log sensitive headers
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

app.use(express.json());

// Routes - AI route registered BEFORE global limiter to use only aiLimiter
app.use('/api/ai-interpretation', aiLimiter, aiInterpretationRouter);

// Apply general rate limiting to remaining routes
app.use(limiter);

// Other routes (protected by general limiter)
app.use('/api/papers', papersRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;