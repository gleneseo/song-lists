import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAdminUserId } from "@/lib/auth/admin";

/** The navbar's admin-only links; renders nothing for everyone else. */
async function AdminMenu() {
  if (!(await getAdminUserId())) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      nativeButton={false}
      render={<Link href="/users" />}
    >
      Users
    </Button>
  );
}

export { AdminMenu };
