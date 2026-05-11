import { HTTPException } from "hono/http-exception";
import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { operationLogService } from "../../../infra/operation-log";
import {
  normalizePoiApplicationImageUrl,
  normalizePoiApplicationTitle,
  toPoiApplicationView,
} from "../services/poi-application";

const poiRepo = new PoiRepository();

export async function submitPoiApplication(input: {
  title: string;
  imageUrl: string;
  submittedByUserId: UserId;
}) {
  const title = normalizePoiApplicationTitle(input.title);
  const imageUrl = normalizePoiApplicationImageUrl(input.imageUrl);

  const existing = await poiRepo.findByIds([title], {
    includeUnpublished: true,
  });
  if (existing.length > 0) {
    throw new HTTPException(409, { message: "POI already exists" });
  }

  const created = await poiRepo.createApplication({
    id: title,
    imageUrl,
    submittedByUserId: input.submittedByUserId,
  });
  if (!created) {
    throw new HTTPException(409, { message: "POI already exists" });
  }

  operationLogService.log({
    actorId: input.submittedByUserId,
    action: "poi.application.submit",
    aggregateType: "poi",
    aggregateId: created.id,
    detail: {
      status: created.status,
    },
  });

  return toPoiApplicationView(created);
}
