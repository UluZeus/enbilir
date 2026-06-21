import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.VISUAL_QA_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), "artifacts", "visual-qa");
const navigationTimeoutMs = Number(process.env.VISUAL_QA_NAV_TIMEOUT_MS ?? 15_000);
const settleDelayMs = Number(process.env.VISUAL_QA_SETTLE_DELAY_MS ?? 12_000);
const shouldUseDevLogin = process.env.VISUAL_QA_SKIP_DEV_LOGIN !== "true";
const routes = [
  "/tr",
  "/tr/ai-piyasa-asistani",
  "/tr/ai-piyasa-asistani/raporlar",
  "/tr/ligler",
  "/tr/islem-yap",
  "/tr/panel",
];
const viewports = [
  { name: "desktop", width: 1440, height: 1200 },
  { name: "mobile", width: 390, height: 1200 },
];

async function main() {
  let chromium;

  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright is not installed. Run `npm install -D playwright` before visual QA.");
    process.exit(1);
  }

  await mkdir(outputDir, { recursive: true });
  const browser = await launchBrowser(chromium);
  let failures = 0;

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });

      if (shouldUseDevLogin) {
        const loginPage = await context.newPage();
        try {
          await loginPage.goto(`${baseUrl}/api/auth/dev-login?locale=tr&returnTo=/tr/panel`, {
            waitUntil: "commit",
            timeout: navigationTimeoutMs,
          });
          await loginPage.waitForTimeout(700);
        } catch (error) {
          console.warn(`Dev login failed for ${viewport.name}: ${error instanceof Error ? error.message : "unknown error"}`);
        } finally {
          await loginPage.close();
        }
      }

      for (const route of routes) {
        const page = await context.newPage();
        const url = `${baseUrl}${route}`;
        const safeName = route.replaceAll("/", "_").replace(/^_/, "") || "home";

        try {
          page.setDefaultNavigationTimeout(navigationTimeoutMs);
          await page.goto(url, { waitUntil: "commit", timeout: navigationTimeoutMs });
          await page.waitForFunction(
            () => !document.body.innerText.toLocaleUpperCase("tr-TR").includes("YÜKLENİYOR"),
            { timeout: settleDelayMs },
          ).catch(() => undefined);
          await page.waitForTimeout(800);
          await page.screenshot({
            path: path.join(outputDir, `${viewport.name}-${safeName}.png`),
            fullPage: true,
          });
          console.log(`Captured ${viewport.name} ${route}`);
        } catch (error) {
          failures += 1;
          console.error(`Failed ${viewport.name} ${route}: ${error instanceof Error ? error.message : "unknown error"}`);
        } finally {
          await page.close();
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(`Visual QA screenshots saved to ${outputDir}`);

  if (failures > 0) {
    throw new Error(`Visual QA finished with ${failures} failed capture(s).`);
  }
}

async function launchBrowser(chromium) {
  const preferredChannel = process.env.VISUAL_QA_BROWSER_CHANNEL;
  const channels = preferredChannel
    ? [preferredChannel]
    : process.platform === "win32"
      ? ["msedge", "chrome"]
      : ["chrome"];

  try {
    return await chromium.launch();
  } catch (error) {
    console.warn(`Bundled Playwright Chromium is unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  for (const channel of channels) {
    try {
      return await chromium.launch({ channel });
    } catch (error) {
      console.warn(`System browser channel '${channel}' is unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  throw new Error("No usable browser found. Install Playwright browsers or set VISUAL_QA_BROWSER_CHANNEL to an installed Chrome/Edge channel.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
