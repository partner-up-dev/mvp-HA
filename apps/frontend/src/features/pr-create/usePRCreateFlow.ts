import { nextTick, ref } from "vue";
import { useRoute, useRouter, type LocationQueryValue } from "vue-router";
import type {
  CreatePRStructuredStatus,
  PartnerRequestFields,
  PRId,
} from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useCreatePRFromStructured } from "@/queries/useCreatePR";
import { useUserPRStore } from "@/stores/userPRStore";
import { trackEvent } from "@/shared/analytics/track";
import PRForm from "@/components/pr/PRForm.vue";

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
  const userPRStore = useUserPRStore();
  const createMutation = useCreatePRFromStructured();

  const initialFields = ref<PartnerRequestFields>(
    buildInitialFields(resolveTopic(route.query.topic)),
  );

  const formRef = ref<InstanceType<typeof PRForm> | null>(null);
  const pendingStatus = ref<CreatePRStructuredStatus>("OPEN");
  const createdPrId = ref<PRId | null>(null);

  const submitAs = (status: CreatePRStructuredStatus) => {
    pendingStatus.value = status;
    formRef.value?.submitForm();
  };

  const handleSubmit = async ({ fields, pin }: PartnerRequestFormInput) => {
    const result = await createMutation.mutateAsync({
      fields,
      pin,
      status: pendingStatus.value,
    });

    createdPrId.value = result.id;
    await nextTick();
    userPRStore.addCreatedPR(result.id);
    trackEvent("pr_create_success", {
      prId: result.id,
      status: pendingStatus.value,
    });
    await router.push(`/pr/${result.id}`);
  };

  const goHome = () => {
    router.push("/");
  };

  return {
    createMutation,
    initialFields,
    formRef,
    pendingStatus,
    createdPrId,
    submitAs,
    handleSubmit,
    goHome,
  };
};
