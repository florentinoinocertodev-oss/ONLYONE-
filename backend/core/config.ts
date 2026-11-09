import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'onlyone.db'),
  migrationsDir: path.resolve(process.cwd(), 'migrations'),
  backupsDir: path.resolve(process.cwd(), 'data', 'backups'),
  session: {
    ttlDays: 7,
    ttlSeconds: 7 * 24 * 60 * 60,
    cookieName: 'onlyone_session',
    csrfHeaderName: 'x-onlyone-csrf',
    csrfCookieName: 'onlyone_csrf',
  },
  scrypt: {
    cost: 16384,      // N
    blockSize: 8,     // r
    parallelization: 1, // p
    keyLength: 64,
    saltLength: 16,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 300,
  }
};
