
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 1. Load Env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').reduce((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) acc[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        return acc;
    }, {});
}

const envVars = { ...parseEnv(envPath), ...parseEnv(envLocalPath) };

const PORTS = [5432, 54322, 6543, 54321];
const HOST = '127.0.0.1';

async function connectWithRetry() {
    if (envVars.DATABASE_URL) {
        console.log(`🔌 Trying env.DATABASE_URL...`);
        const client = new Client({ connectionString: envVars.DATABASE_URL });
        try { await client.connect(); return client; } catch (e) { console.log(`Failed env: ${e.message}`); }
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
            // console.log(`❌ Failed port ${port}: ${err.message}`);
        }
    }
    return null;
}

// 2. Query Function
async function checkSchema(client, schemaName) {
    console.log(`\n--- Checking Schema: ${schemaName} ---`);
    try {
        // Count
        const resCount = await client.query(`SELECT count(*) FROM "${schemaName}"."orders"`);
        console.log(`Total Orders: ${resCount.rows[0].count}`);

        if (parseInt(resCount.rows[0].count) > 0) {
            // Check Dates
            const resMin = await client.query(`SELECT min("orderDate") as min_date, max("orderDate") as max_date FROM "${schemaName}"."orders"`);
            console.log(`Date Range: ${resMin.rows[0].min_date} to ${resMin.rows[0].max_date}`);

            // Check Sample
            const resSample = await client.query(`SELECT id, total, "grandTotal" FROM "${schemaName}"."orders" LIMIT 1`);
            console.log('Sample Order:', resSample.rows[0]);
        }
    } catch (e) {
        console.log(`Error querying ${schemaName}: ${e.message}`);
    }
}

async function run() {
    const client = await connectWithRetry();
    if (!client) {
        console.error('❌ Could not connect to database.');
        process.exit(1);
    }

    await checkSchema(client, 'mock_data');
    await checkSchema(client, 'public');

    await client.end();
}

run().catch(e => console.error(e));
