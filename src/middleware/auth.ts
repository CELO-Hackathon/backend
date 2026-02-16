import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { logger } from '../utils/logger';
import { AuthPayload } from '../types/auth';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware to verify JWT token
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided. Please authenticate.',
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify token
    const payload = authService.verifyToken(token);
    
    // Attach user to request
    req.user = payload;
    
    next();
  } catch (error) {
    logger.warn('Authentication failed:', error);
    return res.status(401).json({
      error: 'Invalid or expired token. Please login again.',
    });
  }
};

/**
 * Middleware to verify address matches authenticated user
 */
export const verifyAddressOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userAddress } = req.body;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (userAddress.toLowerCase() !== req.user.address.toLowerCase()) {
    return res.status(403).json({
      error: 'Address mismatch. You can only perform actions for your own address.',
    });
  }
  
  next();
};

/**
 * Optional auth - attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      req.user = payload;
    }
    
    next();
  } catch (error) {
    // Invalid token, but continue without auth
    next();
  }
};