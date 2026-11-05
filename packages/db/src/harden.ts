import { hashPassword } from "@better-auth/utils/password";
import { eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { accounts, sessions, users } from "./schema/song-lists.js";

/** The shortest password suffix `hardenPasswords` accepts */
const MIN_SUFFIX_LENGTH = 7;

/**
 * Replaces the shared seed password on every account that can sign in with
 * the account's username (the part of its email before the `@`) followed by
 * `suffix`, and signs everyone out.
 *
 * The seed migrations give every account the same public password, so this
 * is the step that makes a deployed database safe to expose. The suffix is the
 * secret: usernames are visible in the repository, so it must be long enough
 * that the result can't be guessed from them. Accounts without a credential,
 * such as the System user, are left alone.
 *
 * Idempotent: running it again with the same suffix leaves every account able
 * to sign in with the same password (each run just draws a fresh salt).
 * Returns the emails of the accounts it changed
 */
async function hardenPasswords(
  db: Database,
  suffix: string,
): Promise<string[]> {
  if (suffix.length < MIN_SUFFIX_LENGTH) {
    throw new Error(
      `The password suffix must be at least ${String(MIN_SUFFIX_LENGTH)} characters`,
    );
  }

  const credentials = await db
    .select({ accountId: accounts.id, email: users.email })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(eq(accounts.providerId, "credential"));

  return db.transaction(async (tx) => {
    for (const { accountId, email } of credentials) {
      const username = email.slice(0, email.indexOf("@"));
      const password = await hashPassword(`${username}${suffix}`);

      await tx
        .update(accounts)
        .set({ password })
        .where(eq(accounts.id, accountId));
    }

    await tx.delete(sessions);

    return credentials.map(({ email }) => email);
  });
}

export { hardenPasswords, MIN_SUFFIX_LENGTH };
