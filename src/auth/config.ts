import type { BetterAuthOptions } from "better-auth";

const authConfig: BetterAuthOptions = {
  appName: "song-lists",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: "users",
  },
  session: {
    modelName: "sessions",
  },
  account: {
    modelName: "accounts",
  },
  verification: {
    modelName: "verifications",
  },
  advanced: {
    database: {
      // Defer id generation to the database's own uuidV7() default instead
      // of Better Auth's random string id, matching the rest of this schema.
      generateId: false,
    },
  },
};

export { authConfig };
