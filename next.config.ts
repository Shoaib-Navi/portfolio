import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next otherwise writes AGENTS.md / CLAUDE.md into the repo on every dev run.
  agentRules: false,
  // Admin uploads (screenshots, résumé PDFs) go through server actions; the default cap is 1 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Logos are user-uploaded SVGs: if one is opened directly, give it nothing to run.
        source: "/logos/:file*",
        headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; img-src data:" }],
      },
      {
        source: "/admin/:path*",
        // Admin pages are dynamic, so Next already sends them with no-store.
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
