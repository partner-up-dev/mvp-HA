import assert from "node:assert/strict";
import type { Page } from "playwright";
import { installDeterministicShareSidecarStubs } from "../_infra/browser/share-sidecars";
import { installScenarioUserSession } from "../_infra/browser/session";
import { withScenarioPage } from "../_infra/browser/browser";
import { scenario } from "../_infra/scenario/scenario";
import { givenUser } from "../../../apps/backend/tests/pr-core/_kit/builders/users";
import {
  probePartnerRequestCreationState,
} from "../../../apps/backend/tests/pr-core/_kit/probes/partner-requests";

type CreatePRResponse = {
  id: number;
  status: string;
  canonicalPath: string;
};

async function fillStructuredPRForm(input: {
  page: Page;
  title: string;
}): Promise<void> {
  const { page, title } = input;
  await page.getByTestId("pr-create.form.title").fill(title);
  await page.getByTestId("pr-create.form.type").fill("badminton");
  await page.getByTestId("pr-create.form.advanced-toggle").click();
  await page.getByTestId("pr-create.form.start-date").fill("2031-04-01");
  await page.getByTestId("pr-create.form.end-date").fill("2031-04-02");
  await page.getByTestId("pr-create.form.location").fill("Scenario Court");
}

scenario("pr_create_form_saves_anonymous_draft", async (ctx) => {
  await withScenarioPage(async (page) => {
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredPRForm({
      page,
      title: "System scenario draft PR creation",
    });

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/new/form") &&
        response.request().method() === "POST",
    );
    await page.getByTestId("pr-create.save-draft").click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 201);

    const created = (await createResponse.json()) as CreatePRResponse;
    assert.equal(created.status, "DRAFT");
    ctx.record("prId", created.id);

    const state = await probePartnerRequestCreationState(created.id);
    assert.equal(state.status, "DRAFT");
    assert.equal(state.createdBy, null);
  });
});

scenario("pr_create_form_publishes_authenticated_pr", async (ctx) => {
  const creator = await givenUser("system-create-publish-creator");

  await withScenarioPage(async (page) => {
    await installScenarioUserSession(page, creator);
    await installDeterministicShareSidecarStubs(page);

    await page.goto("/pr/new?mode=form");
    await fillStructuredPRForm({
      page,
      title: "System scenario published PR creation",
    });

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/pr/new/form") &&
        response.request().method() === "POST",
    );
    await page.getByTestId("pr-create.publish").click();
    const createResponse = await createResponsePromise;
    assert.equal(createResponse.status(), 201);

    const created = (await createResponse.json()) as CreatePRResponse;
    assert.equal(created.status, "OPEN");
    ctx.record("creatorUserId", creator.user.id);
    ctx.record("prId", created.id);

    const state = await probePartnerRequestCreationState(created.id);
    assert.equal(state.status, "OPEN");
    assert.equal(state.createdBy, creator.user.id);
    await page.waitForURL(`**${created.canonicalPath}?entry=create`);
  });
});
