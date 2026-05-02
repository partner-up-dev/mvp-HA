import { HTTPException } from "hono/http-exception";
import type {
  AnchorEvent,
  AnchorEventSupportResource,
  PRId,
  PRJoinGateConfig,
  PRJoinGateConfigItem,
  PRJoinGateSource,
  UserId,
} from "../../../entities";
import {
  normalizePRJoinGateConfig,
  prBookingContactGateConfigSchema,
  prJoinNoticeGateConfigSchema,
} from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRBookingContactRepository } from "../../../repositories/PRBookingContactRepository";
import { PRJoinNoticeAcceptanceRepository } from "../../../repositories/PRJoinNoticeAcceptanceRepository";
import { ProblemDetailsError } from "../../../lib/problem-details";
import { normalizeMainlandChinaMobilePhone } from "../../pr-booking-support";
import type { TimeWindow } from "./time-window.service";

const prRepo = new PartnerRequestRepository();
const bookingContactRepo = new PRBookingContactRepository();
const noticeAcceptanceRepo = new PRJoinNoticeAcceptanceRepository();

export const PR_JOIN_GATE_UNRESOLVED_CODE = "PR_JOIN_GATE_UNRESOLVED";
export const BOOKING_CONTACT_PHONE_REQUIRED_CODE =
  "BOOKING_CONTACT_PHONE_REQUIRED";
export const BOOKING_CONTACT_PHONE_INVALID_CODE =
  "BOOKING_CONTACT_PHONE_INVALID";
export const JOIN_GATE_NOT_FOUND_CODE = "PR_JOIN_GATE_NOT_FOUND";
export const JOIN_NOTICE_ACCEPTANCE_REQUIRED_CODE =
  "JOIN_NOTICE_ACCEPTANCE_REQUIRED";
export const BOOKING_CONTACT_ALREADY_RESOLVED_CODE =
  "BOOKING_CONTACT_ALREADY_RESOLVED";

export type PRJoinGateProjectionItem =
  | {
      key: string;
      kind: "JOIN_NOTICE";
      version: string;
      title: string;
      body: string;
      resolved: boolean;
    }
  | {
      key: string;
      kind: "BOOKING_CONTACT";
      version: string;
      title: string;
      prompt: string;
      resolved: boolean;
    }
  | {
      key: "system:fallback-confirm";
      kind: "FALLBACK_CONFIRM";
      version: "1";
      title: string;
      prompt: string;
      resolved: false;
    };

export type PRJoinGateProjection = {
  gates: PRJoinGateProjectionItem[];
};

export type ResolveJoinGatePayload =
  | {
      kind: "JOIN_NOTICE";
      version: string;
      accepted: true;
    }
  | {
      kind: "BOOKING_CONTACT";
      version: string;
      phone: string;
    };

const fallbackConfirmGate = (): PRJoinGateProjectionItem => ({
  key: "system:fallback-confirm",
  kind: "FALLBACK_CONFIRM",
  version: "1",
  title: "确认加入",
  prompt: "确认加入当前活动？",
  resolved: false,
});

const withSource = (
  gates: PRJoinGateConfig,
  source: PRJoinGateSource,
): PRJoinGateConfig => {
  const sourcedGates: PRJoinGateConfig = [];
  for (const gate of gates) {
    if (gate.kind === "BOOKING_CONTACT") {
      if (source === "ANCHOR_EVENT") {
        continue;
      }
      sourcedGates.push({
        ...gate,
        source,
      });
      continue;
    }

    sourcedGates.push({
      ...gate,
      source,
    });
  }
  return sourcedGates;
};

const dedupeGateConfig = (gates: PRJoinGateConfig): PRJoinGateConfig => {
  const byIdentity = new Map<string, PRJoinGateConfigItem>();
  for (const gate of gates) {
    byIdentity.set(`${gate.kind}:${gate.source}:${gate.key}`, gate);
  }
  return Array.from(byIdentity.values());
};

const matchesLocation = (
  resource: AnchorEventSupportResource,
  location: string | null,
): boolean => {
  if (resource.appliesToAllLocations) return true;
  if (!location) return false;
  return resource.locationIds.includes(location);
};

export const buildMaterializedPRJoinGateConfig = (input: {
  event?: AnchorEvent | null;
  resources?: AnchorEventSupportResource[];
  location: string | null;
  timeWindow: TimeWindow;
  prGates?: PRJoinGateConfig;
}): PRJoinGateConfig => {
  const eventGates = input.event
    ? withSource(
        normalizePRJoinGateConfig(input.event.joinGateConfig),
        "ANCHOR_EVENT",
      )
    : [];
  const resourceGates = (input.resources ?? [])
    .filter((resource) => matchesLocation(resource, input.location))
    .flatMap((resource) =>
      withSource(
        normalizePRJoinGateConfig(resource.joinGateConfig),
        "PR_SUPPORT_RESOURCE",
      ),
    );
  const prGates = withSource(
    normalizePRJoinGateConfig(input.prGates ?? []),
    "PR",
  );

  return dedupeGateConfig([...eventGates, ...resourceGates, ...prGates]);
};

export const hasBookingContactJoinGate = (
  config: PRJoinGateConfig | null | undefined,
): boolean =>
  normalizePRJoinGateConfig(config).some(
    (gate) => gate.kind === "BOOKING_CONTACT",
  );

const getGateByKey = (
  config: PRJoinGateConfig,
  gateKey: string,
): PRJoinGateConfigItem | null =>
  config.find((gate) => gate.key === gateKey) ?? null;

const isBookingContactGateResolved = async (
  prId: PRId,
  viewerUserId: UserId | null,
): Promise<boolean> => {
  const contact = await bookingContactRepo.findByPrId(prId);
  if (!contact) return false;
  if (contact.ownerPartnerId !== null) return true;
  return Boolean(viewerUserId && contact.ownerUserId === viewerUserId);
};

const isJoinNoticeGateResolved = async (input: {
  prId: PRId;
  viewerUserId: UserId | null;
  gateKey: string;
  gateVersion: string;
}): Promise<boolean> => {
  if (!input.viewerUserId) return false;
  const acceptance = await noticeAcceptanceRepo.find({
    prId: input.prId,
    userId: input.viewerUserId,
    gateKey: input.gateKey,
    gateVersion: input.gateVersion,
  });
  return acceptance !== null;
};

export const getPRJoinGateProjection = async (input: {
  prId: PRId;
  viewerUserId: UserId | null;
}): Promise<PRJoinGateProjection> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const config = normalizePRJoinGateConfig(request.joinGateConfig);
  if (config.length === 0) {
    return {
      gates: [fallbackConfirmGate()],
    };
  }

  const gates = await Promise.all(
    config.map(async (gate): Promise<PRJoinGateProjectionItem> => {
      if (gate.kind === "BOOKING_CONTACT") {
        return {
          key: gate.key,
          kind: gate.kind,
          version: gate.version,
          title: gate.title,
          prompt: gate.prompt,
          resolved: await isBookingContactGateResolved(
            input.prId,
            input.viewerUserId,
          ),
        };
      }

      return {
        key: gate.key,
        kind: gate.kind,
        version: gate.version,
        title: gate.title,
        body: gate.body,
        resolved: await isJoinNoticeGateResolved({
          prId: input.prId,
          viewerUserId: input.viewerUserId,
          gateKey: gate.key,
          gateVersion: gate.version,
        }),
      };
    }),
  );

  return { gates };
};

export const assertPRJoinGatesResolvedForUser = async (input: {
  prId: PRId;
  userId: UserId;
}): Promise<void> => {
  const projection = await getPRJoinGateProjection({
    prId: input.prId,
    viewerUserId: input.userId,
  });
  const unresolvedCustomGate = projection.gates.find(
    (gate) => gate.kind !== "FALLBACK_CONFIRM" && !gate.resolved,
  );

  if (!unresolvedCustomGate) {
    return;
  }

  throw new ProblemDetailsError({
    status: 400,
    type: "https://partner-up.app/problems/pr.join_gate.unresolved",
    code: PR_JOIN_GATE_UNRESOLVED_CODE,
    localizedText: {
      zhCN: {
        title: "请先完成加入前置项",
        detail: "加入前需要先完成加入须知或联系人信息。",
      },
      enUS: {
        title: "Join prerequisites required",
        detail:
          "Please complete the join notice or contact information before joining.",
      },
    },
  });
};

const throwCodedHttpException = (
  status: 400 | 403 | 404 | 409,
  message: string,
  code: string,
): never => {
  const error = new HTTPException(status, { message }) as HTTPException & {
    code?: string;
  };
  error.code = code;
  throw error;
};

export const resolvePRJoinGate = async (input: {
  prId: PRId;
  gateKey: string;
  viewerUserId: UserId;
  payload: ResolveJoinGatePayload;
}): Promise<PRJoinGateProjection> => {
  const request = await prRepo.findById(input.prId);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const config = normalizePRJoinGateConfig(request.joinGateConfig);
  const gate = getGateByKey(config, input.gateKey);
  if (!gate) {
    return throwCodedHttpException(
      404,
      "Join gate not found",
      JOIN_GATE_NOT_FOUND_CODE,
    );
  }

  if (gate.kind !== input.payload.kind || gate.version !== input.payload.version) {
    return throwCodedHttpException(
      400,
      "Join gate payload does not match current gate",
      JOIN_GATE_NOT_FOUND_CODE,
    );
  }

  if (gate.kind === "JOIN_NOTICE") {
    const parsed = prJoinNoticeGateConfigSchema.parse(gate);
    if (input.payload.kind !== "JOIN_NOTICE" || !input.payload.accepted) {
      return throwCodedHttpException(
        400,
        "Join notice acceptance is required",
        JOIN_NOTICE_ACCEPTANCE_REQUIRED_CODE,
      );
    }
    await noticeAcceptanceRepo.upsert({
      prId: input.prId,
      userId: input.viewerUserId,
      gateKey: parsed.key,
      gateVersion: parsed.version,
    });
  }

  if (gate.kind === "BOOKING_CONTACT") {
    prBookingContactGateConfigSchema.parse(gate);
    if (input.payload.kind !== "BOOKING_CONTACT") {
      return throwCodedHttpException(
        400,
        "Booking contact phone is required",
        BOOKING_CONTACT_PHONE_REQUIRED_CODE,
      );
    }

    const phone = input.payload.phone.trim();
    if (!phone) {
      return throwCodedHttpException(
        400,
        "Booking contact phone is required",
        BOOKING_CONTACT_PHONE_REQUIRED_CODE,
      );
    }
    const normalizedPhone = normalizeMainlandChinaMobilePhone(phone);
    if (!normalizedPhone) {
      return throwCodedHttpException(
        400,
        "Phone must match mainland China mobile format (11 digits, starts with 1)",
        BOOKING_CONTACT_PHONE_INVALID_CODE,
      );
    }

    const existing = await bookingContactRepo.findByPrId(input.prId);
    if (
      existing &&
      existing.ownerPartnerId !== null &&
      existing.ownerUserId !== input.viewerUserId
    ) {
      return throwCodedHttpException(
        409,
        "Booking contact is already resolved",
        BOOKING_CONTACT_ALREADY_RESOLVED_CODE,
      );
    }

    await bookingContactRepo.upsertByPrId({
      prId: input.prId,
      ownerPartnerId: existing?.ownerPartnerId ?? null,
      ownerUserId: input.viewerUserId,
      phoneE164: normalizedPhone.phoneE164,
      phoneMasked: normalizedPhone.phoneMasked,
      verifiedSource: "PHONE_INPUT_FORM",
    });
  }

  return await getPRJoinGateProjection({
    prId: input.prId,
    viewerUserId: input.viewerUserId,
  });
};
