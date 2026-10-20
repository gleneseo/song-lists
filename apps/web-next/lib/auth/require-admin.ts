import { notFound, redirect } from "next/navigation";
import { getSession } from "./auth";
import { getAdminUserId } from "./admin";

/**
 * For admin-only pages: sends signed-out visitors to sign in and answers
 * anyone else who isn't an admin with a 404, so the page's existence isn't
 * revealed. Returns the admin's user ID.
 */
async function requireAdmin(): Promise<string> {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const adminId = await getAdminUserId();

  if (!adminId) {
    notFound();
  }

  return adminId;
}

export { requireAdmin };
