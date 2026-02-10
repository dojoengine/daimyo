/**
 * Standalone API server for local development.
 * Runs Express without the Discord bot.
 */
import { config } from 'dotenv';
import postgres from 'postgres';
import { startApiServer } from './api/index.js';
import { setSql } from './services/database.js';

// Load environment variables
config();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Initialize database connection
  console.log('Connecting to database...');
  const sql = postgres(databaseUrl);

  // Verify connection
  await sql`SELECT 1`;
  console.log('Database connected');

  // Set the SQL instance for the database module
  setSql(sql);

  // Start API server
  startApiServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await sql.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await sql.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
