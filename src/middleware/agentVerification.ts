import { Request, Response, NextFunction } from 'express';
import { blockchain } from '../services/blockchain';
import { logger } from '../utils/logger';

/**
 * Middleware to check if agent is verified
 * Use this on routes that require agent functionality
 */
export const requireAgentVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isVerified = await blockchain.verifyAgentOwnership();
    
    if (!isVerified) {
      logger.warn('Agent verification required but agent is not verified');
      return res.status(503).json({
        error: 'Agent not verified',
        message: 'The PulseRemit agent is not registered yet. Please contact support or register the agent.',
        code: 'AGENT_NOT_VERIFIED'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Agent verification check failed:', error);
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'Unable to verify agent status. Please try again later.',
      code: 'AGENT_VERIFICATION_FAILED'
    });
  }
};

/**
 * Optional middleware - warns but doesn't block
 */
export const warnIfAgentUnverified = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isVerified = await blockchain.verifyAgentOwnership();
    
    if (!isVerified) {
      logger.warn('Agent not verified - request proceeding anyway');
    }
    
    next();
  } catch (error) {
    logger.warn('Could not verify agent, proceeding anyway:', error);
    next();
  }
};