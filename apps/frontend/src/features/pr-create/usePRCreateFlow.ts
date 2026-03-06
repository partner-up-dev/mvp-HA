import { nextTick, ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import type {
  PartnerRequestFields,
} from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useCreatePRFromStructured } from "@/queries/useCreatePR";
import { usePublishPR } from "@/queries/usePublishPR";
import { useUserSessionStore } from "@/stores/userSessionStore";
import { trackEvent } from "@/shared/analytics/track";
import PRForm from "@/components/pr/PRForm.vue";
import { ensureAuthSessionBootstrapped } from "@/composables/useAuthSessionBootstrap";

export type CreateSubmissionMode = "DRAFT" | "PUBLISH";

const resolveTopic = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildInitialFields = (topic: string | null): PartnerRequestFields => ({
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

export const usePRCreateFlow = () => {
  const router = useRouter();
  const route = useRoute();
  const userSessionStore = useUserSessionStore();
  const createMutation = useCreatePRFromStructured();
  const publishMutation = usePublishPR();

  const initialFields = ref<PartnerRequestFields>(
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
      fields,
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
      await router.push(`/pr/${result.id}?entry=create`);
      return;
    }

    await router.push(`/pr/${result.id}`);
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
