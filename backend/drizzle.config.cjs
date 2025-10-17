require('dotenv').config();

module.exports = {
  schema: './src/schema.ts',
  dialect: "sqlite",
  driver: "d1-http",
  out: './migrations',
  dbCredentials: {
    accountId: process.env.ACCOUNT_ID,
    databaseId: process.env.DATABASE_ID,
    token: process.env.D1_ACCESS_API_TOKEN,
  }
};