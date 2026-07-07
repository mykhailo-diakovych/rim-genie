import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      outputStructure: "message-modules",
      cookieName: "PARAGLIDE_LOCALE",
      strategy: ["cookie", "baseLocale"],
    }),
    tanstackStart(),
    // Nitro produces the Vercel build output but its alpha dev server drops
    // redirect Location headers on Start 1.161.x. Build-only until upstream is fixed.
    ...(command === "build" ? [nitro()] : []),
    viteReact(),
  ],

  server: {
    port: 3000,
  },

  preview: {
    port: 3000,
  },

  resolve: {
    tsconfigPaths: true,
  },
}));
