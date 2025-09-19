import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema.ts',
  dialect: "sqlite",
  driver: "d1-http",
  out: './drizzle',
  dbCredentials: {
    accountId: "",
    databaseId: "",
    token: "",
  }
});