import type { NextConfig } from "next";

// GitHub Pages serves the site at https://<user>.github.io/rodoslov/, so all
// assets and routes need a /rodoslov prefix in production. Locally
// (`yarn dev`) the prefix is empty so dev URLs stay clean.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/rodoslov" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
