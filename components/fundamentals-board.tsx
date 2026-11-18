"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { AREAS } from "@/lib/data/areas";
import { SPECIES, regulationFor } from "@/lib/data/species";
import type { TheaterId } from "@/lib/types";
import { THEATER_META } from "@/lib/data/theaters";
import { cookieValue } from "@/lib/cookie-jar";
import { COASTS_COOKIE } from "@/lib/coasts";
import { fundamentalsSelection, type FundamentalsSelection } from "@/lib/fundamentals-query";
import {
  MONTH_NAMES,
  MONTH_THEATER,
  REGION_ESSAYS,
  WATER_TYPES,
  areasForType,
  closuresThisMonth,
  peaksThisMonth,
  speciesForFilters,
  theaterLabel,
  waterTypeById,
} from "@/lib/data/fundamentals";
import { LongRecord } from "@/components/long-record";
import { MonthHeat, MonthHeatLegend } from "@/components/viz/month-heat";
import { TempBar } from "@/components/viz/temp-bar";
import { Waterline } from "@/components/viz/waterline";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const THEATERS: { id: TheaterId | "all"; label: string }[] = [
  { id: "all", label: "All coasts" },
  ...THEATER_META.map((t) => ({ id: t.id, label: t.label })),
];

function href(next: {
  theater?: string;
  type?: string;
  species?: string;
  month?: string;
}) {
  const p = new URLSearchParams();
  if (next.theater) p.set("theater", next.theater);
  if (next.type && next.type !== "all") p.set("type", next.type);
  if (next.species && next.species !== "all") p.set("species", next.species);
  if (next.month) p.set("month", next.month);
  const q = p.toString();
  return q ? `/fundamentals?${q}` : "/fundamentals";
}

function Chip({
  active,
  children,
  to,
}: {
  active: boolean;
  children: ReactNode;
  to: string;
}) {
  return (
    <a
      href={to}
      className={cn(
        "cursor-pointer rounded-full border px-3 py-2.5 text-xs uppercase tracking-[0.14em] md:py-1",
        active
          ? "border-[color:var(--sea)] bg-[color:var(--sea)]/20 text-[color:var(--cream)]"
          : "border-[color:var(--line)] text-[color:var(--cream)]/60 hover:text-[color:var(--cream)]",
      )}
    >
      {children}
    </a>
  );
}

let clientSelection = "";
let clientSelectionKey = "";

function clientFundamentalsSnapshot(nowMonth: number) {
  const key = `${nowMonth}|${window.location.search}|${document.cookie}`;
  if (key === clientSelectionKey) return clientSelection;
  const q = new URLSearchParams(window.location.search);
  clientSelectionKey = key;
  clientSelection = JSON.stringify(
    fundamentalsSelection({
      theater: q.get("theater"),
      type: q.get("type"),
      species: q.get("species"),
      month: q.get("month"),
      coastsCookie: cookieValue(document.cookie, COASTS_COOKIE),
      nowMonth,
    }),
  );
  return clientSelection;
}

const serverSelections = new Map<number, string>();

function serverFundamentalsSnapshot(nowMonth: number) {
  const cached = serverSelections.get(nowMonth);
  if (cached) return cached;
  const next = JSON.stringify(fundamentalsSelection({ nowMonth }));
  serverSelections.set(nowMonth, next);
  return next;
}

export function FundamentalsBoard({ nowMonth }: { nowMonth: number }) {
  const raw = useSyncExternalStore(
    () => () => {},
    () => clientFundamentalsSnapshot(nowMonth),
    () => serverFundamentalsSnapshot(nowMonth),
  );
  const sel = JSON.parse(raw) as FundamentalsSelection;
  const { theater, type, speciesId, month, regionIds } = sel;
  const typeDef = type === "all" ? null : waterTypeById(type);
  const rows = speciesForFilters({ theater, type, speciesId, month }).filter(
    (s) => theater !== "all" || s.theaters.some((t) => regionIds.includes(t)),
  );
  const peaks =
    theater !== "all"
      ? peaksThisMonth(month, theater)
      : peaksThisMonth(month).filter((s) => s.theaters.some((t) => regionIds.includes(t)));
  const closures = closuresThisMonth(month).filter((c) => c.theaters.some((t) => regionIds.includes(t)));
  const typeAreas = type === "all" ? [] : areasForType(type, theater);

  const primaryChoices = SPECIES.filter(
    (s) => s.role === "primary" || s.role === "incidental" || s.role === "pacific" || s.role === "bluewater",
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker text-[color:var(--copper)]">
          Doctrine · not a honey-hole list
        </p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">
          Seasonal fundamentals
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--cream)]/65">
          When a coast, a type of water, and a fish actually line up. If you elected Texas on the
          list, this page opens on Texas — Seychelles stays off the board until you ask for it.
          Filter by region, method or habitat, and species. The year bar is peak versus present.
          Limits cite TPWD and FWC — verify before you keep one.
        </p>
        <Waterline className="mt-3" />
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {THEATERS.map((t) => (
            <Chip
              key={t.id}
              active={theater === t.id}
              to={href({ theater: t.id, type, species: speciesId, month: String(month) })}
            >
              {t.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip
            active={type === "all"}
            to={href({ theater, type: "all", species: speciesId, month: String(month) })}
          >
            Any type
          </Chip>
          {WATER_TYPES.map((t) => (
            <Chip
              key={t.id}
              active={type === t.id}
              to={href({ theater, type: t.id, species: speciesId, month: String(month) })}
            >
              {t.short}
            </Chip>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <a
            href={href({ theater, type, species: "all", month: String(month) })}
            className={cn(
              "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm",
              speciesId === "all"
                ? "bg-[color:var(--cream)] text-[color:var(--ink)]"
                : "bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70",
            )}
          >
            Any fish
          </a>
          {primaryChoices.map((s) => (
            <a
              key={s.id}
              href={href({ theater, type, species: s.id, month: String(month) })}
              className={cn(
                "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-sm",
                speciesId === s.id
                  ? "bg-[color:var(--cream)] text-[color:var(--ink)]"
                  : "bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70",
              )}
            >
              {s.commonName}
            </a>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {MONTH_NAMES.map((label, i) => {
            const m = i + 1;
            return (
              <a
                key={label}
                href={href({ theater, type, species: speciesId, month: String(m) })}
                className={cn(
                  "shrink-0 cursor-pointer rounded-md border px-2.5 py-1 text-xs",
                  month === m
                    ? "border-[color:var(--cream)] text-[color:var(--cream)]"
                    : "border-[color:var(--line)] text-[color:var(--cream)]/55",
                )}
              >
                {label.slice(0, 3)}
              </a>
            );
          })}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        {regionIds.map((id) => {
          const essay = REGION_ESSAYS[id];
          return (
            <article key={id} className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--copper)]">
                {theaterLabel(id)}
              </p>
              <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">{essay.title}</h2>
              <p className="mt-1 text-sm italic text-[color:var(--cream)]/50">{essay.dek}</p>
              <p className="mt-3 text-sm text-[color:var(--cream)]/70">{essay.body}</p>
              <p className="mt-4 text-sm text-[color:var(--cream)]/80">
                <span className="text-[color:var(--copper)]">{MONTH_NAMES[month - 1]}. </span>
                {MONTH_THEATER[month][id]}
              </p>
            </article>
          );
        })}
      </section>

      {typeDef && (
        <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--copper)]">Type</p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">{typeDef.label}</h2>
          <p className="mt-3 max-w-3xl text-[color:var(--cream)]/75">{typeDef.essay}</p>
          {typeAreas.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {typeAreas.map((a) => (
                <a
                  key={a.id}
                  href={`/?area=${a.id}&theater=${a.theater}`}
                  className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--cream)]/70 hover:text-[color:var(--cream)]"
                >
                  {a.shortName}
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-[1fr_auto]">
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--copper)]">
            {MONTH_NAMES[month - 1]} · peak
          </p>
          <h2 className="mt-1 font-heading text-2xl text-[color:var(--cream)]">What is actually on</h2>
          {peaks.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--cream)]/60">
              No primary species is marked peak for this filter. Present fish still show in the list
              below.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {peaks.map((s) => (
                <Badge
                  key={s.id}
                  variant="secondary"
                  className="bg-[color:var(--copper)]/15 text-[color:var(--cream)]"
                >
                  {s.commonName}
                </Badge>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <MonthHeatLegend />
          </div>
        </article>
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5 md:min-w-72">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--copper)]">Closures</p>
          {closures.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--cream)]/65">
              No coast-wide harvest closure on the board. Still verify before you keep a fish.
            </p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm text-[color:var(--cream)]/70">
              {closures.map((c) => (
                <li key={c.title}>
                  <span className="text-[color:var(--copper)]">{c.title}. </span>
                  {c.body}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
          <p className="font-heading text-xl text-[color:var(--cream)]">Nothing lines up.</p>
          <p className="mt-2 text-sm text-[color:var(--cream)]/60">
            That filter combination is empty — wrong coast for the fish, or the fish is not present
            in {MONTH_NAMES[month - 1]}.{" "}
            {/* Full load: a client navigation would keep the previous filter on this cached page. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/fundamentals" className="text-[color:var(--sea)] underline">
              Clear the filters
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rows.map((s) => {
            const coasts = s.theaters.filter((t) => regionIds.includes(t)) as TheaterId[];
            const localAreas = AREAS.filter(
              (a) => coasts.includes(a.theater) && a.leadSpecies.includes(s.id),
            );
            return (
              <article
                key={s.id}
                className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="font-heading text-2xl text-[color:var(--cream)]">{s.commonName}</h2>
                    <p className="text-sm italic text-[color:var(--cream)]/45">{s.latin}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.peakMonths.includes(month) ? (
                      <Badge className="bg-[color:var(--copper)]/20 text-[color:var(--cream)]">
                        Peak {MONTH_NAMES[month - 1]}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70">
                        Present {MONTH_NAMES[month - 1]}
                      </Badge>
                    )}
                    {coasts.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="bg-[color:var(--cream)]/5 text-[color:var(--cream)]/70"
                      >
                        {theaterLabel(t)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <MonthHeat className="mt-4" peak={s.peakMonths} present={s.presentMonths} nowMonth={month} />
                <TempBar
                  className="mt-4"
                  label="Thermal window"
                  tempF={null}
                  min={s.tempMin - 4}
                  max={s.tempMax + 4}
                  opt={s.tempOpt}
                  detail={`${s.tempMin}–${s.tempMax}°F · best ${s.tempOpt[0]}–${s.tempOpt[1]}°F`}
                />
                <p className="mt-3 text-[color:var(--cream)]/75">{s.why}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <p className="text-sm text-[color:var(--cream)]/65">
                    <span className="text-[color:var(--copper)]">Fly. </span>
                    {s.flyNote}
                  </p>
                  <p className="text-sm text-[color:var(--cream)]/65">
                    <span className="text-[color:var(--copper)]">Spin. </span>
                    {s.spinNote}
                  </p>
                </div>
                {localAreas.length > 0 && (
                  <p className="mt-3 text-xs text-[color:var(--cream)]/45">
                    Leads the brief on{" "}
                    {localAreas.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 ? ", " : ""}
                        <a className="underline decoration-[color:var(--sea)]/40" href={`/?area=${a.id}&theater=${a.theater}`}>
                          {a.shortName}
                        </a>
                      </span>
                    ))}
                    .
                  </p>
                )}
                <div className="mt-3 space-y-1 text-xs text-[color:var(--cream)]/45">
                  {coasts.map((t) => (
                    <p key={t}>
                      <span className="text-[color:var(--copper)]">{theaterLabel(t)}. </span>
                      {regulationFor(s, t)}
                    </p>
                  ))}
                  <a className="inline-block underline decoration-[color:var(--copper)]/50" href={s.regulationUrl}>
                    Official source
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {regionIds.includes("texas") ? <LongRecord month={month} /> : null}

      <p className="text-center text-sm text-[color:var(--cream)]/45">
        Want this week’s weather on top of the doctrine?{" "}
        <Link href="/newsletter" className="text-[color:var(--sea)] underline underline-offset-4">
          Saturday on your water
        </Link>
        .
      </p>
    </div>
  );
}
