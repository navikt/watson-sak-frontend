import { createPlatePlugin } from "platejs/react";

export const VARIABEL_FLYTT_MIMETYPE = "application/x-watson-variabel";

export const VariabelPlugin = createPlatePlugin({
  key: "variabel",
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
  },
});
