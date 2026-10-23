import { SONG_METADATA_SOURCE, SONG_METADATA_STATUS } from "@song-lists/db";
import { cleanAlbumName, tidyAlbumName } from "./album-name.js";
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

/**
 * An album's key without a qualifier at the end of its name: a number, as a
 * band numbers its albums of the same name ("The Bronx (III)"), or a note in
 * parentheses ("Weezer (Green Album)").
 */
function unqualifiedAlbumKey(name: string | null): string {
  return sameAlbumKey(
    (name ?? "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .replace(/\s+(?:[ivxlc]+|\d+)\s*$/i, ""),
  );
}

/** Whether an album is named for the song, as a single is. */
function isNamedFor(wanted: WantedSong | undefined, albumName: string | null) {
  return (
    wanted !== undefined &&
    albumName !== null &&
    sameAlbumKey(albumName) === sameAlbumKey(wanted.title)
  );
}

/** Which of two matches describes the song's own record better. */
function better(
  itunes: Matched,
  musicbrainz: Matched,
  wanted?: WantedSong,
): Matched {
  if (itunes.isAlbum !== musicbrainz.isAlbum) {
    return itunes.isAlbum ? itunes : musicbrainz;
  }

  if (sameAlbumKey(itunes.albumName) === sameAlbumKey(musicbrainz.albumName)) {
    return itunes;
  }

  // Of one year, an album with a number or a note on its name ("The Bronx
  // (III)", "Weezer (Green Album)") is the same as the plain name, and
  // whichever service says which of a band's albums of that name it is has
  // the better name.
  if (
    itunes.releaseYear === musicbrainz.releaseYear &&
    unqualifiedAlbumKey(itunes.albumName) ===
      unqualifiedAlbumKey(musicbrainz.albumName)
  ) {
    return sameAlbumKey(musicbrainz.albumName) !==
      unqualifiedAlbumKey(musicbrainz.albumName) &&
      sameAlbumKey(itunes.albumName) === unqualifiedAlbumKey(itunes.albumName)
      ? musicbrainz
      : itunes;
  }

  // The earlier release is the original; a later one is a reissue or a
  // collection of it. Of two albums of the same year MusicBrainz is believed,
  // since it knows a compilation by its type and iTunes only by its name --
  // unless its album is named for the song, which is more likely a single.
  if (itunes.releaseYear === null) {
    // An album that comes with no year is no better than one that does.
    return musicbrainz.releaseYear === null ? itunes : musicbrainz;
  }

  return musicbrainz.releaseYear !== null &&
    (musicbrainz.releaseYear < itunes.releaseYear ||
      (musicbrainz.releaseYear === itunes.releaseYear &&
        musicbrainz.isAlbum &&
        !isNamedFor(wanted, musicbrainz.albumName)))
    ? musicbrainz
    : itunes;
}

/**
 * Settles what iTunes and MusicBrainz each found into one answer.
 *
 * A song on an album of its own beats one on a single or compilation; of two
 * albums, the one that came out first wins; and when they tie, MusicBrainz
 * does, for it knows a compilation by its type, not just its name. When both
 * name the same album, iTunes is kept, for its art can be asked for at any
 * size. The album's name is saved without
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
  wanted?: WantedSong,
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

  const chosen = second ? better(first, second, wanted) : first;
  const other = second ? (chosen === first ? second : first) : null;
  const sameAlbum =
    other !== null &&
    sameAlbumKey(other.albumName) === sameAlbumKey(chosen.albumName)
      ? other
      : null;
  // When both name the same album, MusicBrainz's year is the album's own first
  // release; iTunes dates a track by when it first came out, which can be a
  // single's year ahead of the album's. Without it, the earlier of the two.
  const albumYear = [chosen, sameAlbum].find(
    (match) =>
      match?.source === SONG_METADATA_SOURCE.MUSICBRAINZ &&
      match.isAlbum &&
      match.releaseYear !== null,
  )?.releaseYear;
  const years = [chosen.releaseYear, sameAlbum?.releaseYear ?? null].filter(
    (year): year is number => year !== null,
  );

  return {
    ...chosen,
    albumName:
      chosen.albumName === null ? null : tidyAlbumName(chosen.albumName),
    releaseYear: albumYear ?? (years.length > 0 ? Math.min(...years) : null),
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
      wanted,
    );
}

export { combineLookups, createSongLookup, SONG_LOOKUP_MIN_INTERVAL_MS };
export type { SongLookupOptions };
