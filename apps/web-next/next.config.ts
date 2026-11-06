import type { NextConfig } from "next";
import { ARTWORK_REMOTE_PATTERNS } from "./lib/songs/artwork-proxy";

const nextConfig: NextConfig = {
  // The UAT browser tests build into a folder of their own, so a build for
  // them never touches the one a running dev server is using.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  // A production build checks the app, not its tests: the tests import
  // helpers (and testcontainers) from the repository root that a deploy
  // doesn't need. `npm run typecheck` still checks everything, tests included.
  typescript: { tsconfigPath: "tsconfig.build.json" },
  // Next 16.4 sends the browser into an endless loop of prefetch requests
  // (thousands a second) for a page under a root parallel slot's catch-all,
  // as our modal slot has (see vercel/next.js#100055, still open). Turning
  // optimistic routing off avoids it; remove this once a release fixes it.
  experimental: { optimisticRouting: false },
  // Cover art from the music services is fetched, resized, and kept by this
  // server (see SongArtwork), not hotlinked from every viewer's browser. Art
  // hardly ever changes, so it is kept for 31 days rather than the default
  // 4 hours, which would send the Cover Art Archive's images back to
  // archive.org all day long.
  images: {
    remotePatterns: ARTWORK_REMOTE_PATTERNS,
    minimumCacheTTL: 31 * 24 * 60 * 60,
  },
  transpilePackages: [
    "@song-lists/db",
    "@song-lists/auth",
    "@song-lists/song-metadata",
  ],
  // @song-lists/* packages are consumed as raw TypeScript (their `exports`
  // point at src/index.ts) and, like the rest of the monorepo, write
  // relative imports with an explicit ".js" extension resolving to a
  // sibling ".ts" file -- required for plain tsc/tsx/Node ESM, but neither
  // bundler resolves it for a node_modules-resolved package out of the box.
  // Turbopack has no supported hook for this (its resolveExtensions/
  // resolveAlias explicitly don't apply inside node_modules), so this app
  // is pinned to webpack (see package.json's dev/build scripts) and given
  // webpack's own extensionAlias fix here.
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
