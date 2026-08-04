import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts", // Points to your central hub
  out: "./src/db/migrations",
  dialect: "postgresql",
  strict: true, // Prompts for confirmation before running data-loss statements
  verbose: true, // Prints all SQL statements during migrations
});
