import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { NavBusy } from "@/components/nav-busy";
import { SkipLink } from "@/components/skip-link";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <NavBusy />
      </Suspense>
      <SkipLink />
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">{children}</main>
      <SiteFooter />
    </>
  );
}
