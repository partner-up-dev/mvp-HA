import type { UserId } from "../../../entities/user";
import { PoiRepository } from "../../../repositories/PoiRepository";
import { toPoiApplicationView } from "../services/poi-application";

const poiRepo = new PoiRepository();

export async function listMyPoiApplications(userId: UserId) {
  const pois = await poiRepo.findBySubmitter(userId);
  return pois.map(toPoiApplicationView);
}
