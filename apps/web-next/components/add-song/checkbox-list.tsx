"use client";

import { cn } from "cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxListOption<Id> {
  id: Id;
  name: string;
}

interface CheckboxListProperties<Id extends string | number> {
  label: string;
  options: CheckboxListOption<Id>[];
  selectedIds: Id[];
  onChange: (ids: Id[]) => void;
  /** `rows` (the default) puts one choice on each row; `tiles` runs them side by side, wrapping onto new rows. */
  layout?: "rows" | "tiles";
  /**
   * Keeps the list no taller than this many rows, scrolling inside a box when
   * there are more, so a long list doesn't push the rest of the form away.
   */
  maxRows?: number;
}

/** A row's height (a line of small text) and the space between rows, in rem. */
const ROW_REM = 1.25;
const GAP_REM = 0.5;
/** The box's padding, top and bottom, in rem, and its borders, in px. */
const BOX_PADDING_REM = 1;
const BOX_BORDER_PX = 2;

/** A checkbox for each choice, in rows or side by side, optionally capped in height with a scroll */
function CheckboxList<Id extends string | number>({
  label,
  options,
  selectedIds,
  onChange,
  layout = "rows",
  maxRows,
}: CheckboxListProperties<Id>) {
  const selected = new Set(selectedIds);

  function toggle(id: Id, checked: boolean) {
    const next = new Set(selected);

    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    onChange(Array.from(next));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div
        role="group"
        aria-label={label}
        className={cn(
          "flex gap-2",
          layout === "tiles" ? "flex-wrap gap-x-4" : "flex-col",
          maxRows !== undefined &&
            "overflow-y-auto rounded-md border border-border p-2",
        )}
        style={
          maxRows === undefined
            ? undefined
            : {
                maxHeight: `calc(${String(maxRows * ROW_REM + (maxRows - 1) * GAP_REM + BOX_PADDING_REM)}rem + ${String(BOX_BORDER_PX)}px)`,
              }
        }
      >
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.has(option.id)}
              onCheckedChange={(checked) => toggle(option.id, checked)}
            />
            {option.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export { CheckboxList };
export type { CheckboxListOption };
