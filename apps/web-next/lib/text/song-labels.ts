import type { FeaturedArtist, Song } from "@/lib/queries/songs";
import { formatList } from "@/lib/text/format-list";

function featuredArtistsLabel(featuredArtists: FeaturedArtist[]): string {
  return formatList(featuredArtists.map((featured) => featured.artist.name));
}

function coverOfLabel(song: Song): string {
  return song.coverOf
    .map((cover) => {
      const featured = featuredArtistsLabel(cover.original.featuredArtists);
      const featuredSuffix = featured ? ` feat. ${featured}` : "";
      return `"${cover.original.title}" by ${cover.original.artist.name}${featuredSuffix}`;
    })
    .join(", ");
}

export { featuredArtistsLabel, coverOfLabel };
