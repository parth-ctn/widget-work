import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({}) => {
  const isEmbed = process.env.BUILD_TARGET === "embed";

  return {
    plugins: [react()],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    build: {
      emptyOutDir: !isEmbed, // Don't clean dist folder when building embed
      assetsInlineLimit: 200000, // Inline assets smaller than 200kb as base64
      rollupOptions: {
        input: isEmbed ? "src/embed.ts" : "src/main.tsx",
        output: {
          entryFileNames: isEmbed ? "embed.js" : "chat-widget.js",
          assetFileNames: (assetInfo: any) => {
            if (assetInfo.name && assetInfo.name.endsWith(".css")) {
              return "assets/style.css"; // fixed CSS filename
            }
            return "assets/[name][extname]";
          },
          format: "iife",
          name: isEmbed ? "WebmapWidgetEmbed" : "ChatWidget",
        },
        external: [],
      },
      cssCodeSplit: false,
    },
    server: {
      cors: true, // allow all origins
    },
  };
});
