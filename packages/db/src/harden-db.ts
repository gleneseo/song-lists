import { createDb } from "./client.js";
import { hardenPasswords } from "./harden.js";
import { isLocalDatabase } from "./local-database.js";
import { loadNearestEnv } from "./load-env.js";

loadNearestEnv(process.cwd());

const { DATABASE_URL, HARDEN_PASSWORD_SUFFIX } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

if (!HARDEN_PASSWORD_SUFFIX) {
  throw new Error("HARDEN_PASSWORD_SUFFIX environment variable is required");
}

if (isLocalDatabase(DATABASE_URL)) {
  throw new Error(
    "Refusing to harden a database on localhost. db:harden is for a deployed database; local development keeps the shared seed password.",
  );
}

/**
 * Gives every seeded account a password of its own: the username followed by
 * the secret `HARDEN_PASSWORD_SUFFIX`. Run it against a deployed database after
 * each migrate or reset, since both put the public seed password back
 */
async function main(connectionString: string, suffix: string): Promise<void> {
  const { db, pool } = createDb({ connectionString });

  try {
    console.log(`Hardening ${new URL(connectionString).hostname}`);
    const emails = await hardenPasswords(db, suffix);
    console.log(`Passwords replaced for ${String(emails.length)} accounts.`);
  } finally {
    await pool.end();
  }
}

await main(DATABASE_URL, HARDEN_PASSWORD_SUFFIX);
