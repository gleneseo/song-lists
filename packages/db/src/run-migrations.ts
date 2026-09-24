import { createDb } from "./client.js";
import { loadNearestEnv } from "./load-env.js";
import { runMigrations } from "./migrate.js";

loadNearestEnv(process.cwd());

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

async function main(connectionString: string): Promise<void> {
  const { db, pool } = createDb({ connectionString });

  try {
    await runMigrations(db);
    console.log("Migrations applied.");
  } finally {
    await pool.end();
  }
}

await main(DATABASE_URL);
