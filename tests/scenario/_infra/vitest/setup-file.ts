import { afterAll } from "vitest";
import { closeScenarioBrowser } from "../browser/browser";

afterAll(async () => {
  await closeScenarioBrowser();
});
