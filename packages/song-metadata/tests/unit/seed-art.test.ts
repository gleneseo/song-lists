import { describe, expect, it, vi } from "vitest";
import {
  artChecks,
  checkAddress,
  seedArtwork,
  seedSongTitles,
} from "../../src/seed-art.js";

const songsSql = `
INSERT INTO "song_lists"."songs" ("resource_id", "title")
SELECT 1
FROM (VALUES
	(0, '11111111-1111-1111-1111-111111111111', 'Plain Song', NULL, '2020-01-01'),
	(1, '22222222-2222-2222-2222-222222222222', 'Don''t Stop', NULL, '2020-01-01')
) AS v(ord, resource_id, title, bio, created_at);
`;

const detailsSql = `
INSERT INTO "song_lists"."song_featured_artists" ("resource_id")
SELECT 1
FROM (VALUES
	(0, '99999999-9999-9999-9999-999999999999', '2020-01-01', '11111111-1111-1111-1111-111111111111')
) AS v(ord, resource_id, created_at, song);

INSERT INTO "song_lists"."song_metadata" ("resource_id", "status")
SELECT 1
FROM (VALUES
	(0, '33333333-3333-3333-3333-333333333333', 'matched', 'itunes', '123', 'https://is1-ssl.mzstatic.com/image/thumb/a/b/c/x.jpg/100x100bb.jpg', 'It''s An Album', '1990', 'auto', 'auto', '2026-10-23 10:47:17.525', '22222222-2222-2222-2222-222222222222'),
	(1, '44444444-4444-4444-4444-444444444444', 'matched', NULL, NULL, '/album-art/own-cover.jpg', 'Own Cover', '1991', 'manual', 'manual', '2026-10-23 10:47:17.525', '11111111-1111-1111-1111-111111111111'),
	(2, '55555555-5555-5555-5555-555555555555', 'matched', 'musicbrainz', NULL, NULL, 'No Art', '1992', 'manual', 'auto', '2026-10-23 10:47:17.525', '11111111-1111-1111-1111-111111111111'),
	(3, '66666666-6666-6666-6666-666666666666', 'matched', NULL, NULL, 'https://example.test/art.jpg', NULL, '1993', 'manual', 'auto', '2026-10-23 10:47:17.525', '77777777-7777-7777-7777-777777777777')
) AS v(ord, resource_id, status, source, source_track_id, artwork_url, album_name, release_year, details_matched_by, artwork_matched_by, fetched_at, song);
`;

describe("seedSongTitles", () => {
  it("should read each song's title by its ID, with a doubled quote as one", () => {
    expect([...seedSongTitles(songsSql)]).toEqual([
      ["11111111-1111-1111-1111-111111111111", "Plain Song"],
      ["22222222-2222-2222-2222-222222222222", "Don't Stop"],
    ]);
  });

  it("should find no titles in a migration that doesn't seed songs", () => {
    expect(seedSongTitles(detailsSql).size).toBe(0);
    expect(seedSongTitles("").size).toBe(0);
  });
});

describe("seedArtwork", () => {
  it("should list the cover art of each song's album details, with the song's and album's names", () => {
    expect(seedArtwork(songsSql, detailsSql)).toEqual([
      {
        songTitle: "Don't Stop",
        albumName: "It's An Album",
        artworkUrl:
          "https://is1-ssl.mzstatic.com/image/thumb/a/b/c/x.jpg/100x100bb.jpg",
      },
      {
        songTitle: "Plain Song",
        albumName: "Own Cover",
        artworkUrl: "/album-art/own-cover.jpg",
      },
      {
        songTitle: "77777777-7777-7777-7777-777777777777",
        albumName: "",
        artworkUrl: "https://example.test/art.jpg",
      },
    ]);
  });

  it("should skip a song whose details have no art", () => {
    expect(
      seedArtwork(songsSql, detailsSql).map(({ albumName }) => albumName),
    ).not.toContain("No Art");
  });

  it("should list nothing for a migration that seeds no details", () => {
    expect(seedArtwork(songsSql, songsSql)).toEqual([]);
  });
});

describe("artChecks", () => {
  it("should check that one of the app's own files is there", () => {
    expect(artChecks("/album-art/own-cover.jpg")).toEqual([
      { kind: "file", path: "/album-art/own-cover.jpg" },
    ]);
  });

  it("should check iTunes art at the small size and the biggest", () => {
    expect(
      artChecks(
        "https://is1-ssl.mzstatic.com/image/thumb/a/x.jpg/100x100bb.jpg",
      ),
    ).toEqual([
      {
        kind: "web",
        address:
          "https://is1-ssl.mzstatic.com/image/thumb/a/x.jpg/224x224bb.jpg",
      },
      {
        kind: "web",
        address:
          "https://is1-ssl.mzstatic.com/image/thumb/a/x.jpg/5000x5000bb.jpg",
      },
    ]);
  });

  it("should check Cover Art Archive art at the small size and as the original", () => {
    expect(
      artChecks("https://coverartarchive.org/release-group/g1/front"),
    ).toEqual([
      {
        kind: "web",
        address: "https://coverartarchive.org/release-group/g1/front-250",
      },
      {
        kind: "web",
        address: "https://coverartarchive.org/release-group/g1/front",
      },
    ]);
  });

  it("should check an address it doesn't know once", () => {
    expect(artChecks("https://example.test/art.jpg")).toEqual([
      { kind: "web", address: "https://example.test/art.jpg" },
    ]);
  });
});

describe("checkAddress", () => {
  const answer = (status: number, type = "image/jpeg") =>
    new Response(null, { status, headers: { "content-type": type } });
  const options = (...answers: (Response | Error | string)[]) => {
    const fetch = vi.fn((): Promise<Response> => {
      const next = answers.shift() ?? answer(500);

      return next instanceof Response
        ? Promise.resolve(next)
        : // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- a failing request may reject with anything, which is what is being tested
          Promise.reject(next);
    });
    const sleep = vi.fn(() => Promise.resolve());

    return { fetch, sleep, attempts: 3, retryDelayMs: 5 };
  };

  it("should call an address that answers with an image fine, after one try", async () => {
    const given = options(answer(200));

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "ok",
    });
    expect(given.fetch).toHaveBeenCalledTimes(1);
    expect(given.sleep).not.toHaveBeenCalled();
  });

  it("should call an address that fails and then answers flaky, waiting between tries", async () => {
    const given = options(answer(500), answer(200));

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "flaky",
      attempts: 2,
    });
    expect(given.sleep).toHaveBeenCalledWith(5);
  });

  it("should call an address that never answers broken, with the last reason", async () => {
    const given = options(answer(500), answer(404), answer(404));

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "broken",
      reason: "HTTP 404",
    });
    expect(given.fetch).toHaveBeenCalledTimes(3);
    expect(given.sleep).toHaveBeenCalledTimes(2);
  });

  it("should not take an answer that isn't an image for a cover", async () => {
    const given = options(
      answer(200, "text/html"),
      answer(200, "text/html"),
      answer(200, "text/html"),
    );

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "broken",
      reason: "an answer that isn't an image",
    });
  });

  it("should call an address broken when the request itself fails", async () => {
    const given = options(
      new Error("socket hang up"),
      new Error("socket hang up"),
      "refused",
    );

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "broken",
      reason: "no answer",
    });
  });

  it("should report the failure when the last request fails with a message", async () => {
    const given = options(
      answer(500),
      answer(500),
      new Error("socket hang up"),
    );

    expect(await checkAddress("https://a.test/x.jpg", given)).toEqual({
      status: "broken",
      reason: "socket hang up",
    });
  });
});
