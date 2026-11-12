/** Shared paints for SVG instruments. Keep hex — SVG cannot see CSS variables. */

export const ink = "#ffffff";
export const cream = "#0b1f33";
export const copper = "#e23b3b";
export const coral = "#ff6b4a";
export const gold = "#e3b01c";
export const sea = "#1d7ec4";
export const teal = "#1ea7a0";
export const water = "#1d7ec4";

export function scoreHex(score: number) {
  if (score >= 8) return "#2dd4bf";
  if (score >= 6.5) return "#5eead4";
  if (score >= 5) return "#f0c14b";
  if (score >= 3.5) return "#ff6b4a";
  return "#e23b3b";
}

export function scoreInk(score: number) {
  if (score >= 6.5) return "#042f2e";
  if (score >= 5) return "#3a2a00";
  // Near-black so a 1–4 pip stays readable on the copper chip at small sizes.
  return "#140404";
}

export function parseTideStamp(stamp: string) {
  if (stamp.includes("T")) return new Date(stamp.endsWith("Z") ? stamp : `${stamp}Z`);
  return new Date(`${stamp.replace(" ", "T")}:00Z`);
}

export function tidePath(
  points: { x: number; y: number }[],
  width: number,
  height: number,
) {
  if (points.length < 2) return "";
  const d: string[] = [];
  points.forEach((p, i) => {
    const cmd = i === 0 ? "M" : "L";
    d.push(`${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  });
  const last = points[points.length - 1];
  const first = points[0];
  d.push(`L${last.x.toFixed(1)},${height}`);
  d.push(`L${first.x.toFixed(1)},${height}`);
  d.push("Z");
  return d.join(" ");
}

export function linePath(points: { x: number; y: number }[]) {
  if (points.length < 2) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}
