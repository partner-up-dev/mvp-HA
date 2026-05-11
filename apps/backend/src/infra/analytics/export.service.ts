import {
  getColdStartAnalyticsSummary,
  type ColdStartAnalyticsEventCount,
} from "./queries";

export type ColdStartAnalyticsExportRow = ColdStartAnalyticsEventCount & {
  startAt: string;
  endAt: string;
};

export async function exportColdStartAnalyticsRows(input: {
  startAt?: Date;
  endAt?: Date;
} = {}): Promise<ColdStartAnalyticsExportRow[]> {
  const summary = await getColdStartAnalyticsSummary(input);
  return summary.events.map((event) => ({
    ...event,
    startAt: summary.startAt,
    endAt: summary.endAt,
  }));
}
