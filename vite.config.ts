import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  plugins: [
    {
      name: "website-alias",
      enforce: "pre",
      async resolveId(source, importer) {
        const normalizedImporter = importer?.replace(/\\/g, "/").toLowerCase();
        const normalizedSource = source.replace(/\\/g, "/");
        const portalSourceRoot = `${path.resolve(__dirname, "src").replace(/\\/g, "/")}/`;
        let websiteSource: string | null = null;
        if (normalizedImporter?.includes("website") && source.startsWith("@/")) {
          websiteSource = path.resolve(__dirname, "website/src", source.slice(2));
        }
        if (normalizedImporter?.includes("website") && normalizedSource.startsWith(portalSourceRoot)) {
          websiteSource = path.resolve(__dirname, "website/src", normalizedSource.slice(portalSourceRoot.length));
        }
        if (websiteSource) {
          const resolved = await this.resolve(websiteSource, importer, { skipSelf: true });
          return resolved?.id ?? websiteSource;
        }
        return null;
      },
    },
    {
      name: "website-css-compatibility",
      enforce: "pre",
      transform(code, id) {
        const normalizedId = id.replace(/\\/g, "/");
        if (!normalizedId.endsWith("/website/src/styles.css")) return null;

        const transformed = code
          .replace('@import "tailwindcss";', '@tailwind base;\n@tailwind components;\n@tailwind utilities;')
          .replace('@import "tw-animate-css";', '')
          .replace('@source "../src";', "")
          .replace(/@theme inline\s*\{([\s\S]*?)\n\}/, ":root {$1\n}")
          .replace(/@utility\s+([\w-]+)\s*\{/g, ".$1 {");

        return { code: transformed, map: null };
      },
    },
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
