import { asc, notInArray } from "drizzle-orm";
import { schema, SYSTEM_USER_ID } from "@song-lists/db";
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

export { getAdvocateCandidates };
export type { UserOption };
