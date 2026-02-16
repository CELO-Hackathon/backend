import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    MONGODB_URI: z.string(),

    CELO_RPC_URL: z.string().url(),
    CELO_CHAIN_ID: z.string(),
    AGENT_PRIVATE_KEY: z.string().startsWith('0x'),
    PLATFORM_AGENT_ID: z.string(),

    VAULT_ADDRESS: z.string().startsWith('0x'),
    CUSD_ADDRESS: z.string().startsWith('0x'),
    IDENTITY_REGISTRY: z.string().startsWith('0x'),
    REPUTATION_REGISTRY: z.string().startsWith('0x'),

    GEMINI_API_KEY: z.string(),


    CORS_ORIGIN: z.string().default('http://localhost:3001'),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('7d'),
    AUTH_MESSAGE_TEMPLATE: z.string().optional(),

    RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error(' Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
}

// export const env = parsed.data;
export const env = {
  ...parsed.data,
  JWT_EXPIRES_IN: parsed.data.JWT_EXPIRES_IN as string,
};