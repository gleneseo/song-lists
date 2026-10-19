import Link from "next/link";

/** A small link chip naming a list, pointing at that list's page. */
function ListPill({ id, name }: { id: number; name: string }) {
  return (
    <Link
      href={`/lists/${id}`}
      className="rounded-full bg-muted px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {name}
    </Link>
  );
}

export { ListPill };
