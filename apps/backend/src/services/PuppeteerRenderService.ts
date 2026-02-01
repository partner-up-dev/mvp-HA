import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import type { PosterDimensions } from "../lib/poster";

export class PuppeteerRenderService {
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  async renderHtmlToPng(
    html: string,
    dimensions: PosterDimensions,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: dimensions.width,
        height: dimensions.height,
        deviceScaleFactor: 2,
      });

      await page.setContent(html, { waitUntil: "networkidle0" });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const screenshot = await page.screenshot({
        type: "png",
        clip: {
          x: 0,
          y: 0,
          width: dimensions.width,
          height: dimensions.height,
        },
        optimizeForSpeed: false,
      });

      if (typeof screenshot === "string") {
        return Buffer.from(screenshot, "base64");
      }

      return screenshot;
    } finally {
      await page.close();
    }
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (!this.browserPromise) {
      this.browserPromise = this.launchBrowser();
    }

    this.browser = await this.browserPromise;
    this.browserPromise = null;
    return this.browser;
  }

  private async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  }
}
