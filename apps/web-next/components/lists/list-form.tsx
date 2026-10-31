"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { LIST_EXTRA_COLUMN } from "@song-lists/db/list-extra-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createList, deleteList, updateList } from "@/lib/actions/manage-list";
import { countLabel } from "@/lib/text/count-label";

/** The existing list being edited; leave out to make a new one. */
interface EditableList {
  id: number;
  name: string;
  extraColumns: string[];
  songCount: number;
  /** Whether the list is the Master List, which can't be renamed or deleted. */
  isMaster: boolean;
}

/** The admin form to create a list or to edit (and delete) an existing one. */
function ListForm({ list }: { list?: EditableList }) {
  const router = useRouter();
  const [name, setName] = useState(list?.name ?? "");
  const [showProductions, setShowProductions] = useState(
    list?.extraColumns.includes(LIST_EXTRA_COLUMN.PRODUCTIONS) ?? false,
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    const input = {
      name,
      extraColumns: showProductions ? [LIST_EXTRA_COLUMN.PRODUCTIONS] : [],
    };

    try {
      const result = list
        ? await updateList({ ...input, listId: list.id })
        : await createList(input);

      if (result.status === "saved") {
        router.push("/admin/lists");
        router.refresh();
        return;
      }

      setError(
        result.status === "duplicate"
          ? `There is already a list named ${result.name}.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to save the list.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!list) {
      return;
    }

    setError("");
    setSaving(true);

    try {
      const result = await deleteList(list.id);

      if (result.status === "deleted") {
        router.push("/admin/lists");
        router.refresh();
        return;
      }

      setConfirming(false);
      setError(result.message);
    } catch (caught) {
      setConfirming(false);
      setError(
        caught instanceof Error ? caught.message : "Failed to delete the list.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1 className="text-xl leading-snug font-semibold">
        {list ? "Edit list" : "New list"}
      </h1>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="list-name">Name</Label>
        <Input
          id="list-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={list?.isMaster}
          required
        />
        {list?.isMaster && (
          <p className="text-xs text-muted-foreground">
            The Master List can&rsquo;t be renamed.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="list-show-productions"
          type="checkbox"
          checked={showProductions}
          onChange={(event) => setShowProductions(event.target.checked)}
          className="size-4"
        />
        <Label htmlFor="list-show-productions">Show a Productions column</Label>
      </div>

      {list && !list.isMaster && (
        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Delete list
          </h2>
          <p className="text-sm text-muted-foreground">
            {list.songCount === 0
              ? "This list is empty."
              : `This takes ${countLabel(list.songCount, "song")} off the list. The songs stay in the catalog and on their other lists.`}{" "}
            This can&rsquo;t be undone.
          </p>
          <div className="flex gap-2">
            {confirming ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Confirm delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                >
                  Cancel delete
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirming(true)}
              >
                Delete
              </Button>
            )}
          </div>
        </section>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/lists")}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : list ? "Save changes" : "Create list"}
        </Button>
      </div>
    </form>
  );
}

export { ListForm };
export type { EditableList };
