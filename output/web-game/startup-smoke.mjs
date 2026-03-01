import fs from "node:fs";
import path from "node:path";
import playwrightPkg from "file:///C:/Users/lenovo/.codex/skills/develop-web-game/node_modules/playwright/index.js";
const { chromium } = playwrightPkg;

const outDir = "output/web-game/startup-smoke";
fs.mkdirSync(outDir, { recursive: true });

const errors = [];

function collectError(type, text) {
  errors.push({ type, text: String(text) });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (err) => collectError("pageerror", err));
  page.on("console", (msg) => {
    if (msg.type() === "error") collectError("console.error", msg.text());
  });

  await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });

  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(outDir, "mailbox.png"), fullPage: true });

  const emailItems = page.locator("#email-list .email-item");
  const count = await emailItems.count();
  for (let i = 0; i < count; i++) {
    await emailItems.nth(i).click({ timeout: 3000 });
    await sleep(180);
  }

  const commandInput = page.locator("#connect-command");
  await commandInput.waitFor({ state: "visible", timeout: 8000 });
  await commandInput.fill("connect --standard");
  await commandInput.press("Enter");

  await page.waitForFunction(() => {
    const app = document.getElementById("app-container");
    return !!app && !app.classList.contains("hidden");
  }, { timeout: 12000 });

  await page.waitForFunction(() => {
    const mailbox = document.getElementById("mailbox-container");
    return !!mailbox && mailbox.classList.contains("hidden");
  }, { timeout: 12000 });

  await page.waitForSelector("#user-input", { timeout: 5000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, "game-ui.png"), fullPage: true });

  if (errors.length) {
    fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2));
    process.exitCode = 1;
  } else {
    fs.writeFileSync(path.join(outDir, "errors.json"), "[]\n");
    process.exitCode = 0;
  }
} finally {
  await browser.close();
}
