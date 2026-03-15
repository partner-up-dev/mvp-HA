import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { HTTPException } from "hono/http-exception";
import type { User, UserId } from "../../../entities/user";
import { UserRepository } from "../../../repositories/UserRepository";
import { env } from "../../../lib/env";

const userRepo = new UserRepository();

const defaultAvatarsDir =
  process.platform === "win32"
    ? path.join(process.cwd(), "avatars")
    : "/mnt/oss/avatars";
const avatarsDir = env.AVATARS_DIR ?? defaultAvatarsDir;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const avatarExtensionByMimeType: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export type CurrentUserProfileSnapshot = {
  userId: UserId;
  nickname: string | null;
  avatar: string | null;
  wechatBound: boolean;
};

const requireUser = async (userId: UserId): Promise<User> => {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new HTTPException(401, { message: "Invalid authenticated user" });
  }

  if (user.status !== "ACTIVE") {
    throw new HTTPException(403, { message: "User is disabled" });
  }

  return user;
};

export const toCurrentUserProfileSnapshot = (
  user: Pick<User, "id" | "nickname" | "avatar" | "openId">,
): CurrentUserProfileSnapshot => ({
  userId: user.id,
  nickname: user.nickname,
  avatar: user.avatar,
  wechatBound: Boolean(user.openId),
});

export async function getCurrentUserProfile(
  userId: UserId,
): Promise<CurrentUserProfileSnapshot> {
  const user = await requireUser(userId);
  return toCurrentUserProfileSnapshot(user);
}

export async function updateCurrentUserNickname(
  userId: UserId,
  nickname: string,
): Promise<CurrentUserProfileSnapshot> {
  await requireUser(userId);

  const normalizedNickname = nickname.trim();
  if (normalizedNickname.length === 0) {
    throw new HTTPException(400, { message: "Nickname is required" });
  }

  const updated = await userRepo.updateNickname(userId, normalizedNickname);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update nickname" });
  }

  return toCurrentUserProfileSnapshot(updated);
}

export async function updateCurrentUserAvatar(
  userId: UserId,
  file: File,
): Promise<CurrentUserProfileSnapshot> {
  await requireUser(userId);

  const extension = avatarExtensionByMimeType[file.type];
  if (!extension) {
    throw new HTTPException(400, { message: "Unsupported avatar file type" });
  }

  if (file.size > AVATAR_MAX_BYTES) {
    throw new HTTPException(400, {
      message: "Avatar file must not exceed 2 MB",
    });
  }

  await fs.mkdir(avatarsDir, { recursive: true });

  const filename = `${uuidv4()}.${extension}`;
  const filepath = path.join(avatarsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const updated = await userRepo.updateAvatar(userId, `/api/users/avatar/${filename}`);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update avatar" });
  }

  return toCurrentUserProfileSnapshot(updated);
}

export async function bindWeChatToCurrentUser(
  userId: UserId,
  openId: string,
): Promise<CurrentUserProfileSnapshot> {
  const currentUser = await requireUser(userId);
  const normalizedOpenId = openId.trim();
  if (!normalizedOpenId) {
    throw new HTTPException(400, { message: "Invalid WeChat openid" });
  }

  if (currentUser.openId && currentUser.openId !== normalizedOpenId) {
    throw new HTTPException(409, { message: "Current user is already bound" });
  }

  const existingByOpenId = await userRepo.findByOpenId(normalizedOpenId);
  if (existingByOpenId && existingByOpenId.id !== currentUser.id) {
    throw new HTTPException(409, {
      message: "WeChat account is already bound to another user",
    });
  }

  if (currentUser.openId === normalizedOpenId) {
    return toCurrentUserProfileSnapshot(currentUser);
  }

  const updated = await userRepo.bindOpenId(currentUser.id, normalizedOpenId);
  if (!updated) {
    throw new HTTPException(500, { message: "Failed to bind WeChat account" });
  }

  return toCurrentUserProfileSnapshot(updated);
}
