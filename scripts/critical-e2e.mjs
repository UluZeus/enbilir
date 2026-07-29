import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const npmCommand = process.platform === "win32" ? process.execPath : "npm";
const npmArgumentPrefix =
  process.platform === "win32"
    ? [path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
const port = Number(process.env.E2E_PORT || 3219);
const baseUrl = `http://127.0.0.1:${port}`;
const testRoot = mkdtempSync(path.join(tmpdir(), "enbilir-critical-e2e-"));
const databasePath = path.join(testRoot, "e2e.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
let server;

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed${result.error ? `: ${result.error.message}` : "."}`);
  }
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/live`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Local server did not become ready: ${lastError instanceof Error ? lastError.message : "timeout"}`);
}

async function launchBrowser(chromium) {
  try {
    return await chromium.launch();
  } catch {
    for (const channel of process.platform === "win32" ? ["msedge", "chrome"] : ["chrome"]) {
      try {
        return await chromium.launch({ channel });
      } catch {
        // Try the next installed browser channel.
      }
    }
  }
  throw new Error("No Playwright-compatible Chromium browser is available.");
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill();
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.exitCode === null) {
    server.kill("SIGKILL");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ]);
  }
}

async function readTickerFrame(track) {
  return track.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      animationName: styles.animationName,
      transform: styles.transform,
      x: element.getBoundingClientRect().x,
    };
  });
}

async function assertTickerAdvances(page, track, label) {
  const before = await readTickerFrame(track);
  if (before.animationName !== "ai-market-radar-ticker") {
    throw new Error(`${label} does not use the radar ticker animation: ${before.animationName}`);
  }

  await page.waitForTimeout(350);
  const after = await readTickerFrame(track);
  if (Math.abs(after.x - before.x) < 0.25 && after.transform === before.transform) {
    throw new Error(`${label} did not advance (${before.transform} -> ${after.transform}).`);
  }
}

async function installTerminalApiFixtures(page) {
  let interceptionCount = 0;
  let resolveFirstInterception;
  const firstInterception = new Promise((resolve) => {
    resolveFirstInterception = resolve;
  });

  await page.route("**/api/ai-market/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const endpoint = requestUrl.pathname;

    if (endpoint === "/api/ai-market/favorites") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ favorites: [] }),
      });
      return;
    }

    if (
      endpoint === "/api/ai-market/analyze" ||
      endpoint === "/api/ai-market/performance" ||
      endpoint === "/api/ai-market/batch-analyze"
    ) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Synthetic critical-E2E fixture blocks provider-backed analysis.",
        }),
      });
      return;
    }

    if (endpoint !== "/api/ai-market/market-scan") {
      await route.abort("blockedbyclient");
      throw new Error(`Critical E2E blocked unexpected AI market endpoint: ${endpoint}`);
    }

    interceptionCount += 1;
    resolveFirstInterception();
    const interval = requestUrl.searchParams.get("interval") || "1h";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        alerts: [
          {
            key: `critical-e2e-${interval}`,
            symbol: "BTCUSDT",
            displayName: "Bitcoin",
            interval,
            alertType: "BUY_WATCH",
            confidence: 72,
            recommendationScore: 68,
            riskScore: 28,
            priority: 10,
          },
        ],
      }),
    });
  });

  return {
    async assertIntercepted(label) {
      await Promise.race([
        firstInterception,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} did not request the synthetic market-scan fixture.`)), 5_000);
        }),
      ]);
      if (interceptionCount < 1) {
        throw new Error(`${label} market-scan interception count is ${interceptionCount}.`);
      }
    },
  };
}

async function main() {
  const chatUploadDirectory = path.join(testRoot, "uploads", "chat");
  const adminUploadDirectory = path.join(testRoot, "uploads", "admin");
  const backupDirectory = path.join(testRoot, "backups");
  const operationsLogDirectory = path.join(testRoot, "logs");
  for (const directory of [chatUploadDirectory, adminUploadDirectory, backupDirectory, operationsLogDirectory]) {
    mkdirSync(directory, { recursive: true });
  }
  const runtimeEnv = {
    ...process.env,
    ENBILIR_ENV: "staging",
    DATABASE_URL: databaseUrl,
    NEXT_PUBLIC_SITE_URL: "https://staging.enbilir.invalid",
    AUTH_SECRET: randomBytes(32).toString("base64url"),
    MASTER_ADMIN_EMAIL: "admin@enbilir.invalid",
    RATE_LIMIT_HASH_SECRET: randomBytes(32).toString("base64url"),
    AI_AGENT_CRON_SECRET: randomBytes(32).toString("base64url"),
    VIP_RESEARCH_CRON_SECRET: randomBytes(32).toString("base64url"),
    VIP_AGENTS_CRON_SECRET: randomBytes(32).toString("base64url"),
    AI_SIGNAL_EVALUATION_CRON_SECRET: randomBytes(32).toString("base64url"),
    SUBSCRIPTION_CRON_SECRET: randomBytes(32).toString("base64url"),
    WEEKLY_COMPETITION_CRON_SECRET: randomBytes(32).toString("base64url"),
    VIP_SUBSCRIPTION_WEBHOOK_SECRET: randomBytes(32).toString("base64url"),
    GOOGLE_CLIENT_ID: `synthetic-${randomBytes(16).toString("hex")}`,
    GOOGLE_CLIENT_SECRET: randomBytes(32).toString("base64url"),
    SMTP_HOST: "smtp.enbilir.invalid",
    SMTP_USER: "no-reply@enbilir.invalid",
    SMTP_PASSWORD: randomBytes(32).toString("base64url"),
    SMTP_FROM: "Enbilir <no-reply@enbilir.invalid>",
    OPENAI_API_KEY: randomBytes(32).toString("base64url"),
    ENABLE_LIVE_MARKET_FETCH: "false",
    CHAT_UPLOAD_DIR: chatUploadDirectory,
    ADMIN_UPLOAD_DIR: adminUploadDirectory,
    BACKUP_DIR: backupDirectory,
    OPERATIONS_LOG_DIR: operationsLogDirectory,
  };

  closeSync(openSync(databasePath, "a"));
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  run(process.execPath, [prismaCli, "migrate", "deploy"], runtimeEnv);
  if (process.env.E2E_USE_EXISTING_BUILD !== "true" || !existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
    run(npmCommand, [...npmArgumentPrefix, "run", "build"], runtimeEnv);
  }

  const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  server = spawn(process.execPath, [nextCli, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    env: runtimeEnv,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  await waitForServer();

  const { chromium } = await import("playwright");
  const browser = await launchBrowser(chromium);
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    await desktop.addInitScript(() => {
      localStorage.setItem("enbilir-guided-help:v3:guest:tr", "1");
    });
    const page = await desktop.newPage();
    await page.goto(`${baseUrl}/tr`, { waitUntil: "domcontentloaded" });
    await page.keyboard.press("Tab");
    const firstFocus = await page.evaluate(() => document.activeElement?.getAttribute("href"));
    if (firstFocus !== "#main-content") throw new Error("Skip link is not the first keyboard target.");

    const desktopMarketScanFixture = await installTerminalApiFixtures(page);
    await page.goto(`${baseUrl}/tr/ai-piyasa-asistani?tab=terminal`, { waitUntil: "domcontentloaded" });
    await desktopMarketScanFixture.assertIntercepted("Default desktop terminal");
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(200);
    const stickyGeometry = await page.locator('nav[aria-label="AI çalışma alanı sekmeleri"]').evaluate((nav) => {
      const header = document.querySelector(".site-header-v3");
      return {
        navTop: nav.getBoundingClientRect().top,
        headerTop: header?.getBoundingClientRect().top ?? Number.NaN,
        headerBottom: header?.getBoundingClientRect().bottom ?? 0,
        headerPosition: header ? getComputedStyle(header).position : null,
      };
    });
    if (stickyGeometry.headerPosition !== "sticky" || Math.abs(stickyGeometry.headerTop) > 1) {
      throw new Error(
        `Site header is not pinned after scroll (position=${stickyGeometry.headerPosition}, top=${stickyGeometry.headerTop}).`,
      );
    }
    if (stickyGeometry.navTop + 1 < stickyGeometry.headerBottom) {
      throw new Error(`Sticky navigation overlaps the header (${stickyGeometry.navTop} < ${stickyGeometry.headerBottom}).`);
    }
    const desktopRadarTrack = page.locator(".ai-market-radar-track").first();
    await page.getByRole("button", { name: "Akışı duraklat" }).waitFor();
    await assertTickerAdvances(page, desktopRadarTrack, "Default desktop radar");
    await desktop.close();

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mobile.addInitScript(() => {
      localStorage.setItem("enbilir-guided-help:v3:guest:tr", "1");
    });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${baseUrl}/tr`, { waitUntil: "domcontentloaded" });
    const openButton = mobilePage.getByRole("button", { name: "Menüyü aç" });
    await openButton.click();
    await mobilePage.locator(".mobile-menu-close-button").click();
    await mobilePage.waitForTimeout(50);
    const returnedFocus = await mobilePage.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (returnedFocus !== "Menüyü aç") throw new Error("Mobile menu did not restore focus to its opener.");
    const overflow = await mobilePage.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    if (overflow.scrollWidth > overflow.viewportWidth + 1) {
      throw new Error(`Mobile page overflows horizontally (${overflow.scrollWidth} > ${overflow.viewportWidth}).`);
    }
    await mobile.close();

    const reducedMotion = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await reducedMotion.addInitScript(() => {
      localStorage.setItem("enbilir-guided-help:v3:guest:tr", "1");
    });
    const reducedPage = await reducedMotion.newPage();
    const reducedMarketScanFixture = await installTerminalApiFixtures(reducedPage);
    await reducedPage.goto(`${baseUrl}/tr/ai-piyasa-asistani?tab=terminal`, { waitUntil: "domcontentloaded" });
    await reducedMarketScanFixture.assertIntercepted("Reduced-motion terminal");
    const reducedRadarTrack = reducedPage.locator(".ai-market-radar-track").first();
    const animationName = await reducedRadarTrack.evaluate(
      (element) => getComputedStyle(element).animationName,
    );
    if (animationName !== "none") throw new Error(`Radar animation remains active under reduced motion: ${animationName}`);
    const startRadarButton = reducedPage.getByRole("button", { name: "Akışı başlat" });
    await startRadarButton.waitFor();
    await startRadarButton.click();
    await assertTickerAdvances(reducedPage, reducedRadarTrack, "Explicitly started reduced-motion radar");

    await reducedPage.getByRole("button", { name: "Akışı duraklat" }).click();
    await reducedPage.getByRole("button", { name: "Akışı sürdür" }).waitFor();
    await reducedPage.waitForTimeout(100);
    const pausedBefore = await readTickerFrame(reducedRadarTrack);
    await reducedPage.waitForTimeout(350);
    const pausedAfter = await readTickerFrame(reducedRadarTrack);
    if (pausedAfter.animationName !== "none") {
      throw new Error(`Paused reduced-motion radar remains animated: ${pausedAfter.animationName}`);
    }
    if (Math.abs(pausedAfter.x - pausedBefore.x) >= 0.1 || pausedAfter.transform !== pausedBefore.transform) {
      throw new Error(`Paused reduced-motion radar kept moving (${pausedBefore.transform} -> ${pausedAfter.transform}).`);
    }
    await reducedMotion.close();
  } finally {
    await browser.close();
  }
}

await main()
  .then(() => {
    console.log("Critical E2E checks passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopServer();
    rmSync(testRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });
