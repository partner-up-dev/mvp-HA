import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import puppeteerPkg from "puppeteer";
import type { PosterDimensions } from "./HtmlPosterService";
import { env } from "@/lib/env";

export class PuppeteerRenderService {
  private browser: Browser | null = null;

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
      await page.evaluateHandle("document.fonts.ready");

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

      return screenshot as Buffer;
    } finally {
      await page.close();
    }
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      if (env.DEPLOY_TO === "aliyun_fc") {
        this.browser = await puppeteer.launch({
          args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--single-process",
            "--no-zygote",
            "--font-render-hinting=none",
          ],
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        this.browser = await puppeteerPkg.launch({
          headless: "new",
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
          ignoreHTTPSErrors: true,
        });
      }
    }
    return this.browser;
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
