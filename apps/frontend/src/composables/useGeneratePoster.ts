import { ref, computed } from "vue";

/**
 * Canvas-based poster generation for Xiaohongshu
 * Creates a simple, attractive poster with the caption and logo
 */
export const useGeneratePoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generatePoster = async (caption: string): Promise<Blob> => {
    isGenerating.value = true;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      // Canvas dimensions (540x720 for mobile-friendly)
      const width = 540;
      const height = 720;
      canvas.width = width;
      canvas.height = height;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#FFF5F0");
      gradient.addColorStop(1, "#FFE4D6");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Decorative shapes
      ctx.fillStyle = "rgba(255, 107, 107, 0.1)";
      ctx.beginPath();
      ctx.arc(100, 100, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(480, 650, 60, 0, Math.PI * 2);
      ctx.fill();

      // Title
      ctx.fillStyle = "#2D2D2D";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("搭一把", width / 2, 100);

      // Subtitle
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#666666";
      ctx.fillText("找个靠谱的搭子", width / 2, 150);

      // Main caption
      ctx.font = "24px sans-serif";
      ctx.fillStyle = "#2D2D2D";
      ctx.textAlign = "center";
      ctx.lineWidth = 2;

      // Word wrap for caption
      const maxWidth = width - 60;
      const words = caption.split("");
      let lines: string[] = [];
      let currentLine = "";

      for (const char of words) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Draw caption with line breaks
      const lineHeight = 36;
      const startY = 280;
      const totalHeight = lines.length * lineHeight;
      const offsetY = (500 - totalHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + index * lineHeight + offsetY);
      });

      // Bottom call-to-action
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#FF6B6B";
      ctx.fillText("点击链接快速报名", width / 2, height - 80);

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#999999";
      ctx.fillText("扫描二维码或复制链接", width / 2, height - 40);

      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) reject(new Error("Failed to generate poster"));
            else {
              posterUrl.value = URL.createObjectURL(blob);
              resolve(blob);
            }
          },
          "image/png",
          0.95,
        );
      });
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
