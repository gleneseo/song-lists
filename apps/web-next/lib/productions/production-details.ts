import type { ListUsage } from "@/lib/artists/artist-details";

/** The shape the database hands back for one production and the songs attached to it. */
interface ProductionDetailsRow {
  id: number;
  name: string;
  releaseYear: number;
  typeId: number;
  createdAt: Date;
  type: { name: string };
  songs: {
    song: { id: number; title: string; artist: { id: number; name: string } };
  }[];
}

interface ProductionDetails {
  id: number;
  name: string;
  releaseYear: number;
  typeId: number;
  typeName: string;
  addedAt: Date;
  songs: {
    id: number;
    title: string;
    artistId: number;
    artistName: string;
  }[];
  /** The lists this production's songs are on, with how many of them each holds. */
  lists: ListUsage[];
}

const byText = (a: string, b: string) => a.localeCompare(b);

/**
 * Shapes a production's database row for display: its songs alphabetical by
 * title (then id, so ties stay put) and the lists they appear on in list order.
 */
function toProductionDetails(
  row: ProductionDetailsRow,
  lists: ListUsage[],
): ProductionDetails {
  return {
    id: row.id,
    name: row.name,
    releaseYear: row.releaseYear,
    typeId: row.typeId,
    typeName: row.type.name,
    addedAt: row.createdAt,
    songs: row.songs
      .map(({ song }) => ({
        id: song.id,
        title: song.title,
        artistId: song.artist.id,
        artistName: song.artist.name,
      }))
      .toSorted((a, b) => byText(a.title, b.title) || a.id - b.id),
    lists: lists.toSorted((a, b) => a.id - b.id),
  };
}

export { toProductionDetails };
export type { ProductionDetails, ProductionDetailsRow };
