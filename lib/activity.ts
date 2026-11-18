import type { ActivityId } from "@/lib/types";

const ACTIVITIES = new Set(["wade", "skiff", "kayak", "fly", "spin", "structure", "offshore", "all"]);

export function parseActivity(raw?: string | null): ActivityId | "all" {
  if (!raw || !ACTIVITIES.has(raw)) return "all";
  return raw as ActivityId | "all";
}
