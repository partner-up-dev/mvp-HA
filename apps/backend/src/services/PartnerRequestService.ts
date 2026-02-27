/**
 * PartnerRequestService — thin facade.
 *
 * Delegates all business logic to domain use-cases under `domains/pr-core`.
 * Kept for backward-compatibility with consumers that haven't migrated
 * to importing use-cases directly (ShareService, llm.controller,
 * wecom.controller).
 *
 * New code should import use-cases directly from `domains/pr-core`.
 */

import {
  createPRFromNaturalLanguage as createPRFromNLUseCase,
  createPRFromStructured as createPRStructuredUseCase,
  getPR as getPRUseCase,
  getPRSummariesByIds as getPRSummariesUseCase,
  updatePRStatus as updatePRStatusUseCase,
  updatePRContent as updatePRContentUseCase,
  joinPR as joinPRUseCase,
  exitPR as exitPRUseCase,
  confirmSlot as confirmSlotUseCase,
  checkIn as checkInUseCase,
} from "../domains/pr-core";
import type { PublicPR } from "../domains/pr-core";
import type {
  PartnerRequestFields,
  PRId,
  PRStatusManual,
  CreatePRStructuredStatus,
  WeekdayLabel,
} from "../entities/partner-request";

export class PartnerRequestService {
  async createPRFromNaturalLanguage(
    rawText: string,
    pin: string,
    nowIso: string,
    nowWeekday: WeekdayLabel | null,
    creatorOpenId?: string | null,
  ) {
    return createPRFromNLUseCase(
      rawText,
      pin,
      nowIso,
      nowWeekday,
      creatorOpenId,
    );
  }

  async createPRFromStructured(
    fields: PartnerRequestFields,
    pin: string,
    status: CreatePRStructuredStatus,
    creatorOpenId?: string | null,
  ) {
    return createPRStructuredUseCase(fields, pin, status, creatorOpenId);
  }

  async getPR(id: PRId, viewerOpenId?: string | null): Promise<PublicPR> {
    return getPRUseCase(id, viewerOpenId);
  }

  async getPRSummariesByIds(ids: PRId[]) {
    return getPRSummariesUseCase(ids);
  }

  async updatePRStatus(id: PRId, status: PRStatusManual, pin: string) {
    return updatePRStatusUseCase(id, status, pin);
  }

  async updatePRContent(id: PRId, fields: PartnerRequestFields, pin: string) {
    return updatePRContentUseCase(id, fields, pin);
  }

  async joinPRAsAuthenticatedUser(id: PRId, openId: string) {
    return joinPRUseCase(id, openId);
  }

  async exitPRAsAuthenticatedUser(id: PRId, openId: string) {
    return exitPRUseCase(id, openId);
  }

  async confirmPRSlot(id: PRId, openId: string) {
    return confirmSlotUseCase(id, openId);
  }

  async checkInPRSlot(
    id: PRId,
    openId: string,
    payload: { didAttend: boolean; wouldJoinAgain: boolean | null },
  ) {
    return checkInUseCase(id, openId, payload);
  }
}
