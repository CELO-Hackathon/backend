import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { blockchain } from './services/blockchain';
import { scheduler } from './services/scheduler';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import intentRoutes from './routes/intent';
import transferRoutes from './routes/transfer';
import agentRoutes from './routes/agent';
import scheduleRoutes from './routes/schedule';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
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

//  Agent verification state
let agentVerified = false;
let agentReputationScore = 0;

// Initialize
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    //  Try to verify blockchain connection (non-blocking)
    try {
      const isOwner = await blockchain.verifyAgentOwnership();
      
      if (!isOwner) {
        logger.warn('⚠️  Agent ownership verification failed!');
        logger.warn('⚠️  The agent may not be registered yet or the private key is incorrect.');
        logger.warn('⚠️  To register your agent:');
        logger.warn('   1. Get test CELO from: https://faucet.celo.org/celo-sepolia');
        logger.warn('   2. Run: ./scripts/register-agent-quick.sh');
        logger.warn('   3. Update PLATFORM_AGENT_ID in .env');
        logger.warn('');
        logger.warn('🔄 Server will continue running. Some features may be limited.');
        agentVerified = false;
      } else {
        logger.info(' Agent ownership verified');
        agentVerified = true;
        
        // Get agent reputation
        try {
          const rep = await blockchain.getAgentReputation();
          agentReputationScore = rep.averageRating;
          
          logger.info('Agent reputation:', {
            agentId: rep.agentId,
            rating: `${rep.averageRating}/5`,
            feedbackCount: rep.feedbackCount,
            totalTransactions: rep.totalTransactions,
          });
        } catch (repError) {
          logger.warn('⚠️  Could not fetch agent reputation:', repError instanceof Error ? repError.message : 'Unknown error');
        }
      }
    } catch (verifyError) {
      logger.error('⚠️  Blockchain connection error:', verifyError instanceof Error ? verifyError.message : 'Unknown error');
      logger.warn('⚠️  This might be due to:');
      logger.warn('   - Network connectivity issues');
      logger.warn('   - Invalid RPC URL');
      logger.warn('   - Agent not registered yet');
      logger.warn('');
      logger.warn('🔄 Server will continue running in degraded mode.');
      agentVerified = false;
    }
    
    //  Start scheduler (it will handle errors gracefully)
    try {
      scheduler.start();
    } catch (schedulerError) {
      logger.warn('⚠️  Scheduler failed to start:', schedulerError instanceof Error ? schedulerError.message : 'Unknown error');
      logger.warn('   Recurring transfers will not work until this is resolved.');
    }
    
    // Start server (always succeeds)
    const PORT = parseInt(env.PORT);
    app.listen(PORT, () => {
      logger.info('');
      logger.info('================================');
      logger.info(`🚀 PulseRemit Backend Server`);
      logger.info('================================');
      logger.info(`Port: ${PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Agent Verified: ${agentVerified ? ' Yes' : '⚠️  No'}`);
      if (agentVerified) {
        logger.info(`Agent ID: ${env.PLATFORM_AGENT_ID}`);
        logger.info(`Reputation: ${agentReputationScore}/5`);
      }
      logger.info(`Vault: ${env.VAULT_ADDRESS}`);
      logger.info('');
      
      if (!agentVerified) {
        logger.warn('⚠️  WARNING: Agent not verified!');
        logger.warn('   Some features will not work:');
        logger.warn('   - Transfer execution');
        logger.warn('   - Reputation tracking');
        logger.warn('   - Schedule execution');
        logger.warn('');
        logger.warn('   To fix this, register your agent first.');
        logger.warn('');
      }
      
      logger.info('Server ready to accept connections');
      logger.info('================================');
      logger.info('');
    });
    
  } catch (error) {
    logger.error('❌ Fatal error starting server:', error);
    logger.error('Server cannot start. Please fix the error and try again.');
    process.exit(1);
  }
};

//  Periodic agent verification check (every 5 minutes)
const setupAgentVerificationCheck = () => {
  setInterval(async () => {
    if (!agentVerified) {
      try {
        const isOwner = await blockchain.verifyAgentOwnership();
        if (isOwner) {
          logger.info(' Agent verification successful! Agent is now verified.');
          agentVerified = true;
          
          // Get reputation
          try {
            const rep = await blockchain.getAgentReputation();
            agentReputationScore = rep.averageRating;
            logger.info(`Agent reputation: ${rep.averageRating}/5 (${rep.feedbackCount} feedback)`);
          } catch (e) {
            // Ignore reputation errors
          }
        }
      } catch (error) {
        // Silently fail - we'll try again in 5 minutes
      }
    }
  }, 5 * 60 * 1000); // 5 minutes
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

// Start everything
startServer();
setupAgentVerificationCheck();