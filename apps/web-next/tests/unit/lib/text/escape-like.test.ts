import { describe, expect, it } from "vitest";
import { escapeLike } from "@/lib/text/escape-like";

describe("escapeLike", () => {
  it("should leave ordinary text alone", () => {
    expect(escapeLike("Paint It, Black")).toBe("Paint It, Black");
  });

  it("should escape the percent and underscore wildcards", () => {
    expect(escapeLike("100%_pure")).toBe("100\\%\\_pure");
  });

  it("should escape the escape character itself", () => {
    expect(escapeLike("AC\\DC")).toBe("AC\\\\DC");
  });

  it("should escape every occurrence", () => {
    expect(escapeLike("%%")).toBe("\\%\\%");
  });
});
