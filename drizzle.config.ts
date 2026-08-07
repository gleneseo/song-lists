import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/", // Picks up every schema file in the directory
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  strict: true, // Prompts for confirmation before running data-loss statements
  verbose: true, // Prints all SQL statements during migrations
});
