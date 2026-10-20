import { EntityModal } from "@/components/entity-modal";
import { ProductionDetailsLoader } from "@/components/productions/production-details-loader";

/**
 * Intercepts a soft navigation to /production/[id] and shows the production
 * in a modal over the current page, like the song modal. A hard load renders
 * the full page at app/production/[id] instead.
 */
export default function ProductionModalPage({
  params,
}: PageProps<"/production/[id]">) {
  return (
    <EntityModal>
      <ProductionDetailsLoader
        params={params}
        headingLevel="h2"
        whenMissing="message"
      />
    </EntityModal>
  );
}
