import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '../src/config/env';
import { connectDatabase } from '../src/config/database';
import { blockchain } from '../src/services/blockchain';
import { logger } from '../src/utils/logger';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { apiLimiter } from '../src/middleware/rateLimiter';

// Routes
import authRoutes from '../src/routes/auth';
import intentRoutes from '../src/routes/intent';
import transferRoutes from '../src/routes/transfer';
import agentRoutes from '../src/routes/agent';
import scheduleRoutes from '../src/routes/schedule';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/intent', intentRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/schedule', scheduleRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database connection (cached in serverless)
let isConnected = false;

async function ensureConnection() {
  if (!isConnected) {
    await connectDatabase();
    isConnected = true;
    logger.info('✅ Database connected in serverless function');
  }
}

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  try {
    await ensureConnection();
    return app(req, res);
  } catch (error) {
    logger.error('Serverless function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}