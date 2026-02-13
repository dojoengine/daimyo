import postgres, { Sql } from 'postgres';

let sql: Sql | undefined;

/**
 * Initialize database connection.
 * @param databaseUrl - PostgreSQL connection string (if not provided, uses config)
 */
export async function initializeDatabase(databaseUrl?: string): Promise<void> {
  console.log('Initializing PostgreSQL database connection...');

  if (!databaseUrl) {
    const { config } = await import('../../utils/config.js');
    databaseUrl = config.databaseUrl;
  }

  sql = postgres(databaseUrl);

  // Verify connection
  await sql`SELECT 1`;

  console.log('Database connection established successfully');
}

/**
 * Close database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = undefined;
    console.log('Database connection closed');
  }
}

/**
 * Get SQL instance (for testing and queries).
 */
export function getSql(): Sql {
  if (!sql) {
    throw new Error('Database not initialized. Call initializeDatabase() before queries.');
  }
  return sql;
}

/**
 * Set SQL instance (for testing with PGlite).
 */
export function setSql(newSql: Sql): void {
  sql = newSql;
}
