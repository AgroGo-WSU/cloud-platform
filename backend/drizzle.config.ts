import { defineConfig } from 'drizzle-kit'

// Environment variables - Drew
const ACCOUNT_ID: string = process.env.account_id!;
const DATABASE_ID: string = process.env.database_id!;
const TOKEN: string = process.env.d1_access_api_token!;

export default defineConfig({
  schema: './src/schema.ts',
  dialect: "sqlite",
  driver: "d1-http",
  out: './drizzle',
  dbCredentials: {
    accountId: ACCOUNT_ID,
    databaseId: DATABASE_ID,
    token: TOKEN,
  }
});