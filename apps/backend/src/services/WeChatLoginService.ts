import { randomUUID } from "crypto";
import type { UserId } from "../entities/user";
import { UserRepository } from "../repositories/UserRepository";
import { WeChatOAuthService } from "./WeChatOAuthService";

const userRepo = new UserRepository();
const oauthService = new WeChatOAuthService();

export class WeChatLoginService {
  async exchangeCodeAndEnsureUser(code: string): Promise<{ openId: string }> {
    const session = await oauthService.exchangeCodeForSession(code);
    const openId = session.openId.trim();
    if (!openId) {
      throw new Error("WeChat OAuth returned empty openid");
    }

    const existingUser = await userRepo.findByOpenId(openId);
    if (existingUser) {
      return { openId };
    }

    const profile = await oauthService.fetchUserInfo(
      session.oauthAccessToken,
      openId,
      session.scope,
    );
    const createdUser = await userRepo.createIfNotExists({
      id: this.generateUserId(),
      openId,
      status: "ACTIVE",
      nickname: profile.nickname,
      sex: profile.sex,
      avatar: profile.avatar,
    });

    if (createdUser) {
      return { openId };
    }

    const racedUser = await userRepo.findByOpenId(openId);
    if (!racedUser) {
      throw new Error("Failed to create user for WeChat OAuth login");
    }

    return { openId };
  }

  private generateUserId(): UserId {
    return `u_${randomUUID().replace(/-/g, "")}`;
  }
}
