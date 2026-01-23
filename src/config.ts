import dotenv from 'dotenv';
import path from 'path';

// Load env vars from project root `.env` (if present)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
}

function getEnv(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === '' ? fallback : v;
}

export type AppConfig = {
  env: string;
  port: number;
  admin: {
    username: string;
    password: string;
  };
  session: {
    secret: string;
  };
  upload: {
    dest: string;
    maxSize: number;
  };
  shopify: {
    storeDomain: string;
    accessToken: string;
    apiVersion: string;
  };
  s3: {
    enabled: boolean;
    region: string;
    bucket: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    folderPrefix?: string;
    publicAccess: boolean;
    publicUrl?: string;
  };
};

const env = getEnv('NODE_ENV', 'development');

export const config: AppConfig = {
  env,
  port: toInt(process.env.PORT, 3000),
  admin: {
    username: getEnv('ADMIN_USERNAME', 'admin'),
    password: getEnv('ADMIN_PASSWORD', 'admin123'),
  },
  session: {
    secret: getEnv('SESSION_SECRET', 'dev-session-secret-change-me'),
  },
  upload: {
    // Keep it absolute so `fs.existsSync` works reliably no matter where process is started.
    dest: path.resolve(process.cwd(), getEnv('UPLOAD_DEST', './public/uploads')),
    maxSize: toInt(process.env.UPLOAD_MAX_SIZE, 5 * 1024 * 1024), // 5MB
  },
  shopify: {
    // Use a safe placeholder so the server can boot even before Shopify is configured.
    storeDomain: getEnv('SHOPIFY_STORE_DOMAIN', 'example.myshopify.com'),
    accessToken: getEnv('SHOPIFY_ADMIN_API_ACCESS_TOKEN', 'YOUR_SHOPIFY_ADMIN_API_ACCESS_TOKEN'),
    apiVersion: getEnv('SHOPIFY_API_VERSION', '2024-01'),
  },
  s3: {
    enabled: toBool(process.env.S3_ENABLED, false),
    // Even if S3 is disabled, some modules instantiate S3Client at import-time,
    // so we provide a valid default region to avoid crashing on boot.
    region: getEnv('S3_REGION', 'us-east-1'),
    bucket: getEnv('S3_BUCKET', 'dummy-bucket'),
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    folderPrefix: process.env.S3_FOLDER_PREFIX,
    publicAccess: toBool(process.env.S3_PUBLIC_ACCESS, false),
    publicUrl: process.env.S3_PUBLIC_URL,
  },
};

// Helpful runtime hints (do not block boot)
if (env !== 'production') {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET');
  if (!process.env.SHOPIFY_STORE_DOMAIN) missing.push('SHOPIFY_STORE_DOMAIN');
  if (!process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN) missing.push('SHOPIFY_ADMIN_API_ACCESS_TOKEN');
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Missing env vars (${missing.join(', ')}). Using development defaults/placeholders.`);
  }
}

