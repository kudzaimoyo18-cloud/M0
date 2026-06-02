import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest config for M0 — same shape as SchoolPurse's, dialed for Next 15.
//
// Async Server Components aren't supported by Vitest. Test pure helpers
// and synchronous (client) components here. Async server-rendered routes
// should be covered by Playwright E2E instead.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
        "src/middleware.ts",
      ],
    },
  },
});
