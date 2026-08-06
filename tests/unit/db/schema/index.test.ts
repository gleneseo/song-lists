import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as schema from "../../../../src/db/schema/index.js";

/**
 * src/db/schema/index.ts is the barrel file that drizzle.config.ts and the
 * relational query API (db.query.*) read the whole schema from. Adding a new
 * table/module under src/db/schema without re-exporting it from the barrel
 * doesn't fail loudly — it just silently drops that table from migrations
 * and relational queries until someone hits a confusing error later.
 *
 * This file catches that at test time by diffing each schema module's
 * exports against the barrel's exports:
 * - moduleExports: the exports of one schema module (e.g. artists.ts),
 *   keyed by export name, as returned by `await import(...)`.
 * - barrelValues: just the *values* re-exported from index.ts, with names
 *   stripped, since a barrel export only needs to carry the same object
 *   reference through, not the same name.
 *
 * findUnexportedNames is a pure function so the "does this actually catch a
 * missing export" behavior can be unit tested directly with fixtures below,
 * instead of only relying on the filesystem-driven checks at the bottom.
 */

const schemaDirectory = fileURLToPath(
  new URL("../../../../src/db/schema", import.meta.url),
);

const moduleNames = readdirSync(schemaDirectory)
  .filter((file) => file.endsWith(".ts") && file !== "index.ts")
  .map((file) => file.replace(/\.ts$/, ""));

function findUnexportedNames(
  moduleExports: Record<string, unknown>,
  barrelValues: unknown[],
): string[] {
  return Object.entries(moduleExports)
    .filter(([, value]) => !barrelValues.includes(value))
    .map(([exportName]) => exportName);
}

describe("index", () => {
  describe("checking that nothing is left out of the shared schema file", () => {
    it("should flag something that is missing from the collection", () => {
      const forgotten = {};

      const missing = findUnexportedNames(
        { default: forgotten, name: "songs" },
        ["songs"],
      );

      expect(missing).toEqual(["default"]);
    });

    it("should stay quiet when nothing is missing", () => {
      const included = {};

      const missing = findUnexportedNames({ default: included }, [included]);

      expect(missing).toEqual([]);
    });
  });

  describe("the shared schema file", () => {
    it("should find every table definition file to check", () => {
      expect(moduleNames.length).toBeGreaterThan(0);
    });

    it.each(moduleNames)(
      "should include everything that %s.ts defines",
      async (name) => {
        const module = (await import(
          `../../../../src/db/schema/${name}.ts`
        )) as Record<string, unknown>;

        const missing = findUnexportedNames(module, Object.values(schema));

        expect(missing, `${name}.ts's un-exported members`).toEqual([]);
      },
    );
  });
});
