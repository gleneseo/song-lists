import { Schema } from "effect";

/**
 * The roles a user can hold.
 *
 * The database stores the role as free text with a `"user"` default; this is
 * the single source of truth every app validates and narrows against.
 */
const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  MANAGER: "manager",
} as const;

const UserRole = Schema.Literals([
  USER_ROLE.USER,
  USER_ROLE.ADMIN,
  USER_ROLE.MANAGER,
]);

type UserRole = Schema.Schema.Type<typeof UserRole>;

export { USER_ROLE, UserRole };
