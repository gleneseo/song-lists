import { asc, ne } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { db } from "./client";

interface UserOption {
  id: string;
  name: string;
}

/**
 * Lists everyone who could be picked as an additional advocate for a song --
 * every user except the one creating it, who is always an advocate already.
 */
async function getAdvocateCandidates(
  excludeUserId: string,
): Promise<UserOption[]> {
  return db.query.users.findMany({
    columns: { id: true, name: true },
    where: ne(schema.users.id, excludeUserId),
    orderBy: [asc(schema.users.name)],
  });
}

export { getAdvocateCandidates };
export type { UserOption };
