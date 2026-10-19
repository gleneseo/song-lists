import { describe, expect, it } from "vitest";
import { selectDuplicateMatches } from "@/lib/search/select-duplicate-matches";

interface Candidate {
  title: string;
  similarity: number;
}

describe("selectDuplicateMatches", () => {
  it("should return no matches when there are no candidates", () => {
    expect(selectDuplicateMatches<Candidate>([], "La Grange")).toEqual({
      exact: null,
      near: null,
    });
  });

  it("should treat a case-insensitive title match as exact, not near", () => {
    const candidate: Candidate = { title: "la grange", similarity: 1 };

    expect(selectDuplicateMatches([candidate], "La Grange")).toEqual({
      exact: candidate,
      near: null,
    });
  });

  it("should treat a close but non-matching title as near when above the threshold", () => {
    const candidate: Candidate = { title: "La Grange!", similarity: 0.6 };

    expect(selectDuplicateMatches([candidate], "La Grange")).toEqual({
      exact: null,
      near: candidate,
    });
  });

  it("should not surface a near match below the similarity threshold", () => {
    const candidate: Candidate = { title: "La Grangeeeee", similarity: 0.4 };

    expect(selectDuplicateMatches([candidate], "La Grange")).toEqual({
      exact: null,
      near: null,
    });
  });

  it("should return both an exact and a separate near match when both are present", () => {
    const exact: Candidate = { title: "La Grange", similarity: 1 };
    const near: Candidate = { title: "La Grange!", similarity: 0.6 };

    expect(selectDuplicateMatches([exact, near], "La Grange")).toEqual({
      exact,
      near,
    });
  });

  it("should not pick the exact match again as the near match", () => {
    const exact: Candidate = { title: "La Grange", similarity: 1 };

    expect(selectDuplicateMatches([exact], "La Grange")).toEqual({
      exact,
      near: null,
    });
  });
});
