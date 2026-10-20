import { SongDetailsLoader } from "@/components/songs/song-details-loader";
import { EntityModal } from "@/components/entity-modal";

/**
 * Intercepts a soft navigation to /song/[id] and shows the song in a modal
 * over the current page. A hard load (refresh, shared link) skips this and
 * renders the full page at app/song/[id] instead.
 *
 * The path is /song/[id], not /songs/[id]: /songs/new is a real page, and an
 * interceptor on /songs/[id] would match it as id "new" and swallow the
 * navigation to it.
 */
export default function EntityModalPage({ params }: PageProps<"/song/[id]">) {
  // No loading state of its own: the layout holds the whole modal back until
  // the song has loaded, so it never opens small and then resizes.
  return (
    <EntityModal>
      <SongDetailsLoader
        params={params}
        headingLevel="h2"
        whenMissing="message"
      />
    </EntityModal>
  );
}
