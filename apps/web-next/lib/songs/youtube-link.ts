/**
 * A YouTube search for the song, as an address. It isn't a link to one
 * particular video -- finding that takes a quota-limited API -- but it's
 * always current and gets someone to hearing the song in a click.
 */
export function youtubeSearchUrl(title: string, artistName: string): string {
  const query = new URLSearchParams({ search_query: `${artistName} ${title}` });

  return `https://www.youtube.com/results?${query.toString()}`;
}
