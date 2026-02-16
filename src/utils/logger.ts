// import winston from 'winston';
// import { env } from '../config/env';

// const logFormat = winston.format.combine(
//   winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
//   winston.format.errors({ stack: true }),
//   winston.format.splat(),
//   winston.format.json()
// );

// const consoleFormat = winston.format.combine(
//   winston.format.colorize(),
//   winston.format.timestamp({ format: 'HH:mm:ss' }),
//   winston.format.printf(({ timestamp, level, message, ...meta }) => {
//     const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
//     return `${timestamp} [${level}]: ${message} ${metaStr}`;
//   })
// );

// export const logger = winston.createLogger({
//   level: env.NODE_ENV === 'production' ? 'info' : 'debug',
//   format: logFormat,
//   transports: [
//     new winston.transports.Console({
//       format: consoleFormat,
//     }),
//     new winston.transports.File({
//       filename: 'logs/error.log',
//       level: 'error',
//     }),
//     new winston.transports.File({
//       filename: 'logs/combined.log',
//     }),
//   ],
// });

import winston from 'winston';
import { env } from '../config/env';

// ✅ Custom JSON replacer to handle BigInt
const bigIntReplacer = (key: string, value: any) => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // ✅ Use custom replacer to handle BigInt
    const metaStr = Object.keys(meta).length 
      ? JSON.stringify(meta, bigIntReplacer, 2) 
      : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});