import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./support/app-database";

const session = vi.hoisted(() => ({
  userId: null as string | null,
  sessionId: "",
}));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId
      ? { user: { id: session.userId }, session: { id: session.sessionId } }
      : null,
}));

describe("a person changing their own email and password, through the real Better Auth and database", () => {
  let pool: Pool;
  let account: typeof import("@/lib/actions/change-account");
  let auth: (typeof import("@/lib/auth/auth"))["auth"];

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    account = await import("@/lib/actions/change-account");
    ({ auth } = await import("@/lib/auth/auth"));
  });

  afterAll(async () => {
    await pool.end();
  });

  const signIn = (email: string, password: string) =>
    auth.api.signInEmail({ body: { email, password } });

  /** Someone with a password, made the way sign-up does, who is now acting. */
  async function actingAs(name: string, email: string, password: string) {
    const { user } = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    const { rows } = await pool.query<{ id: string }>(
      "select id from song_lists.sessions where user_id = $1",
      [user.id],
    );
    session.userId = user.id;
    session.sessionId = rows[0]?.id ?? "";

    return user.id;
  }

  const emailOf = async (id: string) =>
    (
      await pool.query<{ email: string }>(
        "select email from song_lists.users where id = $1",
        [id],
      )
    ).rows[0]?.email;

  const sessionIds = async (id: string) =>
    (
      await pool.query<{ id: string }>(
        "select id from song_lists.sessions where user_id = $1",
        [id],
      )
    ).rows.map((row) => row.id);

  describe("changing the email", () => {
    it("should let them sign in with the new address and not the old", async () => {
      const id = await actingAs(
        "Zz Mover",
        "zz.mover@example.com",
        "old-pass-1",
      );

      const result = await account.changeMyEmail({
        newEmail: "  Zz.Moved@Example.com ",
        currentPassword: "old-pass-1",
      });

      expect(result).toEqual({ status: "changed" });
      expect(await emailOf(id)).toBe("zz.moved@example.com");
      await expect(
        signIn("zz.moved@example.com", "old-pass-1"),
      ).resolves.toBeDefined();
      await expect(
        signIn("zz.mover@example.com", "old-pass-1"),
      ).rejects.toThrow();
    });

    it("should refuse the wrong password and change nothing", async () => {
      const id = await actingAs(
        "Zz Wrong",
        "zz.wrong@example.com",
        "old-pass-1",
      );

      const result = await account.changeMyEmail({
        newEmail: "zz.other@example.com",
        currentPassword: "not-the-password",
      });

      expect(result).toEqual({
        status: "error",
        message: "Your current password isn't right.",
      });
      expect(await emailOf(id)).toBe("zz.wrong@example.com");
    });

    it("should refuse an address another account has, whatever its capitals", async () => {
      await actingAs("Zz Holder", "zz.holder@example.com", "old-pass-1");
      const id = await actingAs(
        "Zz Taker",
        "zz.taker@example.com",
        "old-pass-1",
      );

      const result = await account.changeMyEmail({
        newEmail: "ZZ.Holder@example.com",
        currentPassword: "old-pass-1",
      });

      expect(result).toEqual({
        status: "error",
        message: "Another account already uses that email address.",
      });
      expect(await emailOf(id)).toBe("zz.taker@example.com");
    });

    it("should accept their own address again, such as one with changed capitals", async () => {
      const id = await actingAs("Zz Same", "zz.same@example.com", "old-pass-1");

      const result = await account.changeMyEmail({
        newEmail: "ZZ.SAME@example.com",
        currentPassword: "old-pass-1",
      });

      expect(result).toEqual({ status: "changed" });
      expect(await emailOf(id)).toBe("zz.same@example.com");
    });

    it("should refuse something that isn't an email address", async () => {
      await actingAs("Zz Typo", "zz.typo@example.com", "old-pass-1");

      expect(
        await account.changeMyEmail({
          newEmail: "not-an-email",
          currentPassword: "old-pass-1",
        }),
      ).toEqual({ status: "error", message: "Enter a valid email address." });
    });

    it("should record who made the change", async () => {
      const id = await actingAs(
        "Zz Audit",
        "zz.audit@example.com",
        "old-pass-1",
      );

      await account.changeMyEmail({
        newEmail: "zz.audited@example.com",
        currentPassword: "old-pass-1",
      });

      expect(
        (
          await pool.query<{ updated_by: string }>(
            "select updated_by from song_lists.users where id = $1",
            [id],
          )
        ).rows[0]?.updated_by,
      ).toBe(id);
    });
  });

  describe("changing the password", () => {
    it("should let them sign in with the new password and not the old", async () => {
      await actingAs("Zz Pass", "zz.pass@example.com", "old-pass-1");

      const result = await account.changeMyPassword({
        currentPassword: "old-pass-1",
        newPassword: "new-pass-2",
      });

      expect(result).toEqual({ status: "changed" });
      await expect(
        signIn("zz.pass@example.com", "new-pass-2"),
      ).resolves.toBeDefined();
      await expect(
        signIn("zz.pass@example.com", "old-pass-1"),
      ).rejects.toThrow();
    });

    it("should end their other sessions but keep the one in use", async () => {
      const id = await actingAs(
        "Zz Devices",
        "zz.devices@example.com",
        "old-pass-1",
      );
      const inUse = session.sessionId;
      await signIn("zz.devices@example.com", "old-pass-1");
      await signIn("zz.devices@example.com", "old-pass-1");
      expect(await sessionIds(id)).toHaveLength(3);

      await account.changeMyPassword({
        currentPassword: "old-pass-1",
        newPassword: "new-pass-2",
      });

      expect(await sessionIds(id)).toEqual([inUse]);
    });

    it("should refuse the wrong current password and change nothing", async () => {
      await actingAs("Zz Guess", "zz.guess@example.com", "old-pass-1");

      expect(
        await account.changeMyPassword({
          currentPassword: "not-the-password",
          newPassword: "new-pass-2",
        }),
      ).toEqual({
        status: "error",
        message: "Your current password isn't right.",
      });
      await expect(
        signIn("zz.guess@example.com", "old-pass-1"),
      ).resolves.toBeDefined();
    });

    it("should refuse a new password that is too short, or the same as the old", async () => {
      await actingAs("Zz Rules", "zz.rules@example.com", "old-pass-1");

      expect(
        await account.changeMyPassword({
          currentPassword: "old-pass-1",
          newPassword: "short",
        }),
      ).toEqual({
        status: "error",
        message: "Password must be at least 8 characters.",
      });
      expect(
        await account.changeMyPassword({
          currentPassword: "old-pass-1",
          newPassword: "old-pass-1",
        }),
      ).toEqual({
        status: "error",
        message: "Choose a password different from your current one.",
      });
    });
  });

  describe("guessing the current password", () => {
    const wrong = { currentPassword: "not-the-password" };

    it("should stop further tries after five wrong ones, even with the right password, for either change", async () => {
      await actingAs("Zz Guesser", "zz.guesser@example.com", "old-pass-1");

      for (let guess = 0; guess < 5; guess++) {
        expect(
          await account.changeMyEmail({
            ...wrong,
            newEmail: "zz.guessed@example.com",
          }),
        ).toEqual({
          status: "error",
          message: "Your current password isn't right.",
        });
      }

      const blocked = {
        status: "error",
        message: expect.stringMatching(
          /^Too many wrong passwords\. Try again in \d+ minutes?\.$/,
        ),
      };
      expect(
        await account.changeMyEmail({
          newEmail: "zz.guessed@example.com",
          currentPassword: "old-pass-1",
        }),
      ).toEqual(blocked);
      expect(
        await account.changeMyPassword({
          currentPassword: "old-pass-1",
          newPassword: "new-pass-2",
        }),
      ).toEqual(blocked);
    });

    it("should let them try again once the wait is over", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });

      try {
        await actingAs("Zz Patient", "zz.patient@example.com", "old-pass-1");

        for (let guess = 0; guess < 5; guess++) {
          await account.changeMyPassword({
            ...wrong,
            newPassword: "new-pass-2",
          });
        }
        vi.setSystemTime(Date.now() + 16 * 60 * 1000);

        expect(
          await account.changeMyPassword({
            currentPassword: "old-pass-1",
            newPassword: "new-pass-2",
          }),
        ).toEqual({ status: "changed" });
      } finally {
        vi.useRealTimers();
      }
    });

    it("should forget the wrong guesses once the right password is given, so four more are allowed", async () => {
      await actingAs("Zz Forgiven", "zz.forgiven@example.com", "old-pass-1");

      for (let round = 0; round < 3; round++) {
        for (let guess = 0; guess < 4; guess++) {
          await account.changeMyEmail({
            ...wrong,
            newEmail: "zz.forgiven2@example.com",
          });
        }
        expect(
          await account.changeMyEmail({
            newEmail: `zz.forgiven${String(round)}@example.com`,
            currentPassword: "old-pass-1",
          }),
        ).toEqual({ status: "changed" });
      }
    });

    it("should not count anyone else's wrong guesses against them", async () => {
      await actingAs("Zz Target", "zz.target@example.com", "old-pass-1");
      for (let guess = 0; guess < 5; guess++) {
        await account.changeMyEmail({
          ...wrong,
          newEmail: "zz.target2@example.com",
        });
      }

      await actingAs("Zz Bystander", "zz.bystander@example.com", "old-pass-1");

      expect(
        await account.changeMyEmail({
          newEmail: "zz.bystander2@example.com",
          currentPassword: "old-pass-1",
        }),
      ).toEqual({ status: "changed" });
    });
  });

  describe("without a sign-in, or without a password to check", () => {
    it("should refuse both changes when signed out", async () => {
      session.userId = null;

      expect(
        await account.changeMyEmail({
          newEmail: "zz.nobody@example.com",
          currentPassword: "x",
        }),
      ).toEqual({
        status: "error",
        message: "Sign in to change your account.",
      });
      expect(
        await account.changeMyPassword({
          currentPassword: "x",
          newPassword: "new-pass-2",
        }),
      ).toEqual({
        status: "error",
        message: "Sign in to change your account.",
      });
    });

    it("should refuse someone who has no password at all", async () => {
      const { rows } = await pool.query<{ id: string }>(
        "insert into song_lists.users (name, email, created_by, updated_by) values ('Zz Passwordless', 'zz.passwordless@example.com', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000') returning id",
      );
      session.userId = rows[0]?.id ?? null;
      session.sessionId = "";

      expect(
        await account.changeMyPassword({
          currentPassword: "anything",
          newPassword: "new-pass-2",
        }),
      ).toEqual({
        status: "error",
        message: "Your current password isn't right.",
      });
    });
  });
});
