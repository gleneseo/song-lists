"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface CreatableOption {
  id: number;
  label: string;
}

type CreatableSelection<T extends CreatableOption> =
  { kind: "existing"; option: T } | { kind: "new"; name: string };

function selectionLabel<T extends CreatableOption>(
  selection: CreatableSelection<T>,
): string {
  return selection.kind === "existing"
    ? selection.option.label
    : selection.name;
}

interface CreatableAutocompleteProps<T extends CreatableOption> {
  label: string;
  placeholder?: string;
  search: (query: string) => Promise<T[]>;
  value: CreatableSelection<T> | null;
  onChange: (value: CreatableSelection<T> | null) => void;
}

/**
 * A single-select "search as you type" field: existing matches come from
 * `search`, and a "+ Create new …" option appears whenever the typed text
 * doesn't exactly match one of them. Picking that option is itself the
 * user's explicit confirmation to create a new row -- shown back to them as
 * a persistent note under the field.
 */
function CreatableAutocomplete<T extends CreatableOption>({
  label,
  placeholder,
  search,
  value,
  onChange,
}: CreatableAutocompleteProps<T>) {
  const [inputValue, setInputValue] = useState(
    value ? selectionLabel(value) : "",
  );
  const [results, setResults] = useState<T[]>([]);
  const debouncedInput = useDebouncedValue(inputValue);

  // Keeps the displayed text in sync when `value` changes for a reason
  // other than the user picking an item here -- e.g. a parent resetting the
  // whole form after a successful submit. The component instance can
  // outlive that reset (Next.js may reuse it across navigations rather than
  // remounting), so `inputValue`'s own mount-time initializer alone isn't
  // enough to keep this in sync. Adjusting state during render (rather than
  // in an effect) avoids an extra render pass -- see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value ? selectionLabel(value) : "");
  }

  useEffect(() => {
    let cancelled = false;

    search(debouncedInput).then((matches) => {
      if (!cancelled) {
        setResults(matches);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedInput, search]);

  const trimmedInput = debouncedInput.trim();
  const hasExactMatch = results.some(
    (result) => result.label.toLowerCase() === trimmedInput.toLowerCase(),
  );

  const items: CreatableSelection<T>[] = useMemo(() => {
    const existingItems: CreatableSelection<T>[] = results.map((option) => ({
      kind: "existing",
      option,
    }));

    if (trimmedInput && !hasExactMatch) {
      return [...existingItems, { kind: "new", name: trimmedInput }];
    }

    return existingItems;
  }, [results, trimmedInput, hasExactMatch]);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Combobox<CreatableSelection<T>>
        items={items}
        filter={null}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        itemToStringLabel={selectionLabel}
        value={value}
        onValueChange={(next) => {
          onChange(next);
          setInputValue(next ? selectionLabel(next) : "");
        }}
      >
        <ComboboxInput placeholder={placeholder} />
        <ComboboxContent>
          <ComboboxEmpty>Start typing to search</ComboboxEmpty>
          <ComboboxList>
            {items.map((item) => (
              <ComboboxItem
                key={item.kind === "existing" ? item.option.id : "__new__"}
                value={item}
              >
                {item.kind === "existing"
                  ? item.option.label
                  : `+ Create new "${item.name}"`}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {value?.kind === "new" && (
        <p className="text-sm text-muted-foreground">
          A new {label.toLowerCase()} will be created.
        </p>
      )}
    </div>
  );
}

export { CreatableAutocomplete };
export type { CreatableOption, CreatableSelection };
