"use client";

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
}

/** A plain checkbox-per-row list */
function CheckboxList<Id extends string | number>({
  label,
  options,
  selectedIds,
  onChange,
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
      <div className="flex flex-col gap-2">
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
