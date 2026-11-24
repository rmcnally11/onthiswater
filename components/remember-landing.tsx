"use client";

import { useLayoutEffect } from "react";
import { captureBrowserLanding } from "@/lib/signup-attribution";

/** Remember the first page in this tab so a later sign-up still has it. */
export function RememberLanding() {
  useLayoutEffect(() => {
    captureBrowserLanding();
  }, []);
  return null;
}
