"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { InEntityModalContext } from "@/components/entity-modal-context";

/**
 * Shows a song's, artist's, or production's details in a dialog over
 * whatever page the user is on.
 * It's only rendered while its route is active, so closing it (the close
 * button, Escape, or a click outside) just steps the router back to where
 * they came from -- the list keeps its search, sort, and page.
 *
 * Links to other songs, artists, and productions inside it replace the
 * modal's history entry rather than adding one (see `useInEntityModal`), so
 * the history never holds more than one modal and closing always steps back
 * to the page underneath.
 */
function EntityModal({ children }: { children: ReactNode }) {
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
      <DialogContent
        aria-labelledby={ENTITY_HEADING_ID}
        // The large album art has a close button of its own, which puts the
        // song's details back; the dialog's would close the whole dialog.
        className="has-[[data-artwork-viewer]]:[&>button]:hidden"
      >
        <InEntityModalContext value={true}>{children}</InEntityModalContext>
      </DialogContent>
    </Dialog>
  );
}

export { EntityModal };
