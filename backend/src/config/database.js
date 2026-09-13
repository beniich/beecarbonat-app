const { PrismaClient } = require('@prisma/client');

// Neon serverless PostgreSQL connection string
const neonDbUrl = "postgresql://neondb_owner:npg_2JyR0ipQHrgm@ep-restless-truth-auffv8qt-pooler.c-10.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15";

let dbUrl = process.env.DATABASE_URL;

// Override if it's the placeholder "host:5432"
if (!dbUrl || dbUrl.includes('host:5432')) {
  dbUrl = neonDbUrl;
}

// Clean up problematic parameters if present
if (dbUrl.includes('channel_binding=require')) {
  dbUrl = dbUrl.replace('channel_binding=require&', '').replace('&channel_binding=require', '').replace('channel_binding=require', '');
}
if (!dbUrl.includes('sslmode=require')) {
  const sep = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${sep}sslmode=require`;
}

process.env.DATABASE_URL = dbUrl;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl
    }
  }
});

module.exports = prisma;
