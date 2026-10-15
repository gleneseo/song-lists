import { asc } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { db } from "./client";

interface ListOption {
  id: number;
  name: string;
}

async function getLists(): Promise<ListOption[]> {
  return db.query.lists.findMany({
    columns: { id: true, name: true },
    orderBy: [asc(schema.lists.id)],
  });
}

export { getLists };
export type { ListOption };
