import type { NextConfig } from "next";

// Production builds target GitHub Pages at https://<user>.github.io/rodoslov/.
// All assets and routes need a /rodoslov prefix there. Locally (`yarn dev`)
// we skip `output: export` and the prefix entirely so dev URLs stay clean
// and `next dev` works without static-export caveats.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/rodoslov" : "";

const nextConfig: NextConfig = {
  ...(isProd
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
      }
    : {}),
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
