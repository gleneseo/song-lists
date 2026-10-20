"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditButton } from "@/components/edit-button";
import { ProductionDetailsView } from "@/components/productions/production-details-view";
import { ProductionEditForm } from "@/components/productions/production-edit-form";
import type { ProductionDetails } from "@/lib/productions/production-details";
import type { ProductionTypeOption } from "@/lib/queries/productions";

/**
 * A production's details, with -- for admins -- a button that swaps them for
 * an edit form in place. `productionTypes` is only passed to admins; the
 * server checks the role again on every save.
 */
function ProductionDetailsPanel({
  details,
  headingLevel,
  productionTypes,
}: {
  details: ProductionDetails;
  headingLevel: "h1" | "h2";
  /** The types the form can pick from, or `null` for someone who can't edit. */
  productionTypes: ProductionTypeOption[] | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing && productionTypes) {
    return (
      <ProductionEditForm
        productionId={details.id}
        initial={{
          name: details.name,
          releaseYear: details.releaseYear,
          typeId: details.typeId,
        }}
        productionTypes={productionTypes}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <ProductionDetailsView
      details={details}
      headingLevel={headingLevel}
      footerAction={
        productionTypes ? <EditButton onClick={() => setEditing(true)} /> : null
      }
    />
  );
}

export { ProductionDetailsPanel };
