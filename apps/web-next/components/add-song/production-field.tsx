"use client";

import { searchProductionOptions } from "@/lib/actions/search-adapters";
import type { ProductionTypeOption } from "@/lib/queries/productions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreatableAutocomplete,
  type CreatableOption,
  type CreatableSelection,
} from "./creatable-autocomplete";

interface ProductionFieldProps {
  productionTypes: ProductionTypeOption[];
  choice: CreatableSelection<CreatableOption> | null;
  onChoiceChange: (choice: CreatableSelection<CreatableOption> | null) => void;
  releaseYear: string;
  onReleaseYearChange: (value: string) => void;
  typeId: number | null;
  onTypeIdChange: (value: number) => void;
}

function ProductionField({
  productionTypes,
  choice,
  onChoiceChange,
  releaseYear,
  onReleaseYearChange,
  typeId,
  onTypeIdChange,
}: ProductionFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      <CreatableAutocomplete
        label="Production"
        placeholder="Search productions…"
        search={searchProductionOptions}
        value={choice}
        onChange={onChoiceChange}
      />
      {choice?.kind === "new" && (
        <div className="flex gap-3 pl-4">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="production-release-year">Release year</Label>
            <Input
              id="production-release-year"
              type="number"
              value={releaseYear}
              onChange={(event) => onReleaseYearChange(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label>Type</Label>
            <Select
              value={typeId ?? undefined}
              onValueChange={(value) => {
                if (value !== null) {
                  onTypeIdChange(value);
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
      )}
    </div>
  );
}

export { ProductionField };
