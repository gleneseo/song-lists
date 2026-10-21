import { describe, expect, it } from "vitest";
import { resolveAppTitle } from "@/lib/config/app-title";

describe("app-title", () => {
  it("should use the configured title", () => {
    expect(resolveAppTitle("Glen Songs")).toBe("Glen Songs");
  });

  it("should trim the configured title", () => {
    expect(resolveAppTitle("  Glen Songs ")).toBe("Glen Songs");
  });

  it.each([undefined, "", "   "])(
    "should fall back to Song Lists when the title is %j",
    (configured) => {
      expect(resolveAppTitle(configured)).toBe("Song Lists");
    },
  );
});
