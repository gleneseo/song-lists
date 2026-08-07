import type { BetterAuthOptions } from "better-auth";

const authConfig: BetterAuthOptions = {
  appName: "song-lists",
  emailAndPassword: {
    enabled: true,
  },
};

export { authConfig };
