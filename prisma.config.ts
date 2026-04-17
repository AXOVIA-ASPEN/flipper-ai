/**
 * @file prisma.config.ts
 * @author Stephen Boyett
 * @company Axovia AI
 * @date 2026-04-17
 * @version 1.0
 * @brief Prisma 7 runtime/CLI configuration.
 *
 * @description
 * Prisma 7 no longer auto-loads .env or reads `url = env(...)` from the
 * schema's datasource block. Connection configuration lives here and is
 * consumed by all `prisma` CLI commands (migrate, db push, generate) and
 * by the generated client at runtime.
 */

import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
