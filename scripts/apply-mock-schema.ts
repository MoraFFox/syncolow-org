
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fallback to local default if not in env
const PORTS = [5432, 54322, 6543];
const HOST = '127.0.0.1';

// DEBUG: Log Env Keys
console.log('ENV KEYS:', Object.keys(process.env).filter(k => k.includes('DB') || k.includes('SUPABASE') || k.includes('POSTGRES')));

async function connectWithRetry() {
  if (process.env.DATABASE_URL) {
      console.log(`🔌 Trying env.DATABASE_URL...`);
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      try {
        await client.connect();
        console.log(`✅ Connected via DATABASE_URL.`);
        return client;
      } catch (err) {
        console.log(`❌ Failed env.DATABASE_URL: ${(err as any).message}`);
      }
  }

  for (const port of PORTS) {
    const url = `postgresql://postgres:postgres@${HOST}:${port}/postgres`;
    console.log(`🔌 Trying ${url}...`);
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log(`✅ Connected on port ${port}.`);
      return client;
    } catch (err) {
      console.log(`❌ Failed port ${port}: ${(err as any).message}`);
    }
  }
  return null;
}

async function main() {
  const client = await connectWithRetry();
  if (!client) {
      console.error('❌ Could not connect to any port.');
      process.exit(1);
  }

  try {

    const sqlPath = path.resolve(process.cwd(), 'supabase-migrations/create_mock_data_schema.sql');
    if (!fs.existsSync(sqlPath)) {
        throw new Error(`SQL file not found at ${sqlPath}`);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Applying Schema (Run Complete Script)...');
    // We execute the whole script. pg client supports multiple statements?
    // standard client.query might support it if configured, or just simple SQL string.
    // Usually pg runs multi-statement query fine.
    await client.query(sql);
    console.log('✅ Schema Applied Successfully.');
    
    console.log('🔄 Reloading PostgREST Schema Cache...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ Schema Cache Reloaded.');
    
  } catch (err) {
    console.error('❌ Error applying schema:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
