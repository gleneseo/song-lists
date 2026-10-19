"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SONG_HEADING_ID } from "@/components/songs/song-details-view";

/**
 * Shows a song's details in a dialog over whatever page the user is on.
 * It's only rendered while its route is active, so closing it (the close
 * button, Escape, or a click outside) just steps the router back to where
 * they came from -- the list keeps its search, sort, and page.
 */
function SongModal({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent aria-labelledby={SONG_HEADING_ID}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export { SongModal };
