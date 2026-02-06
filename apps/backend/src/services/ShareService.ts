import { HTTPException } from "hono/http-exception";
import type { PartnerRequestFields, PRId } from "../entities/partner-request";
import { PartnerRequestService } from "./PartnerRequestService";
import { LLMService, type PosterHtmlResponse } from "./LLMService";
import { PartnerRequestRepository } from "../repositories/PartnerRequestRepository";

const denyList: ReadonlyArray<RegExp> = [
  /<script/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /<link/i,
  /<iframe/i,
];

const assertHtmlSafe = (html: string): void => {
  for (const pattern of denyList) {
    if (pattern.test(html)) {
      throw new HTTPException(500, { message: "LLM produced unsafe HTML" });
    }
  }
};

export class ShareService {
  private prService: PartnerRequestService;
  private llmService: LLMService;
  private prRepo: PartnerRequestRepository;

  constructor() {
    this.prService = new PartnerRequestService();
    this.llmService = new LLMService();
    this.prRepo = new PartnerRequestRepository();
  }

  async generateXiaohongshuPosterHtml(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
  }): Promise<PosterHtmlResponse> {
    // Always generate HTML (poster image URL caching is handled via cache endpoints)
    const pr = await this.prService.getPR(params.prId);
    const prFields = this.toPartnerRequestFields(pr);
    const result = await this.llmService.generateXiaohongshuPosterHtml({
      pr: { ...prFields, rawText: pr.rawText },
      caption: params.caption,
      posterStylePrompt: params.posterStylePrompt,
    });

    assertHtmlSafe(result.html);

    return result;
  }

  async generateWeChatCardThumbnailHtml(params: {
    prId: PRId;
    style?: number;
  }): Promise<PosterHtmlResponse> {
    // Always generate HTML (thumbnail image URL caching is handled via cache endpoints)
    const pr = await this.prService.getPR(params.prId);
    const prFields = this.toPartnerRequestFields(pr);

    const result = await this.llmService.generateWeChatCardThumbnailHtml({
      pr: { ...prFields, rawText: pr.rawText },
      style: params.style,
    });

    assertHtmlSafe(result.html);

    return result;
  }

  async cacheXiaohongshuPoster(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
    posterUrl: string;
  }): Promise<void> {
    await this.prRepo.addXiaohongshuPoster(params.prId, {
      caption: params.caption,
      posterStylePrompt: params.posterStylePrompt,
      posterUrl: params.posterUrl,
      createdAt: new Date().toISOString(),
    });
  }

  private isRemoteUrl(url: string): boolean {
    return url.startsWith("https://") || url.startsWith("http://");
  }

  async getCachedXiaohongshuPoster(params: {
    prId: PRId;
    caption: string;
    posterStylePrompt: string;
  }): Promise<string | null> {
    const url = await this.prRepo.findXiaohongshuPoster(
      params.prId,
      params.caption,
      params.posterStylePrompt,
    );

    if (!url) return null;
    if (!this.isRemoteUrl(url)) return null;
    return url;
  }

  async cacheWechatThumbnail(params: {
    prId: PRId;
    style: number;
    posterUrl: string;
  }): Promise<void> {
    await this.prRepo.addWechatThumbnail(params.prId, {
      style: params.style,
      posterUrl: params.posterUrl,
      createdAt: new Date().toISOString(),
    });
  }

  async getCachedWechatThumbnail(params: {
    prId: PRId;
    style: number;
  }): Promise<string | null> {
    const url = await this.prRepo.findWechatThumbnail(params.prId, params.style);
    if (!url) return null;
    if (!this.isRemoteUrl(url)) return null;
    return url;
  }

  private toPartnerRequestFields(pr: {
    title?: string;
    type: string;
    time: PartnerRequestFields["time"];
    location: string | null;
    expiresAt: Date | null;
    partners: PartnerRequestFields["partners"];
    budget: string | null;
    preferences: string[];
    notes: string | null;
  }): PartnerRequestFields {
    return {
      title: pr.title ?? undefined,
      type: pr.type,
      time: pr.time,
      location: pr.location,
      expiresAt: pr.expiresAt ? pr.expiresAt.toISOString() : null,
      partners: pr.partners,
      budget: pr.budget,
      preferences: pr.preferences,
      notes: pr.notes,
    };
  }
}
