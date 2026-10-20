import { describe, expect, it } from "vitest";
import {
  findStyleIssues,
  newNamesIn,
  type NewNameSources,
} from "@/lib/songs/name-style";

const existing = { kind: "existing", id: 1 } as const;

function sources(overrides: Partial<NewNameSources> = {}): NewNameSources {
  return {
    title: "Rain Song",
    artist: existing,
    featuredArtists: [],
    production: null,
    cover: null,
    ...overrides,
  };
}

describe("newNamesIn", () => {
  it("should always include the song's own title", () => {
    expect(newNamesIn(sources())).toEqual([
      { field: "title", where: "Title", noun: "title", text: "Rain Song" },
    ]);
  });

  it("should skip an artist, production, and original song that already exist", () => {
    expect(
      newNamesIn(
        sources({
          featuredArtists: [existing],
          production: { kind: "existing", id: 2 },
          cover: { kind: "existing", songId: 3 },
        }),
      ),
    ).toHaveLength(1);
  });

  it("should include every new name, each with its place in the form", () => {
    const names = newNamesIn(
      sources({
        artist: { kind: "new", name: "led zeppelin" },
        featuredArtists: [existing, { kind: "new", name: "robert plant" }],
        production: {
          kind: "new",
          name: "the film",
          releaseYear: 1976,
          typeId: 1,
        },
        cover: {
          kind: "new",
          title: "original",
          artist: { kind: "new", name: "someone" },
        },
      }),
    );

    expect(
      names.map(({ field, where, noun, text }) => [field, where, noun, text]),
    ).toEqual([
      ["title", "Title", "title", "Rain Song"],
      ["artist", "Artist", "artist name", "led zeppelin"],
      ["featured:1", "Featured artist", "artist name", "robert plant"],
      ["production", "Production", "production name", "the film"],
      ["coverTitle", "Original song title", "title", "original"],
      ["coverArtist", "Original song's artist", "artist name", "someone"],
    ]);
  });

  it("should leave out a new original song's artist that already exists", () => {
    const names = newNamesIn(
      sources({ cover: { kind: "new", title: "Original", artist: existing } }),
    );

    expect(names.map(({ field }) => field)).toEqual(["title", "coverTitle"]);
  });
});

describe("findStyleIssues", () => {
  it("should find nothing when every new name follows the style", () => {
    expect(
      findStyleIssues(
        sources({ artist: { kind: "new", name: "The Pogues" } }),
        [],
      ),
    ).toEqual([]);
  });

  it("should report a name that breaks the style with its suggestion", () => {
    expect(
      findStyleIssues(
        sources({ artist: { kind: "new", name: "the pogues" } }),
        [],
      ),
    ).toEqual([
      {
        field: "artist",
        where: "Artist",
        noun: "artist name",
        text: "the pogues",
        suggestion: "The Pogues",
      },
    ]);
  });

  it("should offer a best guess for one with odd capitals", () => {
    expect(
      findStyleIssues(
        sources({ artist: { kind: "new", name: "ScHoolboy Q" } }),
        [],
      ),
    ).toMatchObject([{ field: "artist", suggestion: "Schoolboy Q" }]);
  });

  it("should check the name as it would be saved", () => {
    expect(
      findStyleIssues(sources({ title: "  the   kinks  " }), []),
    ).toMatchObject([{ text: "the kinks", suggestion: "The Kinks" }]);
  });

  it("should skip a name that has been waved through", () => {
    expect(
      findStyleIssues(
        sources({ artist: { kind: "new", name: "ScHoolboy Q" } }),
        ["ScHoolboy Q"],
      ),
    ).toEqual([]);
  });

  it("should not let a waved-through name cover a different one", () => {
    expect(
      findStyleIssues(
        sources({ artist: { kind: "new", name: "ScHoolboy Qq" } }),
        ["ScHoolboy Q"],
      ),
    ).toHaveLength(1);
  });

  it("should report several issues at once", () => {
    expect(
      findStyleIssues(
        sources({
          title: "rain song",
          artist: { kind: "new", name: "led zeppelin" },
        }),
        [],
      ).map(({ field }) => field),
    ).toEqual(["title", "artist"]);
  });
});
