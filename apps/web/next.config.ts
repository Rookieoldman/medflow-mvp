import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /** pdfkit carga fuentes .afm desde el paquete en runtime; web-push es módulo Node */
  serverExternalPackages: ["pdfkit", "web-push"],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
