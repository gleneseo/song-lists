import { SONG_METADATA_STATUS } from "@song-lists/db";
import { byText } from "@/lib/text/sort-key";

interface NamedArtist {
  id: number;
  name: string;
}

interface RelatedSongRow {
  id: number;
  title: string;
  artist: NamedArtist;
}

/** The shape the database hands back for one song and everything attached to it. */
interface SongDetailsRow {
  id: number;
  title: string;
  bio: string | null;
  createdAt: Date;
  artist: NamedArtist;
  featuredArtists: { artist: NamedArtist }[];
  notes: {
    id: number;
    body: string;
    createdAt: Date;
    creator: { name: string };
  }[];
  coverOf: { original: RelatedSongRow }[];
  coveredBy: { song: RelatedSongRow }[];
  productions: {
    production: {
      id: number;
      name: string;
      releaseYear: number;
      type: { name: string };
    };
  }[];
  advocates: { createdAt: Date; advocate: { name: string } }[];
  lists: {
    createdAt: Date;
    list: { id: number; name: string };
    creator: { name: string };
  }[];
  /** What the automatic lookup found, or `null` if it hasn't run for this song. */
  metadata: {
    status: string;
    source: string | null;
    artworkUrl: string | null;
    albumName: string | null;
    releaseYear: number | null;
  } | null;
}

/** What an outside music service shows for a song that it matched. */
interface SongMetadataDetails {
  /** Who answered: one of `SONG_METADATA_SOURCE`. */
  source: string | null;
  artworkUrl: string | null;
  albumName: string | null;
  releaseYear: number | null;
}

interface RelatedSong {
  id: number;
  title: string;
  artistId: number;
  artistName: string;
}

/** One note on a song, with who wrote it and when. */
interface SongNote {
  id: number;
  body: string;
  author: string;
  writtenAt: Date;
}

interface SongDetails {
  id: number;
  title: string;
  /** An actual bio for the song, if someone wrote one; not its notes. */
  bio: string | null;
  /** The song's notes, oldest first. */
  notes: SongNote[];
  addedAt: Date;
  artistId: number;
  artistName: string;
  featuredArtists: { id: number; name: string }[];
  /** The songs this one covers -- usually one, occasionally a medley's several. */
  covers: RelatedSong[];
  /** Other recordings of this song, grouped by artist. */
  coveredBy: RelatedSong[];
  productions: {
    id: number;
    name: string;
    releaseYear: number;
    typeName: string;
  }[];
  advocates: { name: string; since: Date }[];
  lists: { id: number; name: string; addedBy: string; addedAt: Date }[];
  /** `null` unless the song was looked up and a match was found. */
  metadata: SongMetadataDetails | null;
}

function toRelatedSong({ id, title, artist }: RelatedSongRow): RelatedSong {
  return { id, title, artistId: artist.id, artistName: artist.name };
}

/**
 * Shapes a song's database row for display, flattening the nesting and
 * putting every group in a predictable order: other recordings by artist,
 * productions by release year, advocates by when they joined, and lists in
 * the order they were created.
 */
function toSongDetails(row: SongDetailsRow): SongDetails {
  return {
    id: row.id,
    title: row.title,
    bio: row.bio,
    addedAt: row.createdAt,
    artistId: row.artist.id,
    artistName: row.artist.name,
    notes: row.notes
      .map(({ id, body, createdAt, creator }) => ({
        id,
        body,
        author: creator.name,
        writtenAt: createdAt,
      }))
      .toSorted((a, b) => a.id - b.id),
    featuredArtists: row.featuredArtists.map(({ artist }) => ({
      id: artist.id,
      name: artist.name,
    })),
    covers: row.coverOf.map(({ original }) => toRelatedSong(original)),
    coveredBy: row.coveredBy
      .map(({ song }) => toRelatedSong(song))
      .toSorted(
        (a, b) =>
          byText(a.artistName, b.artistName) || byText(a.title, b.title),
      ),
    productions: row.productions
      .map(({ production }) => ({
        id: production.id,
        name: production.name,
        releaseYear: production.releaseYear,
        typeName: production.type.name,
      }))
      .toSorted(
        (a, b) => a.releaseYear - b.releaseYear || byText(a.name, b.name),
      ),
    advocates: row.advocates
      .map(({ createdAt, advocate }) => ({
        name: advocate.name,
        since: createdAt,
      }))
      .toSorted(
        (a, b) =>
          a.since.getTime() - b.since.getTime() || byText(a.name, b.name),
      ),
    lists: row.lists
      .map(({ createdAt, list, creator }) => ({
        id: list.id,
        name: list.name,
        addedBy: creator.name,
        addedAt: createdAt,
      }))
      .toSorted((a, b) => a.id - b.id),
    metadata:
      row.metadata?.status === SONG_METADATA_STATUS.MATCHED
        ? {
            source: row.metadata.source,
            artworkUrl: row.metadata.artworkUrl,
            albumName: row.metadata.albumName,
            releaseYear: row.metadata.releaseYear,
          }
        : null,
  };
}

export { toSongDetails };
export type {
  RelatedSong,
  SongDetails,
  SongDetailsRow,
  SongMetadataDetails,
  SongNote,
};
