import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const transferLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 transfers per minute
  message: 'Transfer rate limit exceeded. Please wait before trying again.',
});