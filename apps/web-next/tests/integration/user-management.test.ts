import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { openAppDatabase, userId } from "./support/app-database";

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("@/lib/auth/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/auth")>()),
  getSession: async () =>
    session.userId ? { user: { id: session.userId } } : null,
}));

const SEED_PASSWORD = "sample-password";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

describe("an admin managing users, through the real Better Auth and database", () => {
  let pool: Pool;
  let edit: typeof import("@/lib/actions/edit-user");
  let manage: typeof import("@/lib/actions/manage-user");
  let users: typeof import("@/lib/queries/users");
  let auth: (typeof import("@/lib/auth/auth"))["auth"];
  let al: string;
  let cliff: string;
  let judd: string;

  beforeAll(async () => {
    ({ pool } = await openAppDatabase());
    edit = await import("@/lib/actions/edit-user");
    manage = await import("@/lib/actions/manage-user");
    users = await import("@/lib/queries/users");
    ({ auth } = await import("@/lib/auth/auth"));
    al = await userId(pool, "Al");
    cliff = await userId(pool, "Cliff");
    judd = await userId(pool, "Judd");
  });

  afterAll(async () => {
    await pool.end();
  });

  const signIn = (email: string, password: string) =>
    auth.api.signInEmail({ body: { email, password } });

  const row = async (id: string) =>
    (
      await pool.query(
        "select name, first_name, last_name, email, role, bio, deactivated_at, updated_by from song_lists.users where id = $1",
        [id],
      )
    ).rows[0];

  const sessionCount = async (id: string) =>
    Number(
      (
        await pool.query<{ n: string }>(
          "select count(*) n from song_lists.sessions where user_id = $1",
          [id],
        )
      ).rows[0]?.n,
    );

  /** A user with a password, made through Better Auth the way sign-up does. */
  const signUp = async (name: string, email: string, password: string) => {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    return result.user.id;
  };

  describe("editing a user's profile", () => {
    it("should save the changes, tidied up, and record who made them", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Profile",
        "zz.profile@example.com",
        "a long password",
      );

      const result = await edit.updateUser({
        userId: id,
        name: "  Zz   Edited ",
        firstName: " Zed ",
        lastName: "",
        email: "  ZZ.Edited@Example.COM ",
        role: "manager",
        bio: "  Writes songs.  ",
      });

      expect(result).toEqual({ status: "updated" });
      expect(await row(id)).toMatchObject({
        name: "Zz Edited",
        first_name: "Zed",
        last_name: null,
        email: "zz.edited@example.com",
        role: "manager",
        bio: "Writes songs.",
        updated_by: al,
      });
    });

    it("should sign them in by the new email afterwards, and not the old", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Mover",
        "zz.mover.old@example.com",
        "a long password",
      );

      await edit.updateUser({
        userId: id,
        name: "Zz Mover",
        firstName: "",
        lastName: "",
        email: "zz.mover.new@example.com",
        role: "user",
        bio: "",
      });

      expect(
        (await signIn("zz.mover.new@example.com", "a long password")).user.id,
      ).toBe(id);
      await expect(
        signIn("zz.mover.old@example.com", "a long password"),
      ).rejects.toThrow();
    });

    it("should refuse an email another user has, in any case", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Clash",
        "zz.clash@example.com",
        "a long password",
      );

      const result = await edit.updateUser({
        userId: id,
        name: "Zz Clash",
        firstName: "",
        lastName: "",
        email: "AL@SEED.GLENESEO.COM",
        role: "user",
        bio: "",
      });

      expect(result).toEqual({
        status: "duplicate",
        email: "al@seed.gleneseo.com",
      });
      expect((await row(id)).email).toBe("zz.clash@example.com");
    });

    it.each([
      ["a blank name", { name: " " }, "Name is required."],
      [
        "an email that isn't one",
        { email: "nope" },
        "Enter a valid email address.",
      ],
      ["a role that doesn't exist", { role: "root" }, "Choose a valid role."],
    ])("should refuse %s", async (_what, change, message) => {
      session.userId = al;
      const id = await signUp(
        `Zz Invalid ${message.length}`,
        `zz.invalid${message.length}@example.com`,
        "a long password",
      );

      const result = await edit.updateUser({
        userId: id,
        name: "Zz Valid",
        firstName: "",
        lastName: "",
        email: `zz.invalid${message.length}@example.com`,
        role: "user",
        bio: "",
        ...change,
      });

      expect(result).toEqual({ status: "error", message });
      expect((await row(id)).name).not.toBe("Zz Valid");
    });

    it("should not let an admin take their own admin role away", async () => {
      session.userId = al;

      const result = await edit.updateUser({
        userId: al,
        name: "Al",
        firstName: "",
        lastName: "",
        email: "al@seed.gleneseo.com",
        role: "user",
        bio: "",
      });

      expect(result).toEqual({
        status: "error",
        message: "You can't remove your own admin role.",
      });
      expect((await row(al)).role).toBe("admin");
    });

    it("should leave the System user alone", async () => {
      session.userId = al;

      expect(
        await edit.updateUser({
          userId: SYSTEM_USER_ID,
          name: "Hijacked",
          firstName: "",
          lastName: "",
          email: "system@gleneseo.com",
          role: "admin",
          bio: "",
        }),
      ).toEqual({
        status: "error",
        message: "The System user can't be edited.",
      });
    });

    it.each([
      ["a manager", () => cliff],
      ["an ordinary user", () => judd],
      ["someone signed out", () => null],
    ])("should refuse %s", async (_who, who) => {
      session.userId = who();

      expect(
        await edit.updateUser({
          userId: judd,
          name: "Hijacked",
          firstName: "",
          lastName: "",
          email: "judd@seed.gleneseo.com",
          role: "admin",
          bio: "",
        }),
      ).toEqual({ status: "error", message: "Only admins can edit users." });
      expect((await row(judd)).role).toBe("user");
    });

    it("should say so when the user isn't there", async () => {
      session.userId = al;

      expect(
        await edit.updateUser({
          userId: "11111111-1111-4111-8111-111111111111",
          name: "Nobody",
          firstName: "",
          lastName: "",
          email: "nobody@example.com",
          role: "user",
          bio: "",
        }),
      ).toEqual({ status: "error", message: "That user couldn't be found." });
    });
  });

  describe("setting a new password", () => {
    it("should let them sign in with the new password, not the old, and end their sessions", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Reset",
        "zz.reset@example.com",
        "the old password",
      );
      await signIn("zz.reset@example.com", "the old password");
      expect(await sessionCount(id)).toBeGreaterThan(0);

      const result = await manage.resetUserPassword({
        userId: id,
        password: "a brand new password",
      });

      expect(result).toEqual({ status: "done" });
      expect(await sessionCount(id)).toBe(0);
      expect(
        (await signIn("zz.reset@example.com", "a brand new password")).user.id,
      ).toBe(id);
      await expect(
        signIn("zz.reset@example.com", "the old password"),
      ).rejects.toThrow();
    });

    it("should work on a seeded user too", async () => {
      session.userId = al;

      expect(
        await manage.resetUserPassword({
          userId: judd,
          password: "judds new password",
        }),
      ).toEqual({ status: "done" });
      expect(
        (await signIn("judd@seed.gleneseo.com", "judds new password")).user.id,
      ).toBe(judd);
      await expect(
        signIn("judd@seed.gleneseo.com", SEED_PASSWORD),
      ).rejects.toThrow();
    });

    it("should refuse a password that is too short or too long, and keep the old one", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Weak",
        "zz.weak@example.com",
        "the old password",
      );

      expect(
        await manage.resetUserPassword({ userId: id, password: "short" }),
      ).toEqual({
        status: "error",
        message: "Password must be at least 8 characters.",
      });
      expect(
        await manage.resetUserPassword({
          userId: id,
          password: "x".repeat(129),
        }),
      ).toEqual({
        status: "error",
        message: "Password must be at most 128 characters.",
      });
      expect(
        (await signIn("zz.weak@example.com", "the old password")).user.id,
      ).toBe(id);
    });

    it("should say so for a user who doesn't sign in with a password", async () => {
      session.userId = al;
      const { rows } = await pool.query<{ id: string }>(
        "insert into song_lists.users (email, name, created_by, updated_by) values ('zz.nopass@example.com', 'Zz No Password', $1, $1) returning id",
        [al],
      );
      const id = rows[0]?.id as string;

      expect(
        await manage.resetUserPassword({
          userId: id,
          password: "a long password",
        }),
      ).toEqual({
        status: "error",
        message: "That user signs in without a password.",
      });
    });

    it.each([
      [
        "themselves",
        () => al,
        "You can't reset the password of your own account here.",
      ],
      ["the System user", () => al, "The System user can't be managed."],
    ])("should refuse an admin resetting %s", async (who, as, message) => {
      session.userId = as();

      expect(
        await manage.resetUserPassword({
          userId: who === "themselves" ? al : SYSTEM_USER_ID,
          password: "a long password",
        }),
      ).toEqual({ status: "error", message });
    });

    it.each([
      ["a manager", () => cliff],
      ["someone signed out", () => null],
    ])("should refuse %s", async (_who, who) => {
      session.userId = who();

      expect(
        await manage.resetUserPassword({
          userId: judd,
          password: "a long password",
        }),
      ).toEqual({ status: "error", message: "Only admins can manage users." });
    });
  });

  describe("deactivating a user", () => {
    it("should stop them signing in, end their sessions, and let them back in on reactivation", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Leaver",
        "zz.leaver@example.com",
        "a long password",
      );
      await signIn("zz.leaver@example.com", "a long password");
      expect(await sessionCount(id)).toBeGreaterThan(0);

      expect(await manage.setUserActive({ userId: id, active: false })).toEqual(
        {
          status: "done",
        },
      );

      expect((await row(id)).deactivated_at).not.toBeNull();
      expect((await row(id)).updated_by).toBe(al);
      expect(await sessionCount(id)).toBe(0);
      await expect(
        signIn("zz.leaver@example.com", "a long password"),
      ).rejects.toMatchObject({
        body: { message: "This account has been deactivated." },
      });
      expect(await sessionCount(id)).toBe(0);

      expect(await manage.setUserActive({ userId: id, active: true })).toEqual({
        status: "done",
      });
      expect((await row(id)).deactivated_at).toBeNull();
      expect(
        (await signIn("zz.leaver@example.com", "a long password")).user.id,
      ).toBe(id);
    });

    it("should show a deactivated user to the admin's list, marked as such", async () => {
      session.userId = al;
      const id = await signUp(
        "Zz Listed",
        "zz.listed@example.com",
        "a long password",
      );
      await manage.setUserActive({ userId: id, active: false });

      const all = await users.getUsers();
      const listed = all.find((user) => user.id === id);

      expect(listed?.deactivatedAt).toBeInstanceOf(Date);
      expect((await users.getUser(id))?.deactivatedAt).toBeInstanceOf(Date);
      expect(all.map((user) => user.id)).not.toContain(SYSTEM_USER_ID);
      expect(await users.getUser(SYSTEM_USER_ID)).toBeNull();
    });

    it.each([
      ["themselves", () => al, "You can't deactivate your own account here."],
      ["the System user", () => al, "The System user can't be managed."],
    ])("should refuse an admin deactivating %s", async (who, as, message) => {
      session.userId = as();

      expect(
        await manage.setUserActive({
          userId: who === "themselves" ? al : SYSTEM_USER_ID,
          active: false,
        }),
      ).toEqual({ status: "error", message });
      expect((await row(al)).deactivated_at).toBeNull();
    });

    it("should say so when the user isn't there, and refuse a manager", async () => {
      session.userId = al;
      expect(
        await manage.setUserActive({
          userId: "11111111-1111-4111-8111-111111111111",
          active: false,
        }),
      ).toEqual({ status: "error", message: "That user couldn't be found." });

      session.userId = cliff;
      expect(
        await manage.setUserActive({ userId: judd, active: false }),
      ).toEqual({
        status: "error",
        message: "Only admins can manage users.",
      });
    });
  });

  describe("the role lookups other actions rely on", () => {
    it("should know who is an admin, from the database each time", async () => {
      expect(await users.isAdminUser(al)).toBe(true);
      expect(await users.isAdminUser(cliff)).toBe(false);
      expect(await users.getUserAccess(cliff)).toEqual({
        name: "Cliff",
        role: "manager",
      });
      expect(
        await users.getUserAccess("11111111-1111-4111-8111-111111111111"),
      ).toBeNull();
    });

    it("should leave the System user out of the people who can be advocates", async () => {
      const everyone = await users.getAllAdvocateOptions();
      const others = await users.getAdvocateCandidates(al);

      expect(everyone.map((user) => user.id)).not.toContain(SYSTEM_USER_ID);
      expect(others.map((user) => user.id)).not.toContain(SYSTEM_USER_ID);
      expect(others.map((user) => user.id)).not.toContain(al);
      expect(everyone.map((user) => user.id)).toContain(al);
    });
  });
});
