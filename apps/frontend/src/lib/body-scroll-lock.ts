import { watchEffect, onBeforeUnmount, type Ref } from "vue";

export const useBodyScrollLock = (locked: Ref<boolean>): void => {
  const originalOverflow = document.body.style.overflow;

  const unlock = (): void => {
    document.body.style.overflow = originalOverflow;
  };

  watchEffect(() => {
    if (locked.value) {
      document.body.style.overflow = "hidden";
      return;
    }

    unlock();
  });

  onBeforeUnmount(() => {
    unlock();
  });
};
