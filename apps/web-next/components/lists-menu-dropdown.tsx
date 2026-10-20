"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The navbar's "Lists" button; hovering it pops out a menu of every list. */
function ListsMenuDropdown({
  lists,
}: {
  lists: { id: number; name: string }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        delay={100}
        closeDelay={150}
        render={<Button variant="ghost" />}
      >
        Lists
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem render={<Link href="/lists" />}>
          All lists
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {lists.map((list) => (
          <DropdownMenuItem
            key={list.id}
            render={<Link href={`/lists/${list.id}`} />}
          >
            {list.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { ListsMenuDropdown };
