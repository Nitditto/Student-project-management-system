import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const frontendUrl = 'http://localhost:5173';
const outputDir = 'd:\\CODING\\Student-project-management-system\\images';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("Launching Microsoft Edge for Chat and Notifications...");
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const page = await browser.newPage();

  async function login(email, password, role) {
    console.log(`Logging in as ${role} (${email})...`);
    await page.goto(`${frontendUrl}/login`, { waitUntil: 'networkidle2' });
    await delay(1000);

    await page.select('select[name="role"]', role);
    await delay(200);

    await page.focus('input[name="email"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[name="email"]', email);
    await delay(200);

    await page.focus('input[name="password"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('input[name="password"]', password);
    await delay(200);

    await page.click('button[type="submit"]');
    await delay(3000);
  }

  async function takeScreenshot(filename) {
    const screenshotPath = path.join(outputDir, filename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved ${filename}`);
    await delay(500);
  }

  try {
    await login('laiboy001@gmail.com', 'password123', 'Student');

    // Go to student dashboard
    await page.goto(`${frontendUrl}/student`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Chat Widget
    console.log("Capturing Chat Widget...");
    try {
      await page.waitForSelector('button.bg-blue-600', { timeout: 5000 });
      await page.click('button.bg-blue-600');
      await delay(1000);

      // Check if we can open a chat
      const partnerBtn = await page.$('div.overflow-y-auto button');
      if (partnerBtn) {
        await partnerBtn.click();
        await delay(1000);
      }
      await takeScreenshot('chat_widget_ui.png');
      
      // Click close button
      await page.click('div.bg-blue-600.text-white.p-4 button:last-child');
      await delay(500);
    } catch (chatErr) {
      console.error("Chat capture failed:", chatErr.message);
    }

    // Refresh page to reset layout
    await page.goto(`${frontendUrl}/student`, { waitUntil: 'networkidle2' });
    await delay(2000);

    // Notification dropdown
    console.log("Capturing Notification Dropdown...");
    try {
      await page.waitForSelector('button[title="Notifications"]', { timeout: 5000 });
      await page.click('button[title="Notifications"]');
      await delay(1000);
      await takeScreenshot('notification_dropdown_ui.png');
    } catch (notifErr) {
      console.error("Notification capture failed:", notifErr.message);
    }

    console.log("Chat and Notification capture done.");
  } catch (error) {
    console.error("General error:", error);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main();
