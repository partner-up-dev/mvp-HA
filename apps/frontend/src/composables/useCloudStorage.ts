import { ref, readonly } from "vue";
import { API_URL, client } from "@/lib/rpc";

/**
 * Composable for uploading files to cloud storage
 * Handles poster uploads and returns download URLs
 */
export const useCloudStorage = () => {
  const isUploading = ref(false);
  const uploadError = ref<string | null>(null);

  /**
   * Upload a file/blob to the server
   * @param file - The file or blob to upload
   * @param filename - Optional filename for the upload
   * @returns Promise<string> - The download URL for the uploaded file
   */
  const uploadFile = async (
    file: File | Blob,
    filename = "file",
  ): Promise<string> => {
    isUploading.value = true;
    uploadError.value = null;

    try {
      const res = await client.api.upload.poster.$post({
        form: {
          poster: file,
        },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || `Upload failed: ${res.statusText}`);
      }

      const { key } = await res.json();

      const base = API_URL || window.location.origin;
      return new URL(`/api/upload/download/${key}`, base).toString();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      uploadError.value = errorMessage;
      throw new Error(errorMessage);
    } finally {
      isUploading.value = false;
    }
  };

  /**
   * Clear any upload errors
   */
  const clearError = () => {
    uploadError.value = null;
  };

  return {
    uploadFile,
    isUploading: readonly(isUploading),
    uploadError: readonly(uploadError),
    clearError,
  };
};
