import { TriangleAlert } from "lucide-react";
import { EntityAnchor } from "@/components/entity-anchor";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ExistingSongMatch } from "@/lib/queries/songs";

/**
 * Warns that the song being typed in looks a lot like one we already have,
 * and gives the way out: look at the existing song (in the details modal over
 * the form, so the form is kept), or give up on adding it. Carrying on is
 * just pressing "Add song", since a near match can be a different song.
 */
function SimilarSongNotice({
  match,
  onCancel,
  disabled,
}: {
  match: ExistingSongMatch;
  onCancel: () => void;
  disabled: boolean;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border-2 border-amber-500/60 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
        />
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold text-amber-900 dark:text-amber-300">
            This song may already be here
          </h3>
          <p>
            We already have &ldquo;{match.title}&rdquo; by {match.artistName}.
            If that&rsquo;s the song you mean, there&rsquo;s no need to add it
            again. If this is a different song, go ahead and add it.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <EntityAnchor
          href={`/song/${String(match.id)}`}
          className={buttonVariants({ variant: "outline" })}
        >
          View &ldquo;{match.title}&rdquo;
        </EntityAnchor>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={disabled}
        >
          It&rsquo;s already there &mdash; cancel
        </Button>
      </div>
    </div>
  );
}

export { SimilarSongNotice };
