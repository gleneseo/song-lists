import { cn } from "cn";

/**
 * Text capped at one or two lines, ending in an ellipsis when it runs over.
 * `wrap-anywhere` lets a long unbroken string (a title with no spaces) break
 * at any character, so it can't force its column wider and push the rest of
 * a row off screen. The full text stays in the DOM for screen readers and
 * shows as a tooltip on hover.
 */
function ClampedText({
  text,
  lines = 2,
  className,
}: {
  text: string;
  lines?: 1 | 2;
  className?: string;
}) {
  return (
    <p
      title={text}
      className={cn(
        lines === 1 ? "line-clamp-1" : "line-clamp-2",
        "wrap-anywhere",
        className,
      )}
    >
      {text}
    </p>
  );
}

export { ClampedText };
