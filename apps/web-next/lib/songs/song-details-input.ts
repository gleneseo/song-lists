import { SONG_METADATA_SOURCE } from "@song-lists/db/song-metadata";

/**
 * The album details of a song as an admin has them in the form: all text, as
 * typed. `source` and `sourceTrackId` say which service the details came
 * from, and are `null` once the admin has changed the cover art, which then
 * isn't that service's any longer.
 */
interface SongDetailsInput {
  albumName: string;
  releaseYear: string;
  artworkUrl: string;
  source: string | null;
  sourceTrackId: string | null;
}

/** Details with nothing in them, as the form starts for a song that has none. */
const EMPTY_SONG_DETAILS: SongDetailsInput = {
  albumName: "",
  releaseYear: "",
  artworkUrl: "",
  source: null,
  sourceTrackId: null,
};

/** The details checked and ready to save. */
interface CleanSongDetails {
  albumName: string | null;
  releaseYear: number | null;
  artworkUrl: string | null;
  source:
    (typeof SONG_METADATA_SOURCE)[keyof typeof SONG_METADATA_SOURCE] | null;
  sourceTrackId: string | null;
}

type CleanSongDetailsResult =
  | { status: "ok"; details: CleanSongDetails }
  | { status: "error"; message: string };

const EARLIEST_YEAR = 1800;

/** Collapses runs of spaces and trims, leaving every character (curly quotes included) as typed. */
function tidy(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isWebAddress(text: string): boolean {
  try {
    const { protocol } = new URL(text);

    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Where the app's own cover art is kept: files in `public/album-art`. */
const LOCAL_ARTWORK_PATTERN = /^\/album-art\/[\w.-]+\.(?:jpe?g|png|webp)$/i;

/** Whether cover art is one of the app's own image files rather than a service's. */
function isLocalArtwork(text: string): boolean {
  return LOCAL_ARTWORK_PATTERN.test(text);
}

/** Whether cover art is an address a page can show: a web address or one of the app's own images. */
function isShowableArtwork(text: string): boolean {
  return isWebAddress(text) || isLocalArtwork(text);
}

/**
 * Checks what an admin typed for a song's album details and turns it into
 * what is saved: blanks become nothing, the year a number, the cover art an
 * address that can be shown. At least an album or a year is needed, since
 * details with neither say nothing.
 */
function cleanSongDetails(
  input: SongDetailsInput,
  now: Date = new Date(),
): CleanSongDetailsResult {
  const albumName = tidy(input.albumName);
  const yearText = tidy(input.releaseYear);
  const artworkUrl = tidy(input.artworkUrl);
  const latestYear = now.getFullYear() + 1;
  const year = yearText === "" ? null : Number(yearText);

  if (
    year !== null &&
    (!/^\d{4}$/.test(yearText) || year < EARLIEST_YEAR || year > latestYear)
  ) {
    return {
      status: "error",
      message: `The year must be four digits, from ${String(EARLIEST_YEAR)} to ${String(latestYear)}.`,
    };
  }

  if (artworkUrl !== "" && !isShowableArtwork(artworkUrl)) {
    return {
      status: "error",
      message:
        "The cover art address must be a web address starting with http:// or https://, or a local image such as /album-art/name.jpg.",
    };
  }

  if (albumName === "" && year === null) {
    return {
      status: "error",
      message: "Give the album a name or a year, or leave the details out.",
    };
  }

  const source = Object.values(SONG_METADATA_SOURCE).find(
    (known) => known === input.source,
  );
  const sourceTrackId = tidy(input.sourceTrackId ?? "");

  return {
    status: "ok",
    details: {
      albumName: albumName === "" ? null : albumName,
      releaseYear: year,
      artworkUrl: artworkUrl === "" ? null : artworkUrl,
      source: source ?? null,
      sourceTrackId: source && sourceTrackId !== "" ? sourceTrackId : null,
    },
  };
}

/**
 * The details the form should send with a save, or nothing when there is
 * nothing to change: they are left out when no album or year was given, and
 * when they are just what the song already had.
 */
function detailsToSave(
  current: SongDetailsInput,
  original: SongDetailsInput | null = null,
): SongDetailsInput | undefined {
  if (tidy(current.albumName) === "" && tidy(current.releaseYear) === "") {
    return undefined;
  }

  const unchanged =
    original !== null &&
    current.albumName === original.albumName &&
    current.releaseYear === original.releaseYear &&
    current.artworkUrl === original.artworkUrl;

  return unchanged ? undefined : current;
}

/**
 * Whether two sets of details say the same thing: the same album, year, and
 * cover art, ignoring stray spaces. The service they came from doesn't count.
 */
function sameSongDetails(a: SongDetailsInput, b: SongDetailsInput): boolean {
  return (
    tidy(a.albumName) === tidy(b.albumName) &&
    tidy(a.releaseYear) === tidy(b.releaseYear) &&
    tidy(a.artworkUrl) === tidy(b.artworkUrl)
  );
}

export {
  cleanSongDetails,
  detailsToSave,
  EMPTY_SONG_DETAILS,
  isShowableArtwork,
  sameSongDetails,
};
export type { CleanSongDetails, CleanSongDetailsResult, SongDetailsInput };
