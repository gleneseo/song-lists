import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

/** The admin-only button that switches a details view into its edit form. */
function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <Pencil />
      Edit
    </Button>
  );
}

export { EditButton };
