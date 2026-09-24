import { asc } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { db } from "./db";

interface Song {
  id: number;
  title: string;
  artist: { name: string };
}

async function getSongs(): Promise<Song[]> {
  return db.query.songs.findMany({
    columns: { id: true, title: true },
    with: { artist: { columns: { name: true } } },
    orderBy: [asc(schema.songs.title)],
  });
}

export { getSongs };
export type { Song };
