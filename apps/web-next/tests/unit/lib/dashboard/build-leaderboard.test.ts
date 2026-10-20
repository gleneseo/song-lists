import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  rankContributors,
  type Contributor,
} from "@/lib/dashboard/build-leaderboard";

const al: Contributor = { userId: "al", name: "Al", count: 30 };
const chad: Contributor = { userId: "chad", name: "Chad", count: 20 };
const minnz: Contributor = { userId: "minnz", name: "Minnz", count: 20 };
const vic: Contributor = { userId: "vic", name: "Vic", count: 1 };

describe("rankContributors", () => {
  it("should order contributors by song count, highest first", () => {
    const actual = rankContributors([vic, al, chad], "al");

    expect(actual.map(({ userId }) => userId)).toEqual(["al", "chad", "vic"]);
  });

  it("should give tied contributors the same rank and skip the ranks they share", () => {
    const actual = rankContributors([vic, minnz, al, chad], "al");

    expect(actual.map(({ userId, rank }) => [userId, rank])).toEqual([
      ["al", 1],
      ["chad", 2],
      ["minnz", 2],
      ["vic", 4],
    ]);
  });

  it("should break ties alphabetically so the order is stable", () => {
    const actual = rankContributors([minnz, chad], "al");

    expect(actual.map(({ name }) => name)).toEqual(["Chad", "Minnz"]);
  });

  it("should flag only the viewer's own row", () => {
    const actual = rankContributors([al, chad], "chad");

    expect(actual.map(({ isYou }) => isYou)).toEqual([false, true]);
  });

  it("should not mutate the input", () => {
    const input = [vic, al];

    rankContributors(input, "al");

    expect(input).toEqual([vic, al]);
  });
});

describe("buildLeaderboard", () => {
  it("should include every contributor, ranked", () => {
    const actual = buildLeaderboard([vic, minnz, al, chad], "al");

    expect(actual.entries.map(({ userId }) => userId)).toEqual([
      "al",
      "chad",
      "minnz",
      "vic",
    ]);
  });

  it("should not cap the number of entries", () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      userId: `user-${index}`,
      name: `User ${index}`,
      count: 100 - index,
    }));

    expect(buildLeaderboard(many, "user-24").entries).toHaveLength(25);
  });

  it("should flag the viewer's row within the entries without repeating it", () => {
    const actual = buildLeaderboard([al, chad, minnz, vic], "vic");

    expect(actual.entries.filter(({ isYou }) => isYou)).toEqual([
      expect.objectContaining({ userId: "vic", rank: 4 }),
    ]);
    expect(actual.entries).toHaveLength(4);
  });

  it("should expose the viewer's own row and the total number of contributors", () => {
    const actual = buildLeaderboard([al, chad, vic], "vic");

    expect(actual.you).toMatchObject({ userId: "vic", rank: 3 });
    expect(actual.totalContributors).toBe(3);
  });

  it("should report no row for a viewer who has not contributed", () => {
    const actual = buildLeaderboard([al, chad], "newcomer");

    expect(actual.you).toBeNull();
    expect(actual.entries).toHaveLength(2);
  });
});
