import type { NextConfig } from "next";
import { immutableAssetHeaders, securityHeaders } from "./src/server/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders(),
      },
      {
        source: "/assets/:path*",
        headers: immutableAssetHeaders(),
      },
      {
        source: "/brand/:path*",
        headers: immutableAssetHeaders(),
      },
    ];
  },
  serverExternalPackages: ["pdfjs-dist", "tesseract.js"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/next/dist/server/dev/browser-logs/**/*"],
    "/api/*": ["./node_modules/next/dist/server/dev/browser-logs/**/*"],
    "/api/materials/files/[fileName]": ["./private-materials/**/*"],
    "/api/pdf-worker": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  outputFileTracingExcludes: {
    "/api/admin/questions": [
      "./public/**/*",
      "./data/**/*",
      "./storage/**/*",
      "./scripts/**/*",
      "./test-artifacts/**/*",
      "./logs/**/*",
    ],
    "/*": [
      "./data/**/*",
      "./storage/**/*",
      "./scripts/**/*",
      "./scripts/import/output/**/*",
      "./test-artifacts/**/*",
      "./logs/**/*",
    ],
    "/api/*": [
      "./data/**/*",
      "./storage/**/*",
      "./scripts/**/*",
      "./scripts/import/output/**/*",
      "./test-artifacts/**/*",
      "./logs/**/*",
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    preloadEntriesOnStart: false,
    serverSourceMaps: false,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
