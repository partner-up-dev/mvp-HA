import { nextTick, ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import type { PartnerRequestFormInput } from "@/lib/validation";
import {
  useCreateCommunityPRFromStructured,
  usePublishCommunityPR,
} from "@/queries/useCommunityPR";
import { useUserSessionStore } from "@/stores/userSessionStore";
import { trackEvent } from "@/shared/analytics/track";
import { communityPRDetailPath } from "@/entities/pr/routes";
import PRForm from "@/components/pr/PRForm.vue";
import { ensureAuthSessionBootstrapped } from "@/composables/useAuthSessionBootstrap";
import {
  toCommunityPRFields,
  type CommunityPRFormFields,
} from "@/entities/pr/types";

export type CreateSubmissionMode = "DRAFT" | "PUBLISH";

const resolveTopic = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildInitialFields = (topic: string | null): CommunityPRFormFields => ({
  title: undefined,
  type: topic ?? "",
  time: [null, null],
  location: null,
  minPartners: null,
  maxPartners: null,
  partners: [],
  budget: null,
  preferences: [],
  notes: null,
});

export const useCommunityPRCreateFlow = () => {
  const router = useRouter();
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const createMutation = useCreateCommunityPRFromStructured();
  const publishMutation = usePublishCommunityPR();

  const initialFields = ref<CommunityPRFormFields>(
    buildInitialFields(resolveTopic(route.query.topic)),
  );

  const formRef = ref<InstanceType<typeof PRForm> | null>(null);
  const pendingStatus = ref<CreateSubmissionMode>("PUBLISH");

  const submitAs = (status: CreateSubmissionMode) => {
    pendingStatus.value = status;
    formRef.value?.submitForm();
  };

  const handleSubmit = async ({ fields }: PartnerRequestFormInput) => {
    await ensureAuthSessionBootstrapped();

    const result = await createMutation.mutateAsync({
      fields: toCommunityPRFields(fields),
    });

    let createdStatus: "DRAFT" | "OPEN" = "DRAFT";
    if (pendingStatus.value === "PUBLISH") {
      const publishResult = await publishMutation.mutateAsync({ id: result.id });
      if (publishResult.auth) {
        userSessionStore.applyAuthSession(publishResult.auth);
      }
      createdStatus = "OPEN";
    }

    await nextTick();
    trackEvent("pr_create_success", {
      prId: result.id,
      status: createdStatus,
      prKind: "COMMUNITY",
      scenarioType: fields.type,
    });
    if (createdStatus === "OPEN") {
      await router.push(`${communityPRDetailPath(result.id)}?entry=create`);
      return;
    }

    await router.push(communityPRDetailPath(result.id));
  };

  const goHome = () => {
    router.push("/");
  };

  return {
    createMutation,
    publishMutation,
    initialFields,
    formRef,
    pendingStatus,
    submitAs,
    handleSubmit,
    goHome,
  };
};
