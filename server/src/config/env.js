import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

export default {
  databaseUrl: process.env.DATABASE_URL,
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTtl: process.env.JWT_ACCESS_TTL || '15m',
  refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 7),
  cookieSecure: process.env.NODE_ENV === 'production',
};