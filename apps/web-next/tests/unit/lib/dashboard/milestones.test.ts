import { describe, expect, it } from "vitest";
import { SONG_MILESTONES, songMilestones } from "@/lib/dashboard/milestones";

describe("songMilestones", () => {
  it("should have earned nothing and aim for the first song with no songs", () => {
    expect(songMilestones(0)).toEqual({
      earned: [],
      next: { target: 1, remaining: 1, progress: 0 },
    });
  });

  it("should count a milestone as earned once its target is reached exactly", () => {
    expect(songMilestones(10).earned).toEqual([1, 10]);
  });

  it("should report how far along the next milestone is, measured from the last one", () => {
    expect(songMilestones(30).next).toEqual({
      target: 50,
      remaining: 20,
      progress: 5 / 25,
    });
  });

  it("should have no next milestone once the last one is passed", () => {
    const last = SONG_MILESTONES.at(-1) ?? 0;

    expect(songMilestones(last + 1).next).toBeNull();
    expect(songMilestones(last + 1).earned).toEqual([...SONG_MILESTONES]);
  });
});
