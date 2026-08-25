import { defineConfig } from "drizzle-kit";

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const config = defineConfig({
  schema: "./src/db/schema/", // Picks up every schema file in the directory
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: { url: DATABASE_URL },
  strict: true, // Prompts for confirmation before running data-loss statements
  verbose: true, // Prints all SQL statements during migrations
});

export default config;
