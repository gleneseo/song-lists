import { SONG_METADATA_STATUS } from "@song-lists/db";
import { cleanAlbumName } from "./album-name.js";
import { createItunesLookup, ITUNES_MIN_INTERVAL_MS } from "./itunes.js";
import type { WantedSong } from "./match.js";
import {
  createMusicBrainzLookup,
  MUSICBRAINZ_MIN_INTERVAL_MS,
} from "./musicbrainz.js";
import type { SongLookupResult } from "./result.js";

type Matched = Extract<SongLookupResult, { status: "matched" }>;

/** An album's name with edition notes, an "- EP" mark, punctuation, and capitals set aside, to tell whether two services mean the same one. */
function sameAlbumKey(name: string | null): string {
  return cleanAlbumName(name ?? "")
    .replace(/\s-\s*(ep|single)$/i, "")
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]/gu, "");
}

/** Which of two matches describes the song's own record better. */
function better(itunes: Matched, musicbrainz: Matched): Matched {
  if (itunes.isAlbum !== musicbrainz.isAlbum) {
    return itunes.isAlbum ? itunes : musicbrainz;
  }

  if (sameAlbumKey(itunes.albumName) === sameAlbumKey(musicbrainz.albumName)) {
    return itunes;
  }

  // The earlier release is the original; a later one is a reissue or a
  // collection of it.
  return musicbrainz.releaseYear !== null &&
    itunes.releaseYear !== null &&
    musicbrainz.releaseYear < itunes.releaseYear
    ? musicbrainz
    : itunes;
}

/**
 * Settles what iTunes and MusicBrainz each found into one answer.
 *
 * A song on an album of its own beats one on a single or compilation; of two
 * albums, the one that came out first wins; and when they tie, iTunes does,
 * for its art can be asked for at any size. The album's name is saved without
 * its edition ("Insomniac", not "Insomniac (25th Anniversary Deluxe
 * Edition)"), and when both services name the same album, the earlier of
 * their years is kept, since a reissue gets a later date.
 *
 * A service that failed doesn't hold back what the other found; with nothing
 * found, a failure comes back as an error, since the song is worth asking
 * about again.
 */
function combineLookups(
  itunes: SongLookupResult,
  musicbrainz: SongLookupResult,
): SongLookupResult {
  const matches = [itunes, musicbrainz].filter(
    (result): result is Matched =>
      result.status === SONG_METADATA_STATUS.MATCHED,
  );
  const [first, second] = matches;

  if (!first) {
    return (
      [itunes, musicbrainz].find(
        (result) => result.status === SONG_METADATA_STATUS.ERROR,
      ) ?? { status: SONG_METADATA_STATUS.NOT_FOUND }
    );
  }

  const chosen = second ? better(first, second) : first;
  const other = second ? (chosen === first ? second : first) : null;
  const years = [
    chosen.releaseYear,
    other && sameAlbumKey(other.albumName) === sameAlbumKey(chosen.albumName)
      ? other.releaseYear
      : null,
  ].filter((year): year is number => year !== null);

  return {
    ...chosen,
    albumName:
      chosen.albumName === null ? null : cleanAlbumName(chosen.albumName),
    releaseYear: years.length > 0 ? Math.min(...years) : null,
  };
}

/**
 * About the fewest milliseconds a song takes to look up: iTunes takes one
 * request, MusicBrainz up to three (the search, the album's first year, and
 * its cover), and the two are asked at once.
 */
const SONG_LOOKUP_MIN_INTERVAL_MS = Math.max(
  ITUNES_MIN_INTERVAL_MS,
  3 * MUSICBRAINZ_MIN_INTERVAL_MS,
);

interface SongLookupOptions {
  itunes?: (wanted: WantedSong) => Promise<SongLookupResult>;
  musicbrainz?: (wanted: WantedSong) => Promise<SongLookupResult>;
}

/**
 * Looks a song up on iTunes and MusicBrainz together and settles on the
 * best answer between them (see {@link combineLookups}). Each service keeps
 * its own request allowance, so asking both takes no longer than the slower.
 */
function createSongLookup({
  itunes = createItunesLookup(),
  musicbrainz = createMusicBrainzLookup(),
}: SongLookupOptions = {}): (wanted: WantedSong) => Promise<SongLookupResult> {
  return async (wanted) =>
    combineLookups(
      ...(await Promise.all([itunes(wanted), musicbrainz(wanted)])),
    );
}

export { combineLookups, createSongLookup, SONG_LOOKUP_MIN_INTERVAL_MS };
export type { SongLookupOptions };
