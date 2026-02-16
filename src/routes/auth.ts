import { Router } from 'express';
import { authService } from '../services/auth';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { validate } from '../middleware/validation';

const router = Router();

// Validation schemas
const getNonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const loginSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  signature: z.string().startsWith('0x'),
  message: z.string(),
});

/**
 * POST /api/auth/nonce
 * Request a nonce for signing
 */
router.post('/nonce', validate(getNonceSchema), async (req, res, next) => {
  try {
    const { address } = req.body;
    
    const nonce = await authService.generateNonce(address);
    const message = authService.generateAuthMessage(nonce);
    
    res.json({
      message,
      expiresIn: 300, // 5 minutes in seconds
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Verify signature and get JWT token
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const response = await authService.verifyAndLogin(req.body);
    
    res.json(response);
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (clear nonces)
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await authService.logout(req.user.address);
    
    res.json({ message: 'Logged out successfully' });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    res.json({
      address: req.user.address,
      authenticatedAt: new Date(req.user.iat * 1000),
      expiresAt: new Date(req.user.exp * 1000),
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (before expiry)
 */
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Generate new nonce for re-authentication
    const nonce = await authService.generateNonce(req.user.address);
    const message = authService.generateAuthMessage(nonce);
    
    res.json({
      message,
      expiresIn: 300,
      note: 'Sign this message to refresh your session',
    });
    
  } catch (error) {
    next(error);
  }
});

export default router;