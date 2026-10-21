/** The seeded people the tests sign in as, one for each role there is. */
const PEOPLE = {
  admin: { name: "Al", email: "al@seed.gleneseo.com" },
  manager: { name: "Cliff", email: "cliff@seed.gleneseo.com" },
  user: { name: "Judd", email: "judd@seed.gleneseo.com" },
} as const;

/** The password every seeded person has. */
const SEED_PASSWORD = "sample-password";

type Role = keyof typeof PEOPLE;

export { PEOPLE, SEED_PASSWORD };
export type { Role };
