import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The UAT browser tests build into a folder of their own, so a build for
  // them never touches the one a running dev server is using.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
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
