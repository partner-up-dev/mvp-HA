import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

export type AnchorEventListResponse = InferResponseType<
  (typeof client.api.events)["$get"]
>;

export type AnchorEventListItem = AnchorEventListResponse[number];

export type AnchorEventDetailResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["$get"]
>;

export type AnchorEventDemandCardsResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["demand-cards"]["$get"]
>;

export type AnchorEventTimeWindow = AnchorEventDetailResponse["timeWindows"][number];

export type AnchorEventTimeWindowPR = AnchorEventTimeWindow["prs"][number];
