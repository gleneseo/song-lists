import { USER_ROLE } from "@song-lists/db/user-role";
import { normalizeText } from "@/lib/text/normalize";

interface UserEditInput {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  bio: string;
}

interface UserEditFields {
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  bio: string | null;
}

type UserEditValidation =
  { ok: true; fields: UserEditFields } | { ok: false; message: string };

const ROLES: readonly string[] = Object.values(USER_ROLE);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims the optional fields to `null` when blank. */
function optional(value: string): string | null {
  return normalizeText(value) || null;
}

/** Checks and tidies an admin's edit of a user, ready to write to the database. */
function validateUserEdit(input: UserEditInput): UserEditValidation {
  const name = normalizeText(input.name);

  if (!name) {
    return { ok: false, message: "Name is required." };
  }

  const email = input.email.trim().toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  if (!ROLES.includes(input.role)) {
    return { ok: false, message: "Choose a valid role." };
  }

  return {
    ok: true,
    fields: {
      name,
      firstName: optional(input.firstName),
      lastName: optional(input.lastName),
      email,
      role: input.role,
      bio: input.bio.trim() || null,
    },
  };
}

export { validateUserEdit };
export type { UserEditFields, UserEditInput, UserEditValidation };
