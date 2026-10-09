import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Client } from 'pg';

// Runs migrations/*.sql in order, each one once.
export async function migrate(databaseUrl: string, dir = join(__dirname, '../../migrations')) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const done = new Set(
      (await client.query(`SELECT name FROM schema_migrations`)).rows.map((r) => r.name),
    );
    for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      await client.query('BEGIN');
      await client.query(await readFile(join(dir, file), 'utf8'));
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [file]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  migrate(url).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
