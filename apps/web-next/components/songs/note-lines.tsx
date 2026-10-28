import { cn } from "cn";
import { splitLinks } from "@/lib/text/split-links";

// Literal class names, so Tailwind sees them. Each pairs a shade dark enough
// to read on a light page with a lighter one for dark mode. Violet leads and
// red comes last, so a lone note never looks like an error.
const RAINBOW = [
  "text-violet-600 dark:text-violet-400",
  "text-blue-600 dark:text-blue-400",
  "text-cyan-700 dark:text-cyan-400",
  "text-green-700 dark:text-green-400",
  "text-amber-700 dark:text-amber-400",
  "text-orange-600 dark:text-orange-400",
  "text-red-600 dark:text-red-400",
];

/**
 * A song's notes, one per line, each in the next color of the rainbow so they
 * stand apart. A web address in a note is a link.
 */
function NoteLines({
  notes,
  className,
}: {
  notes: string;
  className?: string;
}) {
  const lines = notes.split("\n").filter((line) => line.trim());

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {lines.map((line, index) => (
        <p
          key={index}
          className={cn("wrap-anywhere", RAINBOW[index % RAINBOW.length])}
        >
          {splitLinks(line).map((part, at) =>
            part.kind === "link" ? (
              <a
                key={at}
                href={part.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:no-underline"
              >
                {part.url}
              </a>
            ) : (
              part.text
            ),
          )}
        </p>
      ))}
    </div>
  );
}

export { NoteLines };
