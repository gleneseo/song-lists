import { isAdminUser } from "@/lib/queries/users";
import { getSession } from "./auth";

/**
 * The signed-in user's id when they're an admin, otherwise `null`. The role
 * is read from the database on every call, so a demotion takes effect
 * immediately rather than when the session next refreshes.
 */
async function getAdminUserId(): Promise<string | null> {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return (await isAdminUser(session.user.id)) ? session.user.id : null;
}

export { getAdminUserId };
