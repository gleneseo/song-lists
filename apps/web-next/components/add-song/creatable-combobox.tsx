"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  selectionLabel,
  type CreatableOption,
  type CreatableSelection,
} from "./creatable-autocomplete";

function selectionKey<T extends CreatableOption>(
  selection: CreatableSelection<T>,
): string {
  return selection.kind === "existing"
    ? `existing:${selection.option.id}`
    : `new:${selection.name.toLowerCase()}`;
}

interface CreatableComboboxProps<T extends CreatableOption> {
  label: string;
  placeholder?: string;
  search: (query: string) => Promise<T[]>;
  values: CreatableSelection<T>[];
  onChange: (values: CreatableSelection<T>[]) => void;
}

/**
 * A multi-select "search as you type" field with removable chips, otherwise
 * matching {@link CreatableAutocomplete}'s single-select behavior.
 */
function CreatableCombobox<T extends CreatableOption>({
  label,
  placeholder,
  search,
  values,
  onChange,
}: CreatableComboboxProps<T>) {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const debouncedInput = useDebouncedValue(inputValue);

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

  const selectedKeys = useMemo(
    () => new Set(values.map((value) => selectionKey(value))),
    [values],
  );

  const trimmedInput = debouncedInput.trim();
  const hasExactMatch = results.some(
    (result) => result.label.toLowerCase() === trimmedInput.toLowerCase(),
  );

  const items: CreatableSelection<T>[] = useMemo(() => {
    const existingItems: CreatableSelection<T>[] = results
      .map((option): CreatableSelection<T> => ({ kind: "existing", option }))
      .filter((item) => !selectedKeys.has(selectionKey(item)));

    const newItem: CreatableSelection<T> = { kind: "new", name: trimmedInput };

    if (
      trimmedInput &&
      !hasExactMatch &&
      !selectedKeys.has(selectionKey(newItem))
    ) {
      return [...existingItems, newItem];
    }

    return existingItems;
  }, [results, trimmedInput, hasExactMatch, selectedKeys]);

  const newSelections = values.filter((value) => value.kind === "new");

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Combobox<CreatableSelection<T>, true>
        multiple
        items={items}
        filter={null}
        isItemEqualToValue={(item, value) =>
          selectionKey(item) === selectionKey(value)
        }
        itemToStringLabel={selectionLabel}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        value={values}
        onValueChange={(next) => {
          onChange(next);
          setInputValue("");
        }}
      >
        <ComboboxValue>
          {(selected: CreatableSelection<T>[]) => (
            <ComboboxChips>
              {selected.map((item) => (
                <ComboboxChip key={selectionKey(item)}>
                  {selectionLabel(item)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder} />
            </ComboboxChips>
          )}
        </ComboboxValue>
        <ComboboxContent>
          <ComboboxEmpty>Start typing to search</ComboboxEmpty>
          <ComboboxList>
            {items.map((item) => (
              <ComboboxItem key={selectionKey(item)} value={item}>
                {item.kind === "existing"
                  ? item.option.label
                  : `+ Create new "${item.name}"`}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {newSelections.length > 0 && (
        <p className="text-sm text-muted-foreground">
          New {label.toLowerCase()} will be created:{" "}
          {newSelections
            .map((selection) => `"${selectionLabel(selection)}"`)
            .join(", ")}
        </p>
      )}
    </div>
  );
}

export { CreatableCombobox };
