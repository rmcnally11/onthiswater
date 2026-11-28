import type { ReactNode } from "react";
import { AlmanacSubscribe } from "@/components/almanac-subscribe";

export default function MorningDeskLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AlmanacSubscribe placement="morning" className="mx-auto mt-8 max-w-3xl" />
    </>
  );
}
