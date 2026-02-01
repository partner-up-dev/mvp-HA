import { HtmlPosterService } from "./HtmlPosterService";
import { PosterStorageService } from "./PosterStorageService";
import { PuppeteerRenderService } from "./PuppeteerRenderService";

export const htmlPosterService = new HtmlPosterService();
export const posterStorageService = new PosterStorageService();
export const posterRenderService = new PuppeteerRenderService();
