import { describe, expect, it } from "vitest";
import { isLocalDatabase } from "../../src/local-database.js";

describe("isLocalDatabase", () => {
  it.each([
    "postgres://postgres:postgres@localhost:5432/default",
    "postgres://postgres:postgres@127.0.0.1:5432/default",
    "postgres://postgres:postgres@[::1]:5432/default",
  ])("should accept %s", (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  it.each([
    "postgres://user:pw@db.example.com:5432/prod",
    "postgres://user:pw@192.168.1.20:5432/default",
    "postgres://user:pw@localhost.example.com/default",
    "not a url",
    "",
  ])("should refuse %s", (url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });
});
