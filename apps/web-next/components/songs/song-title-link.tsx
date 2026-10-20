import { DetailsLink } from "@/components/details-link";

/** A song's title as a link to its details. */
function SongTitleLink({ id, title }: { id: number; title: string }) {
  return (
    <DetailsLink href={`/song/${id}`} text={title} className="font-medium" />
  );
}

export { SongTitleLink };
