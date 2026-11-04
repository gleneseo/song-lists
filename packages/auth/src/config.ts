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
  rateLimit: {
    // In the database, not server memory, so the limit holds across
    // serverless instances and restarts. Better Auth only applies it in
    // production.
    storage: "database",
    modelName: "rateLimits",
  },
  advanced: {
    database: {
      // Defer ID generation to the database's own uuidV7() default instead
      // of Better Auth's random string ID, matching the rest of this schema.
      generateId: false,
    },
  },
};

export default authConfig;
