"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { schema } from "@song-lists/db";
import { getAdminUserId } from "@/lib/auth/admin";
import { db } from "@/lib/queries/client";
import { isValidReleaseYear } from "@/lib/productions/release-year";
import { normalizeText } from "@/lib/text/normalize";

interface UpdateProductionInput {
  productionId: number;
  name: string;
  releaseYear: number;
  typeId: number;
}

type UpdateProductionResult =
  | { status: "updated" }
  | { status: "duplicate"; existingName: string; releaseYear: number }
  | { status: "error"; message: string };

/**
 * Edits a production's name, release year, and type. Admins only; refuses a
 * name and year that another production already has.
 */
async function updateProduction(
  input: UpdateProductionInput,
): Promise<UpdateProductionResult> {
  const userId = await getAdminUserId();

  if (!userId) {
    return { status: "error", message: "Only admins can edit productions." };
  }

  const name = normalizeText(input.name);

  if (!name) {
    return { status: "error", message: "Name is required." };
  }

  if (!isValidReleaseYear(input.releaseYear)) {
    return { status: "error", message: "Enter a valid release year." };
  }

  try {
    const type = await db.query.productionTypes.findFirst({
      columns: { id: true },
      where: eq(schema.productionTypes.id, input.typeId),
    });

    if (!type) {
      return { status: "error", message: "Pick a production type." };
    }

    const duplicate = await db.query.productions.findFirst({
      columns: { name: true, releaseYear: true },
      where: and(
        sql`lower(${schema.productions.name}) = lower(${name})`,
        eq(schema.productions.releaseYear, input.releaseYear),
        ne(schema.productions.id, input.productionId),
      ),
    });

    if (duplicate) {
      return {
        status: "duplicate",
        existingName: duplicate.name,
        releaseYear: duplicate.releaseYear,
      };
    }

    const updated = await db
      .update(schema.productions)
      .set({
        name,
        releaseYear: input.releaseYear,
        typeId: input.typeId,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(schema.productions.id, input.productionId))
      .returning({ id: schema.productions.id });

    if (updated.length === 0) {
      return { status: "error", message: "That production couldn't be found." };
    }

    return { status: "updated" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to save the production.",
    };
  }
}

export { updateProduction };
export type { UpdateProductionInput, UpdateProductionResult };
