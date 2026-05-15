// packages/server/prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: env("DATABASE_URL"),
  },

  // Optional: Cấu hình migrations
  migrations: {
    path: "prisma/migrations",
  },
});