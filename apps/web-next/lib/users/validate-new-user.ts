import { validatePassword } from "./validate-password";
import { validateUserEdit, type UserEditFields } from "./validate-user-edit";

interface NewUserInput {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  bio: string;
  password: string;
}

type NewUserValidation =
  | { ok: true; fields: UserEditFields; password: string }
  | { ok: false; message: string };

/** Checks and tidies an admin's new user -- the profile fields as for an edit, plus the starting password. */
function validateNewUser(input: NewUserInput): NewUserValidation {
  const profile = validateUserEdit(input);

  if (!profile.ok) {
    return profile;
  }

  const invalidPassword = validatePassword(input.password);

  if (invalidPassword) {
    return { ok: false, message: invalidPassword };
  }

  return { ok: true, fields: profile.fields, password: input.password };
}

export { validateNewUser };
export type { NewUserInput, NewUserValidation };
