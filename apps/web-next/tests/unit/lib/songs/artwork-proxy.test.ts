import { describe, expect, it } from "vitest";
import { canProxyArtwork } from "@/lib/songs/artwork-proxy";

describe("canProxyArtwork", () => {
  it.each([
    "/album-art/band-album-1999.jpg",
    "https://is1-ssl.mzstatic.com/image/thumb/Music/a/b/c/d.jpg/80x80bb.jpg",
    "https://is5-ssl.mzstatic.com/image/thumb/x.jpg",
    "https://coverartarchive.org/release-group/6bb3333d-b970-3cc8-8425-71b7dcb16818/front-250",
  ])("should fetch %s through the server", (src) => {
    expect(canProxyArtwork(src)).toBe(true);
  });

  it.each([
    "https://i1.sndcdn.com/artworks-1-t500x500.jpg",
    "http://is1-ssl.mzstatic.com/a.jpg",
    "https://is1-ssl.mzstatic.com/a.jpg?size=big",
    "https://mzstatic.com.evil.test/a.jpg",
    "https://coverartarchive.org/other/path.jpg",
    "/somewhere/else.jpg",
    "data:image/png;base64,AAAA",
    "not an address",
  ])("should show %s straight from where it is", (src) => {
    expect(canProxyArtwork(src)).toBe(false);
  });
});
