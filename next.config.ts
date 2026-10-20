import type { NextConfig } from "next";

// Security headers applied to every response (Phase 4).
//
// Deliberately NO Content-Security-Policy: the player is hls.js, which
// spins up Web Workers from blob: URLs and fetches video segments from
// whatever hosts the admin puts in the catalogue (CDNs, storage buckets,
// the owner's own servers). A strict CSP written today would either break
// playback or have to allow '*' for media/workers anyway — security
// theatre. If a deployment only ever serves video from known hosts, add a
// tailored CSP at the reverse proxy (see DEPLOY.md) where those hosts are
// known. The headers below are safe wins that never break playback.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // The site itself is never meant to be framed by third parties.
  // (Nothing here embeds third-party pages in iframes; the player is a
  // plain <video> element, so SAMEORIGIN costs nothing.)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Standalone output: `npm run build` produces .next/standalone/server.js
  // with only the runtime files it needs — this is what the Dockerfile
  // copies into the slim runner image (Phase 4).
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
