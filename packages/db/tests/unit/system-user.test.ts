import { describe, expect, it } from "vitest";
import { SYSTEM_USER_ID } from "../../src/system-user.js";

describe("system user", () => {
  it("should match the ID seeded by migrations/0004_seed_admin_user.sql", () => {
    expect(SYSTEM_USER_ID).toBe("00000000-0000-0000-0000-000000000000");
  });
});
