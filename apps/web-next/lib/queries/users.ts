import { asc, eq, notInArray } from "drizzle-orm";
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

/** Whether this user holds the admin role, read fresh from the database. */
async function isAdminUser(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    columns: { role: true },
    where: eq(schema.users.id, userId),
  });

  return user?.role === USER_ROLE.ADMIN;
}

export { getAdvocateCandidates, getAllAdvocateOptions, isAdminUser };
export type { UserOption };
