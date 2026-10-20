import { asc, eq, ne, notInArray } from "drizzle-orm";
import { schema, SYSTEM_USER_ID, USER_ROLE } from "@song-lists/db";
import { db } from "./client";

interface UserOption {
  id: string;
  name: string;
}

/**
 * Lists everyone who could be picked as an additional advocate for a song --
 * every user except the one creating it (who is always an advocate already)
 * and the bootstrap System user.
 */
async function getAdvocateCandidates(
  excludeUserId: string,
): Promise<UserOption[]> {
  return db.query.users.findMany({
    columns: { id: true, name: true },
    where: notInArray(schema.users.id, [excludeUserId, SYSTEM_USER_ID]),
    orderBy: [asc(schema.users.name)],
  });
}

/**
 * Lists everyone who can be an advocate for a song -- every user except the
 * bootstrap System user. Unlike {@link getAdvocateCandidates} this keeps the
 * current user in, for editing a song's full set of advocates.
 */
async function getAllAdvocateOptions(): Promise<UserOption[]> {
  return db.query.users.findMany({
    columns: { id: true, name: true },
    where: notInArray(schema.users.id, [SYSTEM_USER_ID]),
    orderBy: [asc(schema.users.name)],
  });
}

interface UserRecord {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  bio: string | null;
  deactivatedAt: Date | null;
  createdAt: Date;
}

const USER_RECORD_COLUMNS = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  bio: true,
  deactivatedAt: true,
  createdAt: true,
} as const;

/** Every real user (not the bootstrap System user), for the admin users page. */
async function getUsers(): Promise<UserRecord[]> {
  return db.query.users.findMany({
    columns: USER_RECORD_COLUMNS,
    where: ne(schema.users.id, SYSTEM_USER_ID),
    orderBy: [asc(schema.users.name)],
  });
}

/** One user for the admin edit page, or `null` for an unknown or System id. */
async function getUser(userId: string): Promise<UserRecord | null> {
  if (userId === SYSTEM_USER_ID) {
    return null;
  }

  const user = await db.query.users.findFirst({
    columns: USER_RECORD_COLUMNS,
    where: eq(schema.users.id, userId),
  });

  return user ?? null;
}

/** A user's name and role, read fresh from the database, or `null` when they don't exist. */
async function getUserAccess(
  userId: string,
): Promise<{ name: string; role: string } | null> {
  const user = await db.query.users.findFirst({
    columns: { name: true, role: true },
    where: eq(schema.users.id, userId),
  });

  return user ?? null;
}

/** Whether this user holds the admin role, read fresh from the database. */
async function isAdminUser(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    columns: { role: true },
    where: eq(schema.users.id, userId),
  });

  return user?.role === USER_ROLE.ADMIN;
}

export {
  getAdvocateCandidates,
  getAllAdvocateOptions,
  getUser,
  getUserAccess,
  getUsers,
  isAdminUser,
};
export type { UserOption, UserRecord };
