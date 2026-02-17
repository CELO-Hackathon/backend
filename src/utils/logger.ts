// import winston from 'winston';
// import { env } from '../config/env';

// const isVercel = process.env.VERCEL === '1';

// // ✅ Custom JSON replacer to handle BigInt
// const bigIntReplacer = (key: string, value: any) => {
//   if (typeof value === 'bigint') {
//     return value.toString();
//   }
//   return value;
// };

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
//     // ✅ Use custom replacer to handle BigInt
//     const metaStr = Object.keys(meta).length 
//       ? JSON.stringify(meta, bigIntReplacer, 2) 
//       : '';
//     return `${timestamp} [${level}]: ${message} ${metaStr}`;
//   })
// );

// const transports: winston.transport[] = [
//   new winston.transports.Console({
//     format: winston.format.combine(
//       winston.format.colorize(),
//       winston.format.timestamp({ format: 'HH:mm:ss' }),
//       winston.format.printf(({ timestamp, level, message, ...meta }) => {
//         const metaStr = Object.keys(meta).length
//           ? '\n' + JSON.stringify(meta, null, 2)
//           : '';
//         return `${timestamp} [${level}]: ${message}${metaStr}`;
//       })
//     ),
//   }),
// ];

// // ✅ Only write to files locally
// if (!isVercel) {
//   const fs = require('fs');
//   if (!fs.existsSync('logs')) {
//     fs.mkdirSync('logs', { recursive: true });
//   }

//   transports.push(
//     new winston.transports.File({
//       filename: 'logs/error.log',
//       level: 'error',
//       format: winston.format.combine(
//         winston.format.timestamp(),
//         winston.format.json()
//       ),
//     }),
//     new winston.transports.File({
//       filename: 'logs/combined.log',
//       format: winston.format.combine(
//         winston.format.timestamp(),
//         winston.format.json()
//       ),
//     })
//   );
// }

// export const logger = winston.createLogger({
//   level: process.env.LOG_LEVEL || 'info',
//   transports,
// });
  
import winston from 'winston';

const isVercel = process.env.VERCEL === '1';

//  BigInt serializer - handles BigInt in all log objects
const bigIntReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
};

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? '\n' + JSON.stringify(meta, bigIntReplacer, 2) // 
      : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

if (!isVercel) {
  const fs = require('fs');
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
  }

  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json({
          replacer: bigIntReplacer, 
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json({
          replacer: bigIntReplacer, 
        })
      ),
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
});