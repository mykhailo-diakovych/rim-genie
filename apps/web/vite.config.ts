import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    // @ts-expect-error – vite@7.3.1 has two hash entries in bun cache causing type incompatibility
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["cookie", "baseLocale"],
    }),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    port: 3001,
  },
});
