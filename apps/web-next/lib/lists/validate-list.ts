import { normalizeText } from "@/lib/text/normalize";
import { parseExtraColumns } from "./extra-columns";
import type { ListExtraColumn } from "@song-lists/db/list-extra-column";

interface ListInput {
  name: string;
  extraColumns: string[];
}

type ListValidation =
  | { ok: true; name: string; extraColumns: ListExtraColumn[] }
  | { ok: false; message: string };

/** Checks and tidies an admin's list, ready to write: a name, and only the optional columns the app knows. */
function validateList(input: ListInput): ListValidation {
  const name = normalizeText(input.name);

  if (!name) {
    return { ok: false, message: "Name is required." };
  }

  return {
    ok: true,
    name,
    extraColumns: parseExtraColumns(input.extraColumns),
  };
}

export { validateList };
export type { ListInput, ListValidation };
