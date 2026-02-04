import { defineConfig, presetIcons, presetWind } from "unocss";
import partnerUpDesignPreset from "./src/styles/unocss-preset";

export default defineConfig({
  presets: [
    partnerUpDesignPreset() as any,
    presetWind(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
});
