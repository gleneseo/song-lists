import { createAuth } from "@song-lists/auth";
import { createDb, schema } from "@song-lists/db";
import { hardenPasswords } from "@song-lists/db/harden";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { createIsolatedDatabase } from "./support/isolated-database.js";

const SUFFIX = "-a-long-secret-suffix";
const baseURL = "http://localhost:3000";

describe("hardenPasswords", () => {
  const postgres = inject("postgres");
  let db: ReturnType<typeof createDb>["db"];
  let pool: ReturnType<typeof createDb>["pool"];

  beforeAll(async () => {
    const { connectionUri } = await createIsolatedDatabase(postgres);
    ({ db, pool } = createDb({ connectionString: connectionUri }));
  });

  afterAll(async () => {
    await pool.end();
  });

  it("should reject a suffix that is too short", async () => {
    const actual = hardenPasswords(db, "short");

    await expect(actual).rejects.toThrow(/at least 7 characters/);
  });

  it("should replace the shared seed password with the username and suffix", async () => {
    const auth = createAuth(db, { baseURL });

    const emails = await hardenPasswords(db, SUFFIX);

    const actual = await Promise.all(
      emails.map(async (email) => {
        const result = await auth.api.signInEmail({
          body: { email, password: `${email.split("@")[0] ?? ""}${SUFFIX}` },
        });

        return result.user.email;
      }),
    );

    await expect(
      auth.api.signInEmail({
        body: { email: "ryan@seed.gleneseo.com", password: "sample-password" },
      }),
    ).rejects.toThrow();
    expect(actual.toSorted()).toEqual(emails.toSorted());
    expect(emails).toHaveLength(9);
  });

  it("should leave the system user without a credential", async () => {
    const emails = await hardenPasswords(db, SUFFIX);

    expect(emails).not.toContain("system@gleneseo.com");
  });

  it("should sign everyone out", async () => {
    const auth = createAuth(db, { baseURL });
    await auth.api.signInEmail({
      body: { email: "ryan@seed.gleneseo.com", password: `ryan${SUFFIX}` },
    });

    await hardenPasswords(db, SUFFIX);

    const actual = await db.select().from(schema.sessions);

    expect(actual).toEqual([]);
  });
});
