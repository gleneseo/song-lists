"use client";

import { artworkUrlAtSize } from "@song-lists/song-metadata/artwork";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { findSongDetails } from "@/lib/actions/find-song-details";
import { metadataCredit } from "@/lib/songs/metadata-credit";
import {
  sameSongDetails,
  type SongDetailsInput,
} from "@/lib/songs/song-details-input";
import { SongArtwork } from "@/components/songs/song-artwork";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PREVIEW_SIZE = 96;

type LookupState =
  | { status: "idle" }
  | { status: "looking" }
  | {
      status: "found";
      unchanged: boolean;
      matched: { title: string; artistName: string };
    }
  | { status: "not_found" }
  | { status: "error"; message: string };

/**
 * An admin's way to fill in a song's album, year, and cover art: a button
 * that looks them up on the music services (which takes a few seconds, so
 * the form says so until the answer is back), and fields to tighten up what
 * it found -- or to fill in by hand -- before the song is saved.
 */
function SongDetailsFields({
  idPrefix,
  title,
  artistName,
  value,
  onChange,
  onBusyChange,
}: {
  idPrefix: string;
  /** The song's title and artist as the form has them now, which is what is looked up. */
  title: string;
  artistName: string;
  value: SongDetailsInput;
  onChange: (details: SongDetailsInput) => void;
  /** Told when a lookup starts and ends, so the form can hold its Save button until the answer is in. */
  onBusyChange: (busy: boolean) => void;
}) {
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const looking = lookup.status === "looking";

  useEffect(() => {
    onBusyChange(looking);
  }, [looking, onBusyChange]);

  const canLookUp = title.trim() !== "" && artistName.trim() !== "";
  const credit = metadataCredit(value.source);
  const showsArtwork = /^https?:\/\//.test(value.artworkUrl);

  async function lookUp() {
    setLookup({ status: "looking" });

    try {
      const result = await findSongDetails({ title, artistName });

      if (!mounted.current) {
        return;
      }

      if (result.status === "found") {
        // Compared with what the form has now, which is what it replaces.
        const unchanged = sameSongDetails(value, result.details);

        onChange(result.details);
        setLookup({ status: "found", unchanged, matched: result.matched });
      } else {
        setLookup(
          result.status === "not_found"
            ? { status: "not_found" }
            : { status: "error", message: result.message },
        );
      }
    } catch {
      if (mounted.current) {
        setLookup({
          status: "error",
          message: "The lookup didn't work. Try again in a moment.",
        });
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => void lookUp()}
          disabled={looking || !canLookUp}
          aria-busy={looking}
        >
          {looking && <Loader2 className="animate-spin" aria-hidden="true" />}
          {looking ? "Looking up…" : "Look up album details"}
        </Button>
        {!canLookUp && (
          <p className="text-xs text-muted-foreground">
            Give the song a title and an artist first.
          </p>
        )}
      </div>

      <div role="status" aria-live="polite" className="text-sm">
        {looking && (
          <p className="text-muted-foreground">
            Looking up album details on iTunes and MusicBrainz. This can take a
            few seconds…
          </p>
        )}
        {lookup.status === "found" && (
          <p className="text-muted-foreground">
            Found &ldquo;{lookup.matched.title}&rdquo; by{" "}
            {lookup.matched.artistName}.{" "}
            {lookup.unchanged ? (
              <span className="font-medium text-green-700 dark:text-green-400">
                It matches the details already here, so there&rsquo;s nothing to
                change.
              </span>
            ) : (
              "Check the details below and correct anything before saving."
            )}
          </p>
        )}
        {lookup.status === "not_found" && (
          <p className="text-muted-foreground">
            Nothing matched. You can fill the details in by hand.
          </p>
        )}
      </div>
      {lookup.status === "error" && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {lookup.message}
        </p>
      )}

      <div className="flex gap-4">
        {showsArtwork && (
          <SongArtwork
            key={value.artworkUrl}
            src={artworkUrlAtSize(value.artworkUrl, PREVIEW_SIZE * 2)}
            alt={
              value.albumName ? `Album art for ${value.albumName}` : "Album art"
            }
            size={PREVIEW_SIZE}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-album`}>Album</Label>
            <Input
              id={`${idPrefix}-album`}
              value={value.albumName}
              onChange={(event) =>
                onChange({ ...value, albumName: event.target.value })
              }
              disabled={looking}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-year`}>Year</Label>
            <Input
              id={`${idPrefix}-year`}
              value={value.releaseYear}
              onChange={(event) =>
                onChange({ ...value, releaseYear: event.target.value })
              }
              inputMode="numeric"
              maxLength={4}
              className="w-24"
              disabled={looking}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${idPrefix}-art`}>Cover art address</Label>
            <Input
              id={`${idPrefix}-art`}
              value={value.artworkUrl}
              onChange={(event) =>
                // Changed by hand, so it is no longer a service's.
                onChange({
                  ...value,
                  artworkUrl: event.target.value,
                  source: null,
                  sourceTrackId: null,
                })
              }
              placeholder="https://…"
              disabled={looking}
            />
          </div>
          {credit && (
            <p className="text-xs text-muted-foreground">
              Album details via {credit}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export { SongDetailsFields };
