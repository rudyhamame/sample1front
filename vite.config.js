import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
  },
  preview: {
    host: "0.0.0.0",
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
        ".jsx": "jsx",
      },
    },
  },
  build: {
    outDir: "build",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      onwarn(warning, warn) {
        const warningId = String(warning?.id || "");
        const warningMessage = String(warning?.message || "");

        if (
          warning.code === "EVAL" &&
          warningId.includes("pdfjs-dist") &&
          warningMessage.includes("Use of eval")
        ) {
          return;
        }

        warn(warning);
      },
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (!normalizedId.includes("node_modules")) {
            if (normalizedId.includes("/src/Home/")) {
              return "app-home";
            }

            if (
              normalizedId.includes("/src/SchoolPlanner/") ||
              normalizedId.includes("/src/NogaPlan/")
            ) {
              return "app-planner";
            }

            if (normalizedId.includes("/src/App/components/pdf-reader/")) {
              return "app-pdf-reader";
            }

            if (normalizedId.includes("/src/App/SubApps/")) {
              return "app-subapps";
            }

            return undefined;
          }

          if (normalizedId.includes("pdfjs-dist")) {
            return "vendor-pdf";
          }

          if (
            normalizedId.includes("@ffmpeg") ||
            normalizedId.includes("tesseract.js") ||
            normalizedId.includes("firebase") ||
            normalizedId.includes("livekit-client")
          ) {
            return "vendor-heavy";
          }

          if (
            normalizedId.includes("react") ||
            normalizedId.includes("react-dom") ||
            normalizedId.includes("react-router-dom")
          ) {
            return "vendor-react";
          }

          if (
            normalizedId.includes("@mui") ||
            normalizedId.includes("@emotion") ||
            normalizedId.includes("@fortawesome") ||
            normalizedId.includes("@flaticon")
          ) {
            return "vendor-ui";
          }

          return "vendor";
        },
      },
    },
  },
});
