import { watch, onBeforeUnmount, type Ref } from "vue";

let activeLockCount = 0;
let originalOverflow: string | null = null;

const acquireBodyScrollLock = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }

  if (activeLockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  activeLockCount += 1;
  return true;
};

const releaseBodyScrollLock = (): void => {
  if (typeof document === "undefined" || activeLockCount === 0) {
    return;
  }

  activeLockCount -= 1;

  if (activeLockCount === 0) {
    document.body.style.overflow = originalOverflow ?? "";
    originalOverflow = null;
  }
};

export const useBodyScrollLock = (locked: Ref<boolean>): void => {
  let lockAcquired = false;

  const syncLock = (shouldLock: boolean): void => {
    if (shouldLock && !lockAcquired) {
      lockAcquired = acquireBodyScrollLock();
      return;
    }

    if (!shouldLock && lockAcquired) {
      releaseBodyScrollLock();
      lockAcquired = false;
    }
  };

  watch(locked, syncLock, { immediate: true });

  onBeforeUnmount(() => {
    if (lockAcquired) {
      releaseBodyScrollLock();
      lockAcquired = false;
    }
  });
};
