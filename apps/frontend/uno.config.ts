import { defineConfig, presetIcons } from "unocss";
import partnerUpDesignPreset from "./src/styles/unocss-preset";

export default defineConfig({
  presets: [
    partnerUpDesignPreset() as any,
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
});
