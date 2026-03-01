import fs from "node:fs";
import path from "node:path";
import playwrightPkg from "file:///C:/Users/lenovo/.codex/skills/develop-web-game/node_modules/playwright/index.js";

const { chromium } = playwrightPkg;
const outDir = "output/web-game/bug-emails-smoke";
fs.mkdirSync(outDir, { recursive: true });

const errors = [];
const result = {
  fullWidthCommandOpenedMailbox: false,
  postMessageInputUnlocked: false,
  finalInputDisabled: null
};

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"],
});

try {
  const page = await browser.newPage();
  page.on("pageerror", (err) => errors.push({ type: "pageerror", text: String(err) }));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console.error", text: msg.text() });
    }
  });

  await page.goto("http://localhost:8000", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: path.join(outDir, "01-mailbox-boot.png"), fullPage: true });

  const emailItems = page.locator("#email-list .email-item");
  const count = await emailItems.count();
  for (let i = 0; i < count; i += 1) {
    await emailItems.nth(i).click({ timeout: 3000 });
    await page.waitForTimeout(150);
  }

  const cmdInput = page.locator("#connect-command");
  await cmdInput.waitFor({ state: "visible", timeout: 8000 });
  await cmdInput.fill("connect --standard");
  await cmdInput.press("Enter");

  await page.waitForFunction(() => {
    const app = document.getElementById("app-container");
    const mailbox = document.getElementById("mailbox-container");
    return !!app && !app.classList.contains("hidden") && !!mailbox && mailbox.classList.contains("hidden");
  }, { timeout: 15000 });

  await page.waitForSelector("#user-input", { timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "02-game-ready.png"), fullPage: true });

  const userInput = page.locator("#user-input");
  await userInput.fill("\uFF0Femails");
  await userInput.press("Enter");

  await page.waitForFunction(() => {
    const mailbox = document.getElementById("mailbox-container");
    return !!mailbox && !mailbox.classList.contains("hidden");
  }, { timeout: 8000 });
  result.fullWidthCommandOpenedMailbox = true;

  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, "03-mailbox-opened-by-fullwidth.png"), fullPage: true });

  const closeBtn = page.locator("#connect-btn");
  await closeBtn.waitFor({ state: "visible", timeout: 5000 });
  await closeBtn.click();

  await page.waitForFunction(() => {
    const mailbox = document.getElementById("mailbox-container");
    return !!mailbox && mailbox.classList.contains("hidden");
  }, { timeout: 8000 });

  await page.waitForTimeout(350);
  await userInput.fill("test input after emails command");
  await userInput.press("Enter");

  await page.waitForFunction(() => {
    const input = document.getElementById("user-input");
    return !!input && !input.disabled;
  }, { timeout: 12000 });

  result.postMessageInputUnlocked = true;
  result.finalInputDisabled = await page.$eval("#user-input", (el) => el.disabled);

  await page.screenshot({ path: path.join(outDir, "04-post-message.png"), fullPage: true });
} finally {
  await browser.close();
}

fs.writeFileSync(path.join(outDir, "errors.json"), JSON.stringify(errors, null, 2));
fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2));
const actionableErrors = errors.filter((err) => !String(err.text || "").includes("501 (Unsupported method ('POST'))"));
fs.writeFileSync(path.join(outDir, "actionable-errors.json"), JSON.stringify(actionableErrors, null, 2));

if (actionableErrors.length > 0 || !result.fullWidthCommandOpenedMailbox || !result.postMessageInputUnlocked) {
  process.exit(1);
}
