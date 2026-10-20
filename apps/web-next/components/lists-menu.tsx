import { getLists } from "@/lib/queries/lists";
import { ListsMenuDropdown } from "./lists-menu-dropdown";

/** Loads every list for the navbar's "Lists" hover menu. */
async function ListsMenu() {
  const lists = await getLists();

  return <ListsMenuDropdown lists={lists} />;
}

export { ListsMenu };
