"use client";

import { useEffect, useRef } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { StyleIssue } from "@/lib/songs/name-style";

/**
 * The names a new song would create that don't follow our style. Each comes
 * with our fix as a one-click button, and a checkbox to let the name through
 * as-is. The song can't be added until each has been fixed or waved through.
 * It scrolls itself into view when it appears, since it sits by the submit
 * button at the bottom of a long form.
 */
function NameStylePanel({
  issues,
  overrides,
  onUseSuggestion,
  onToggleOverride,
}: {
  issues: StyleIssue[];
  /** The names, as they'd be saved, that have been waved through. */
  overrides: string[];
  onUseSuggestion: (issue: StyleIssue) => void;
  onToggleOverride: (text: string, checked: boolean) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div
      ref={panel}
      role="alert"
      className="flex flex-col gap-4 rounded-lg border-2 border-destructive/60 bg-destructive/5 p-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-destructive"
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-destructive">
            {issues.length === 1
              ? "This isn't written in our style yet"
              : `${issues.length} things aren't written in our style yet`}
          </h2>
          <p className="text-sm text-muted-foreground">
            We start every word with a capital letter, even short ones like
            &ldquo;The&rdquo; and &ldquo;A&rdquo; (only &ldquo;vs.&rdquo; stays
            lowercase). A word in ALL CAPS is fine as an acronym.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-5">
        {issues.map((issue) => (
          <li
            key={issue.field}
            className="flex flex-col gap-2 rounded-md bg-background p-3 text-sm ring-1 ring-foreground/10"
          >
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {issue.where}
            </p>
            <p className="text-muted-foreground line-through decoration-destructive/60">
              {issue.text}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-auto items-start justify-start gap-3 py-2 text-left whitespace-normal"
              onClick={() => onUseSuggestion(issue)}
            >
              <Check
                aria-hidden="true"
                className="mt-0.5 text-green-700 dark:text-green-400"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Change to
                </span>
                <span className="text-base font-semibold text-foreground">
                  &ldquo;{issue.suggestion}&rdquo;
                </span>
              </span>
            </Button>
            <label className="flex items-start gap-2 text-muted-foreground">
              <Checkbox
                className="mt-0.5"
                checked={overrides.includes(issue.text)}
                onCheckedChange={(checked) =>
                  onToggleOverride(issue.text, checked)
                }
              />
              This {issue.noun} is highly artistic and commonly stylized in a
              way that breaks our standard, and we need to let this one through
              as-is.
            </label>
          </li>
        ))}
      </ul>
      {issues.filter((issue) => !overrides.includes(issue.text)).length > 1 && (
        <Button
          type="button"
          onClick={() =>
            issues
              .filter((issue) => !overrides.includes(issue.text))
              .forEach(onUseSuggestion)
          }
        >
          Change all to our style
        </Button>
      )}
    </div>
  );
}

export { NameStylePanel };
