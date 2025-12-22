import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const defaultDatabaseUrl = "file:./dev.db";

function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? defaultDatabaseUrl;
}

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: resolveDatabaseUrl(),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
