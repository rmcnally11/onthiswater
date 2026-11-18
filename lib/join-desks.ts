import { desksForCoasts, isAllCoasts, letterDeskForArea, resolveElectedCoasts } from "@/lib/coasts";

/** Desks the join form opens on. Cookie and query win over the default Galveston desk. */
export function joinDesks(input: {
  coastsQuery?: string | null;
  desksQuery?: string | null;
  coastsCookie?: string | null;
  waterAreaId?: string | null;
}): string[] {
  const coasts = resolveElectedCoasts({
    coastsQuery: input.coastsQuery,
    desksQuery: input.desksQuery,
    cookie: input.coastsCookie,
  });
  if (coasts && !isAllCoasts(coasts)) return desksForCoasts(coasts);
  return [letterDeskForArea(input.waterAreaId) ?? "galveston"];
}
