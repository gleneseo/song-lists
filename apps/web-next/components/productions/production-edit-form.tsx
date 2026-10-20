"use client";

import { useState, type SubmitEvent } from "react";
import { updateProduction } from "@/lib/actions/edit-production";
import type { ProductionTypeOption } from "@/lib/queries/productions";
import { isValidReleaseYear } from "@/lib/productions/release-year";
import { ENTITY_HEADING_ID } from "@/components/entity-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** The admin form for a production's own fields: name, release year, and type. */
function ProductionEditForm({
  productionId,
  initial,
  productionTypes,
  onCancel,
  onSaved,
}: {
  productionId: number;
  initial: { name: string; releaseYear: number; typeId: number };
  productionTypes: ProductionTypeOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [releaseYear, setReleaseYear] = useState(String(initial.releaseYear));
  const [typeId, setTypeId] = useState(initial.typeId);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    const year = Number(releaseYear);

    if (!releaseYear.trim() || !isValidReleaseYear(year)) {
      setError("Enter a valid release year.");
      return;
    }

    setSaving(true);

    try {
      const result = await updateProduction({
        productionId,
        name,
        releaseYear: year,
        typeId,
      });

      if (result.status === "updated") {
        onSaved();
        return;
      }

      setError(
        result.status === "duplicate"
          ? `"${result.existingName}" (${result.releaseYear}) already exists.`
          : result.message,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to save the production.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h2
        id={ENTITY_HEADING_ID}
        className="pr-8 text-xl leading-snug font-semibold"
      >
        Edit production
      </h2>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-production-name">Name</Label>
        <Input
          id="edit-production-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="edit-production-year">Release year</Label>
          <Input
            id="edit-production-year"
            type="number"
            value={releaseYear}
            onChange={(event) => setReleaseYear(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label>Type</Label>
          <Select
            value={typeId}
            onValueChange={(value) => {
              if (value !== null) {
                setTypeId(value);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a type">
                {(value: number | null) =>
                  productionTypes.find((type) => type.id === value)?.name ??
                  "Select a type"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {productionTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export { ProductionEditForm };
