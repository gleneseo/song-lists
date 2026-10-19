/** 32-bit FNV-1a: a tiny, well-spread hash so neighbouring days pick unrelated songs. */
function hash(text: string): number {
  let value = 0x81_1c_9d_c5;

  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01_00_01_93);
  }

  return value >>> 0;
}

/**
 * Picks which song (by position in a stable ordering) is "the song of the
 * day": the same for everyone on a given UTC day, different from day to
 * day. Returns `null` when there are no songs to pick from.
 */
function songOfTheDayIndex(songCount: number, date: Date): number | null {
  if (songCount < 1) {
    return null;
  }

  return hash(date.toISOString().slice(0, 10)) % songCount;
}

export { songOfTheDayIndex };
