import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error:', error.errors);
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const parseIntentSchema = z.object({
  userInput: z.string().min(1).max(500),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const executeTransferSchema = z.object({
  intentId: z.string(),
  signature: z.string().startsWith('0x'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  request: z.object({
    recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    amount: z.string(),
    nonce: z.string(),
    deadline: z.string(),
  }).optional(),
});

export const createScheduleSchema = z.object({
  intentId: z.string(),
  signature: z.string().startsWith('0x'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});