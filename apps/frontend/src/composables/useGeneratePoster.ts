import { ref, computed, createApp, nextTick } from "vue";
import html2canvas from "html2canvas";
import PosterTemplate from "@/components/PosterTemplate.vue";
import type { PosterData } from "@/lib/poster-types";

/**
 * HTML-to-image poster generation for Xiaohongshu
 * Creates styled posters using Vue templates and CSS
 */
export const useGeneratePoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generatePoster = async (caption: string, style = 0): Promise<Blob> => {
    isGenerating.value = true;

    try {
      // Prepare poster data
      const posterData: PosterData = {
        caption,
        style,
      };

      // Create a temporary container for rendering
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.top = "-10000px";
      tempContainer.style.left = "-10000px";
      tempContainer.style.pointerEvents = "none";
      document.body.appendChild(tempContainer);

      // Create Vue app instance with poster template
      const app = createApp(PosterTemplate, { data: posterData });

      // Mount the component
      const vm = app.mount(tempContainer);

      // Wait for Vue to render
      await nextTick();

      // Get the poster element
      const posterElement = (vm as any).posterElement;
      if (!posterElement) {
        throw new Error("Failed to get poster element");
      }

      // Configure html2canvas options for high quality
      const canvas = await html2canvas(posterElement, {
        width: 540,
        height: 720,
        scale: 2, // Higher DPI for better quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded in cloned document
          const clonedElement = clonedDoc.querySelector(".poster-template");
          if (clonedElement) {
            (clonedElement as HTMLElement).style.setProperty(
              "font-display",
              "block",
            );
          }
        },
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert canvas to blob"));
            } else {
              resolve(blob);
            }
          },
          "image/png",
          0.95,
        );
      });

      // Update poster URL for preview
      if (posterUrl.value) {
        URL.revokeObjectURL(posterUrl.value);
      }
      posterUrl.value = URL.createObjectURL(blob);

      // Cleanup
      app.unmount();
      document.body.removeChild(tempContainer);

      return blob;
    } catch (error) {
      console.error("Failed to generate poster:", error);
      throw new Error(
        `Poster generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      isGenerating.value = false;
    }
  };

  const clearPoster = () => {
    if (posterUrl.value) {
      URL.revokeObjectURL(posterUrl.value);
    }
    posterUrl.value = null;
  };

  return {
    generatePoster,
    clearPoster,
    isGenerating: computed(() => isGenerating.value),
    posterUrl: computed(() => posterUrl.value),
  };
};
