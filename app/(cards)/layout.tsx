import type { ReactNode } from "react";

export default function CardLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-[color:var(--ink)] text-[color:var(--cream)]">{children}</main>;
}
