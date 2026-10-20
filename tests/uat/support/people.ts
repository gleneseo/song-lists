/** The seeded people the tests sign in as, one for each role there is. */
const PEOPLE = {
  admin: { name: "Al", email: "al@seed.gleneseo.com" },
  manager: { name: "Cliff", email: "cliff@seed.gleneseo.com" },
  user: { name: "Judd", email: "judd@seed.gleneseo.com" },
} as const;

/** The password every seeded person has. */
const SEED_PASSWORD = "sample-password";

type Role = keyof typeof PEOPLE;

/** Where a role's saved sign-in lives, so a test can start already signed in. */
const statePath = (role: Role): string =>
  new URL(`../.auth/${role}.json`, import.meta.url).pathname;

export { PEOPLE, SEED_PASSWORD, statePath };
export type { Role };
