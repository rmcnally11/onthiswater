import type { CSSProperties, ReactNode } from "react";
import { CHARCOAL, GREEN, HULL, PAPER, PEACH, SAND, SKY_PINK, SUN, TEAL } from "@/lib/house";

const cardVars = {
  "--cream": CHARCOAL,
  "--ink": PAPER,
  "--copper": HULL,
  "--sea": TEAL,
  "--gold": SUN,
  "--panel": "#F8F3E8",
  "--line": "rgba(74, 71, 66, 0.16)",
} as CSSProperties;

export function HouseCardFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(165deg, ${SKY_PINK} 0%, ${PEACH} 22%, ${SUN} 46%, ${TEAL} 70%, ${GREEN} 86%, ${SAND} 100%)`,
        padding: 12,
      }}
    >
      <div className="h-full rounded-xl" style={{ background: PAPER, color: CHARCOAL, ...cardVars }}>
        {children}
      </div>
    </div>
  );
}
