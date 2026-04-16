import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /** pdfkit carga fuentes .afm desde el paquete en runtime */
  serverExternalPackages: ["pdfkit"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
