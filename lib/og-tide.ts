/** Large-summary share card. The plot keeps the 110px the card gained over the old 520 height. */
export const OG_TIDE_WIDTH = 1200;
export const OG_TIDE_HEIGHT = 630;
export const OG_TIDE_CHART_WIDTH = OG_TIDE_WIDTH - 72;
export const OG_TIDE_CHART_HEIGHT = 340 + (OG_TIDE_HEIGHT - 520);

/** HTML label offsets drawn on top of the share-card curve. */
export function ogTideLabelTop(
  kind: "y" | "H" | "L" | "day",
  at: { y?: number; fontSize: number; height: number; padB: number },
) {
  const y = at.y ?? 0;
  if (kind === "y") return y - at.fontSize * 0.6;
  if (kind === "H") return y - at.fontSize * 1.6;
  if (kind === "L") return y + 6;
  return at.height - at.padB + 4;
}
