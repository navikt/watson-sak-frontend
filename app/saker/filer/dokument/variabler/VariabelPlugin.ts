import { createPlatePlugin } from "platejs/react";

export const VariabelPlugin = createPlatePlugin({
  key: "variabel",
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
  },
});
