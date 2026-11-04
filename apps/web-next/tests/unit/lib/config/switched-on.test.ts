import { describe, expect, it } from "vitest";
import { switchedOn } from "@/lib/config/switched-on";

describe("switchedOn", () => {
  it("should be on only for exactly true", () => {
    expect(switchedOn("true")).toBe(true);
  });

  it.each([undefined, "", "false", "off", "on", "TRUE", "True", "1", " true"])(
    "should be off for %j",
    (value) => {
      expect(switchedOn(value)).toBe(false);
    },
  );
});
