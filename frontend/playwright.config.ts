import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Full-stack end-to-end tests: real FastAPI + PostgreSQL (a throwaway `_e2e` database) behind the
 * production frontend build. `vite preview` proxies /api to the test API exactly like the Vercel rewrite.
 *
 * Needs: PostgreSQL reachable at E2E_DATABASE_URL and the backend virtualenv (BACKEND_PYTHON).
 */
const API_PORT = process.env.E2E_API_PORT ?? "8001";
const DB = process.env.E2E_DATABASE_URL ?? "postgresql+psycopg://portfolio:portfolio_dev_only@127.0.0.1:5544/portfolio_e2e";
const BACKEND = path.resolve(import.meta.dirname, "../backend");
const PY = process.env.BACKEND_PYTHON ?? path.join(BACKEND, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "E2e-Correct-Horse-Battery-77";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `"${PY}" "${path.join(BACKEND, "scripts", "e2e_server.py")}"`,
      url: `http://127.0.0.1:${API_PORT}/ready`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        APP_ENV: "test",
        DATABASE_URL: DB,
        SECRET_KEY: "e2e-secret-key-that-is-long-enough-for-tests-0123",
        PUBLIC_SITE_ORIGIN: "http://localhost:4173",
        COOKIE_SECURE: "false",
        TRUSTED_PROXY_HOPS: "0",
        STORAGE_BACKEND: "local",
        LOCAL_MEDIA_DIR: path.join(BACKEND, ".e2e_media"),
        RATE_LIMIT_CONTACT: "1000/minute",
        RATE_LIMIT_LOGIN: "1000/minute",
        SEND_LEAD_ACKNOWLEDGEMENT: "false",
        MIN_FORM_FILL_MS: "0",
        E2E_PASSWORD,
        E2E_API_PORT: API_PORT,
      },
    },
    {
      command: "npm run build && npx vite preview --port 4173 --strictPort",
      url: "http://localhost:4173",
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_DEV_API: `http://127.0.0.1:${API_PORT}` },
    },
  ],
});
