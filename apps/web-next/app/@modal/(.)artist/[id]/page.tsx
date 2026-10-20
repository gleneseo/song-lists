import { ArtistDetailsLoader } from "@/components/artists/artist-details-loader";
import { EntityModal } from "@/components/entity-modal";

/**
 * Intercepts a soft navigation to /artist/[id] and shows the artist in a
 * modal over the current page, like the song modal. A hard load renders the
 * full page at app/artist/[id] instead.
 */
export default function ArtistModalPage({ params }: PageProps<"/artist/[id]">) {
  return (
    <EntityModal>
      <ArtistDetailsLoader
        params={params}
        headingLevel="h2"
        whenMissing="message"
      />
    </EntityModal>
  );
}
