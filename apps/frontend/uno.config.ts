import { defineConfig, presetIcons, presetWind3 } from "unocss";
import partnerUpDesignPreset from "./src/styles/unocss-preset";

export default defineConfig({
  presets: [
    partnerUpDesignPreset(),
    presetWind3(),
    presetIcons({
      extraProperties: {
        display: "inline-block",
        "vertical-align": "middle",
      },
    }),
  ],
});
