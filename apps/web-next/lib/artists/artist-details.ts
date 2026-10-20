interface RelatedArtistSongRow {
  id: number;
  title: string;
  artist: { id: number; name: string };
}

/** The shape the database hands back for one artist and the songs attached to them. */
interface ArtistDetailsRow {
  id: number;
  name: string;
  createdAt: Date;
  songs: {
    id: number;
    title: string;
    coverOf: { original: RelatedArtistSongRow }[];
  }[];
  featuredOnSongs: { song: RelatedArtistSongRow }[];
}

interface ListUsage {
  id: number;
  name: string;
  songCount: number;
}

interface ArtistSong {
  id: number;
  title: string;
  /** The songs this one covers, when it's a cover. */
  covers: { id: number; title: string; artistId: number; artistName: string }[];
}

interface ArtistDetails {
  id: number;
  name: string;
  addedAt: Date;
  songs: ArtistSong[];
  featuredOn: {
    id: number;
    title: string;
    artistId: number;
    artistName: string;
  }[];
  /** The lists this artist's own songs are on, with how many of them each holds. */
  lists: ListUsage[];
}

const byText = (a: string, b: string) => a.localeCompare(b);

/**
 * Shapes an artist's database row for display: their own songs and the songs
 * they're featured on, each alphabetical by title, and the lists their songs
 * appear on in list order.
 */
function toArtistDetails(
  row: ArtistDetailsRow,
  lists: ListUsage[],
): ArtistDetails {
  return {
    id: row.id,
    name: row.name,
    addedAt: row.createdAt,
    songs: row.songs
      .map((song) => ({
        id: song.id,
        title: song.title,
        covers: song.coverOf.map(({ original }) => ({
          id: original.id,
          title: original.title,
          artistId: original.artist.id,
          artistName: original.artist.name,
        })),
      }))
      .toSorted((a, b) => byText(a.title, b.title) || a.id - b.id),
    featuredOn: row.featuredOnSongs
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

export { toArtistDetails };
export type { ArtistDetails, ArtistDetailsRow, ArtistSong, ListUsage };
