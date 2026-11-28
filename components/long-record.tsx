"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CREEL,
  DOCK_SEASON_LABEL,
  GILL_NET,
  NET_SEASON_LABEL,
  SHARED_FISH,
  creelAt,
  creelCoastAt,
  creelSeason,
  gillNetAt,
  gillNetCoastAt,
  gillNetSeason,
  texasRecordBays,
  type DockSeasonId,
  type NetSeasonId,
  type RecordEra,
  type SharedFishId,
} from "@/lib/data/long-record";
import { briefHref, morningHref } from "@/lib/hrefs";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

type BayLink = "morning" | "home";

function bayHref(areaId: string, link: BayLink) {
  switch (link) {
    case "morning":
      return morningHref({ areaId });
    case "home":
      return briefHref({ areaId, theater: "texas" });
    default: {
      const never: never = link;
      return never;
    }
  }
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-2.5 text-xs uppercase tracking-[0.14em] md:py-1",
        active
          ? "border-[color:var(--sea)] bg-[color:var(--sea)]/20 text-[color:var(--cream)]"
          : "border-[color:var(--line)] text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]",
      )}
    >
      {children}
    </button>
  );
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="w-full text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40 sm:w-auto sm:pr-1">
        {label}
      </p>
      {children}
    </div>
  );
}

function RateBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mt-1 h-1 rounded-full bg-[color:var(--line)]" aria-hidden>
      <div
        className="h-1 rounded-full bg-[color:var(--sea)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function eraYears(kind: "nets" | "dock", block: { yearStart: number; yearEnd: number } | null) {
  if (block) return `${block.yearStart}–${block.yearEnd}`;
  return kind === "nets"
    ? `${GILL_NET.yearStart}–${GILL_NET.yearEnd}`
    : `${CREEL.yearStart}–${CREEL.yearEnd}`;
}

export function LongRecord({
  areaId,
  month,
  compact = false,
  bayLink = "home",
}: {
  areaId?: string;
  month: number;
  compact?: boolean;
  /** The letter uses the canonical morning URL. Other pages keep the home desk query. */
  bayLink?: BayLink;
}) {
  const [fish, setFish] = useState<SharedFishId>("speckled-trout");
  const [netSeason, setNetSeason] = useState<NetSeasonId>(gillNetSeason(month).id);
  const [dockSeason, setDockSeason] = useState<DockSeasonId>(creelSeason(month).id);
  const [netEra, setNetEra] = useState<RecordEra>("all");
  const [dockEra, setDockEra] = useState<RecordEra>("all");

  const fishName = SHARED_FISH.find((s) => s.id === fish)?.name ?? "Fish";
  const nets = areaId ? gillNetAt(areaId, netSeason) : null;
  const dock = areaId ? creelAt(areaId, dockSeason) : null;
  const netBlock = nets ? (netEra === "late" && nets.late ? nets.late : nets.all) : null;
  const dockBlock = dock ? (dockEra === "late" && dock.late ? dock.late : dock.all) : null;
  const netLate = nets?.late ?? null;
  const dockLate = dock?.late ?? null;

  const netCoast = useMemo(
    () => gillNetCoastAt(netSeason, netEra, fish),
    [netSeason, netEra, fish],
  );
  const dockCoast = useMemo(
    () => creelCoastAt(dockSeason, dockEra, fish),
    [dockSeason, dockEra, fish],
  );

  const controls = (
    <div className="space-y-3">
      <ChipRow label="Same fish">
        {SHARED_FISH.map((s) => (
          <Chip key={s.id} active={fish === s.id} onClick={() => setFish(s.id)}>
            {s.name}
          </Chip>
        ))}
      </ChipRow>
      <div className="grid gap-3 md:grid-cols-2">
        <ChipRow label="Nets">
          <Chip active={netSeason === "spring"} onClick={() => setNetSeason("spring")}>
            Spring
          </Chip>
          <Chip active={netSeason === "fall"} onClick={() => setNetSeason("fall")}>
            Fall
          </Chip>
          <Chip active={netEra === "all"} onClick={() => setNetEra("all")}>
            {GILL_NET.yearStart}–{GILL_NET.yearEnd}
          </Chip>
          <Chip active={netEra === "late"} onClick={() => setNetEra("late")}>
            2015–2019
          </Chip>
        </ChipRow>
        <ChipRow label="Dock">
          <Chip active={dockSeason === "high"} onClick={() => setDockSeason("high")}>
            High-use
          </Chip>
          <Chip active={dockSeason === "low"} onClick={() => setDockSeason("low")}>
            Low-use
          </Chip>
          <Chip active={dockEra === "all"} onClick={() => setDockEra("all")}>
            {CREEL.yearStart}–{CREEL.yearEnd}
          </Chip>
          <Chip active={dockEra === "late"} onClick={() => setDockEra("late")}>
            2019–2023
          </Chip>
        </ChipRow>
      </div>
    </div>
  );

  if (nets && dock && netBlock && dockBlock) {
    const netRows = compact ? netBlock.species.slice(0, 3) : netBlock.species;
    const dockRows = compact ? dockBlock.species.slice(0, 3) : dockBlock.species;
    const netFish = netBlock.species.find((s) => s.id === fish);
    const dockFish = dockBlock.species.find((s) => s.id === fish);
    const netFishLate = netLate?.species.find((s) => s.id === fish);
    const dockFishLate = dockLate?.species.find((s) => s.id === fish);
    const shownNet = netRows.some((s) => s.id === fish) || !netFish ? netRows : [netFish, ...netRows.slice(0, 2)];
    const shownDock =
      dockRows.some((s) => s.id === fish) || !dockFish ? dockRows : [dockFish, ...dockRows.slice(0, 2)];

    return (
      <div className="space-y-4">
        {controls}
        <article className="rounded-3xl border border-[color:var(--sea)]/35 bg-[color:var(--panel)] p-5">
          <p className="kicker text-[color:var(--copper)]">
            Same fish · {nets.bay.system} · {fishName}
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-heading text-3xl text-[color:var(--cream)]">
                {netFish ? netFish.perSet.toFixed(1) : "—"}
                <span className="ml-2 font-sans text-sm uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  / set
                </span>
              </p>
              <p className="mt-1 text-sm text-[color:var(--cream)]/55">
                In the nets. {netFish ? `${netFish.pctSets.toFixed(0)}% of sets had one.` : "Not in this file."}
              </p>
            </div>
            <div>
              <p className="font-heading text-3xl text-[color:var(--cream)]">
                {dockFish ? dockFish.perInterview.toFixed(1) : "—"}
                <span className="ml-2 font-sans text-sm uppercase tracking-[0.14em] text-[color:var(--cream)]/40">
                  / trip
                </span>
              </p>
              <p className="mt-1 text-sm text-[color:var(--cream)]/55">
                Across the dock
                {dockFish?.meanInches != null ? ` · ${dockFish.meanInches.toFixed(1)} in` : ""}.{" "}
                {dockFish
                  ? `${dockFish.pctInterviews.toFixed(0)}% of ${fishName.toLowerCase()}-seeking parties had one.`
                  : "Not in this extract."}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-[color:var(--cream)]/55">
            Different units. The nets count what is in the water. The dock counts the fish they named, on
            the clipboard — not expanded landings.
          </p>
          {netEra === "all" && dockEra === "all" && (netFishLate || dockFishLate) && !compact ? (
            <p className="mt-2 text-sm text-[color:var(--cream)]/50">
              Late file: {netFishLate ? `${netFishLate.perSet.toFixed(1)}/set` : "—"} ·{" "}
              {dockFishLate ? `${dockFishLate.perInterview.toFixed(1)}/trip` : "—"}. Flip the years to put
              that file in the tables.
            </p>
          ) : null}
        </article>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
            <p className="kicker text-[color:var(--copper)]">
              Long record · {nets.bay.system} · gill nets
            </p>
            <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)] md:text-3xl">
              {fmt(netBlock.fish)} fish in {fmt(netBlock.sets)} overnight sets
            </h2>
            <p className="mt-2 text-sm text-[color:var(--cream)]/60">
              {NET_SEASON_LABEL[netSeason]} {eraYears("nets", netBlock)}. Random shoreline grids in this
              bay system — not a mark on your map. {nets.note}
            </p>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40">
                  <th className="pb-2 font-normal">In the nets</th>
                  <th className="pb-2 text-right font-normal">Per set</th>
                  <th className="hidden pb-2 text-right font-normal sm:table-cell">Counted</th>
                  <th className="pb-2 text-right font-normal">Sets</th>
                </tr>
              </thead>
              <tbody>
                {shownNet.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-t border-[color:var(--line)]",
                      s.id === fish && "bg-[color:var(--sea)]/10",
                    )}
                  >
                    <td className="py-2 font-heading text-lg text-[color:var(--cream)]">{s.name}</td>
                    <td className="py-2 text-right font-mono text-[color:var(--cream)]">
                      {s.perSet.toFixed(1)}
                    </td>
                    <td className="hidden py-2 text-right font-mono text-[color:var(--cream)]/70 sm:table-cell">
                      {fmt(s.catch)}
                    </td>
                    <td className="py-2 text-right text-[color:var(--cream)]/70">{s.pctSets.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-[color:var(--cream)]/45">{GILL_NET.cadence}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a
                className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                href={GILL_NET.href}
                target="_blank"
                rel="noreferrer"
              >
                BCO-DMO {GILL_NET.yearStart}–{GILL_NET.yearEnd}
              </a>
              <a
                className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                href="mailto:cfish@tpwd.texas.gov"
              >
                Ask TPWD for years after {GILL_NET.yearEnd}
              </a>
            </p>
          </article>

          <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
            <p className="kicker text-[color:var(--copper)]">
              Long record · {dock.bay.system} · dock counts
            </p>
            <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)] md:text-3xl">
              {fmt(dockBlock.fish)} fish on {fmt(dockBlock.interviews)} interviews
            </h2>
            <p className="mt-2 text-sm text-[color:var(--cream)]/60">
              {DOCK_SEASON_LABEL[dockSeason]} {eraYears("dock", dockBlock)}. Public ramps and wet slips
              in this bay system — the bay they launched from, not a honey hole. {dock.note}
            </p>
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--cream)]/40">
                  <th className="pb-2 font-normal">Across the dock</th>
                  <th className="pb-2 text-right font-normal">Per trip</th>
                  <th className="hidden pb-2 text-right font-normal sm:table-cell">Counted</th>
                  <th className="pb-2 text-right font-normal">With fish</th>
                </tr>
              </thead>
              <tbody>
                {shownDock.map((s) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-t border-[color:var(--line)]",
                      s.id === fish && "bg-[color:var(--sea)]/10",
                    )}
                  >
                    <td className="py-2 font-heading text-lg text-[color:var(--cream)]">
                      {s.name}
                      {s.water === "gulf" ? (
                        <span className="ml-2 text-xs font-sans uppercase tracking-[0.12em] text-[color:var(--cream)]/40">
                          gulf
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right font-mono text-[color:var(--cream)]">
                      {s.perInterview.toFixed(1)}
                    </td>
                    <td className="hidden py-2 text-right font-mono text-[color:var(--cream)]/70 sm:table-cell">
                      {fmt(s.catch)}
                    </td>
                    <td className="py-2 text-right text-[color:var(--cream)]/70">
                      {s.pctInterviews.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-[color:var(--cream)]/45">{CREEL.cadence}</p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a
                className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                href={CREEL.href}
                target="_blank"
                rel="noreferrer"
              >
                PLOS One {CREEL.yearStart}–{CREEL.yearEnd}
              </a>
              <a
                className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                href={CREEL.program}
                target="_blank"
                rel="noreferrer"
              >
                How the creel works
              </a>
              <a
                className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                href="mailto:cfish@tpwd.texas.gov"
              >
                Ask TPWD for expanded landings
              </a>
            </p>
          </article>
        </div>

        <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {texasRecordBays().map((bay) =>
              bay.id === areaId ? (
                <span key={bay.id} className="text-[color:var(--cream)]/45">
                  {bay.system}
                </span>
              ) : (
                <a
                  key={bay.id}
                  className="text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40 underline-offset-4"
                  href={bayHref(bay.id, bayLink)}
                >
                  {bay.system}
                </a>
              ),
            )}
          </p>
      </div>
    );
  }

  const netMax = Math.max(...netCoast.map((r) => r.rate), 0);
  const dockMax = Math.max(...dockCoast.map((r) => r.rate), 0);

  return (
    <div className="space-y-4">
      {controls}
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="kicker text-[color:var(--copper)]">
            Long record · Texas gill nets
          </p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">
            {fishName} per overnight set
          </h2>
          <p className="mt-2 text-sm text-[color:var(--cream)]/60">
            {NET_SEASON_LABEL[netSeason]} Public file {eraYears("nets", null)}. Where is the bay
            system, not a GPS mark. Tap a bay to open that water.
          </p>
          <ul className="mt-4 divide-y divide-[color:var(--line)]">
            {netCoast.map((row) => (
              <li key={row.id} className="py-2">
                <a
                  href={bayHref(row.id, bayLink)}
                  className="flex items-baseline justify-between gap-3 text-[color:var(--cream)] hover:text-[color:var(--sea)]"
                >
                  <p className="font-heading text-lg">{row.system}</p>
                  <p className="font-mono text-sm">
                    {row.rate.toFixed(1)}{" "}
                    <span className="text-[color:var(--cream)]/40">/ set · {fmt(row.fish)} fish</span>
                  </p>
                </a>
                <RateBar value={row.rate} max={netMax} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[color:var(--cream)]/45">{GILL_NET.cadence}</p>
        </article>

        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="kicker text-[color:var(--copper)]">
            Long record · Texas dock counts
          </p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">
            {fishName} per interview
          </h2>
          <p className="mt-2 text-sm text-[color:var(--cream)]/60">
            {DOCK_SEASON_LABEL[dockSeason]} Parties that said they were fishing for {fishName.toLowerCase()}.
            Observed harvest on the clipboard — not expanded landings.
          </p>
          <ul className="mt-4 divide-y divide-[color:var(--line)]">
            {dockCoast.map((row) => (
              <li key={row.id} className="py-2">
                <a
                  href={bayHref(row.id, bayLink)}
                  className="flex items-baseline justify-between gap-3 text-[color:var(--cream)] hover:text-[color:var(--sea)]"
                >
                  <p className="font-heading text-lg">{row.system}</p>
                  <p className="font-mono text-sm">
                    {row.rate.toFixed(1)}{" "}
                    <span className="text-[color:var(--cream)]/40">/ trip · {fmt(row.fish)} fish</span>
                  </p>
                </a>
                <RateBar value={row.rate} max={dockMax} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[color:var(--cream)]/45">{CREEL.cadence}</p>
        </article>
      </div>
    </div>
  );
}
