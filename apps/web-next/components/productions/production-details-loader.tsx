import { notFound, redirect } from "next/navigation";
import { ProductionDetailsPanel } from "@/components/productions/production-details-panel";
import { getSession } from "@/lib/auth/auth";
import { getProductionDetails } from "@/lib/queries/production-details";
import { getProductionTypes } from "@/lib/queries/productions";
import { isAdminUser } from "@/lib/queries/users";

/**
 * Loads the production named by a route's `id` param and shows its details,
 * for both the full page and the modal. Admins also get the Edit button. A
 * missing production is a real 404 on the full page, but a short message
 * inside the modal -- a 404 page would replace the list the modal sits on.
 */
async function ProductionDetailsLoader({
  params,
  headingLevel,
  whenMissing,
}: {
  params: Promise<{ id: string }>;
  headingLevel: "h1" | "h2";
  whenMissing: "not-found" | "message";
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const productionId = Number(id);
  const [details, canEdit] = await Promise.all([
    Number.isInteger(productionId) && productionId > 0
      ? getProductionDetails(productionId)
      : null,
    isAdminUser(session.user.id),
  ]);

  if (details) {
    return (
      <ProductionDetailsPanel
        details={details}
        headingLevel={headingLevel}
        productionTypes={canEdit ? await getProductionTypes() : null}
      />
    );
  }

  if (whenMissing === "not-found") {
    notFound();
  }

  return (
    <p className="py-6 text-center text-muted-foreground">
      That production couldn&apos;t be found.
    </p>
  );
}

export { ProductionDetailsLoader };
