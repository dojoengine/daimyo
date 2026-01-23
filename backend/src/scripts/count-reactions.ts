import { config as dotenvConfig } from 'dotenv';
import postgres from 'postgres';

dotenvConfig();

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);

  try {
    const results = await sql<
      { total: string; fromkohai: string; fromsenpai: string; fromsensei: string }[]
    >`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN reactor_role_at_time = 'Kohai' THEN 1 ELSE 0 END) as fromKohai,
        SUM(CASE WHEN reactor_role_at_time = 'Senpai' THEN 1 ELSE 0 END) as fromSenpai,
        SUM(CASE WHEN reactor_role_at_time = 'Sensei' THEN 1 ELSE 0 END) as fromSensei
      FROM reactions
    `;

    const row = results[0];
    const total = parseInt(row?.total || '0', 10);
    const fromKohai = parseInt(row?.fromkohai || '0', 10);
    const fromSenpai = parseInt(row?.fromsenpai || '0', 10);
    const fromSensei = parseInt(row?.fromsensei || '0', 10);

    console.log('\nDojo Reaction Counts');
    console.log('====================');
    console.log(`Total:       ${total}`);
    console.log(`From Kohai:  ${fromKohai}`);
    console.log(`From Senpai: ${fromSenpai}`);
    console.log(`From Sensei: ${fromSensei}`);
    console.log();
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
