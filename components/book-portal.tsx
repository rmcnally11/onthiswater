"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Briefing, TheaterId } from "@/lib/types";
import { AREAS } from "@/lib/data/areas";
import { theaterLabel } from "@/lib/data/theaters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logContextFromBriefing } from "@/lib/book";
import { LogCatchForm } from "@/components/log-catch";
import { Waterline } from "@/components/viz/waterline";
import { hashLock, type CatchEntry } from "@/lib/book";
import { useBook } from "@/lib/book-store";
import { briefHref, calendarHref } from "@/lib/hrefs";
import { cn } from "@/lib/utils";

function fateWord(entry: CatchEntry) {
  if (entry.fate === "kept") return "kept";
  if (entry.fate === "both") return "kept some";
  return "released";
}

function Snapshot({ entry }: { entry: CatchEntry }) {
  const s = entry.snapshot;
  const bits = [
    s.windMph != null ? `${Math.round(s.windMph)} mph${s.windCardinal ? ` ${s.windCardinal}` : ""}` : null,
    s.sky ?? s.wx,
    s.moonName,
    s.springNeap !== "mid" ? s.springNeap : null,
    s.tideStage.replace("-", " "),
    s.tideRangeFt != null ? `Δ ${s.tideRangeFt.toFixed(1)} ft` : null,
    s.waterTempF != null ? `${Math.round(s.waterTempF)}°F water` : null,
    s.pressureMb != null ? `${Math.round(s.pressureMb)} mb` : null,
    `score ${s.score.toFixed(1)}`,
  ].filter(Boolean);
  return <p className="text-sm text-[color:var(--cream)]/60">{bits.join(" · ")}</p>;
}

function OpenBook() {
  const { book, openBook, unlock } = useBook();
  const [handle, setHandle] = useState(book.handle);
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (book.lockHash) {
      const hash = await hashLock(phrase);
      if (!unlock(hash)) setError("That lock does not open this book.");
      return;
    }
    const name = handle.trim();
    if (name.length < 2) {
      setError("Give the book a name.");
      return;
    }
    const lockHash = phrase.trim().length >= 4 ? await hashLock(phrase.trim()) : null;
    openBook(name, lockHash);
  }

  if (book.handle && book.lockHash) {
    return (
      <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
        <p className="kicker text-[color:var(--copper)]">Your book</p>
        <h1 className="font-heading text-3xl text-[color:var(--cream)]">{book.handle}’s book is locked</h1>
        <p className="text-sm text-[color:var(--cream)]/60">
          Same phrase you set on this phone. We do not have it. There is no reset.
        </p>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/50">Phrase</Label>
        <Input
          type="password"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          className="h-12 border-[color:var(--line)] text-[color:var(--cream)]"
        />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <Button type="submit" className="min-h-12 w-full bg-[color:var(--copper)] text-[color:var(--ink)]">
          Open the book
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
      <p className="kicker text-[color:var(--copper)]">Your book</p>
      <h1 className="font-heading text-3xl text-[color:var(--cream)]">Name your book</h1>
      <p className="text-sm text-[color:var(--cream)]/60">
        This lives on this phone. Not a cloud login. Export a copy if you change phones. We do not
        store your fish.
      </p>
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/50">Your name on the water</Label>
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="e.g. Bobby"
          className="h-12 border-[color:var(--line)] text-[color:var(--cream)]"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/50">
          Lock (optional)
        </Label>
        <Input
          type="password"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Four characters if you want a lock"
          className="h-12 border-[color:var(--line)] text-[color:var(--cream)]"
        />
      </div>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <Button type="submit" className="min-h-12 w-full bg-[color:var(--copper)] text-[color:var(--ink)]">
        Open the book
      </Button>
    </form>
  );
}

function LogFromBook({ areaId, activity }: { areaId: string; activity: string }) {
  const [area, setArea] = useState(areaId);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pull() {
    setBusy(true);
    setError(null);
    try {
      const q = new URLSearchParams({ area });
      if (activity && activity !== "all") q.set("activity", activity);
      const res = await fetch(`/api/briefing?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Brief did not set");
      setBriefing(data as Briefing);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief did not set");
      setBriefing(null);
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, typeof AREAS>();
    for (const a of AREAS) {
      const list = map.get(a.theater) ?? [];
      list.push(a);
      map.set(a.theater, list);
    }
    return [...map.entries()];
  }, []);

  return (
    <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Write a catch</p>
      <p className="mt-1 text-sm text-[color:var(--cream)]/55">
        Pull this morning, then name the fish. Wet-hands path: do it from this morning.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/50">Water</Label>
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setBriefing(null);
            }}
            className="h-12 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--ink)] px-3 text-sm text-[color:var(--cream)]"
          >
            {grouped.map(([theater, waters]) => (
              <optgroup key={theater} label={theaterLabel(theater as TheaterId)}>
                {waters.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortName}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Button
          type="button"
          onClick={pull}
          disabled={busy}
          className="min-h-12 bg-[color:var(--sea)] text-[color:var(--ink)] hover:bg-[color:var(--sea)]/90"
        >
          {busy ? "Pulling the gauges…" : "Snapshot this morning"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {briefing ? (
        <div className="mt-5 border-t border-[color:var(--line)] pt-5">
          <LogCatchForm context={logContextFromBriefing(briefing)} />
        </div>
      ) : null}
    </section>
  );
}

export function BookPortal({
  areaId,
  theater,
  activity,
}: {
  areaId: string;
  theater: string;
  activity: string;
}) {
  const { book, ready, unlocked, removeCatch, wipe, replace } = useBook();
  const [confirmWipe, setConfirmWipe] = useState(false);

  if (!ready) {
    return <div className="h-48 animate-pulse rounded-3xl bg-[color:var(--panel)]" />;
  }
  if (!book.handle || !unlocked) return <OpenBook />;

  const mine = book.catches;
  const here = mine.filter((c) => c.snapshot.areaId === areaId);

  function download() {
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `on-this-water-book-${book.handle.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker text-[color:var(--copper)]">Your book</p>
        <h1 className="page-title mt-3 text-[color:var(--cream)]">{book.handle}’s book</h1>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--cream)]/65">
          Your fish, and the wind and the tide at that hour. The calendar marks days that rhyme with a
          page you already wrote. Same glass. Not a promise you will catch again. This book is on
          this phone — we did not put it on a server.
        </p>
        <Waterline className="mt-3" />
      </header>

      <LogFromBook areaId={areaId} activity={activity} />

      <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--copper)]">Pages</p>
            <p className="mt-1 text-sm text-[color:var(--cream)]/50">
              {mine.length === 0
                ? "Empty. Write the first fish."
                : `${mine.length} ${mine.length === 1 ? "page" : "pages"}`}
              {here.length && here.length !== mine.length ? ` · ${here.length} on this water` : ""}
            </p>
          </div>
          <a
            className="text-sm text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40"
            href={calendarHref({ areaId, theater, activity })}
          >
            Calendar for this water
          </a>
        </div>
        {mine.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--cream)]/45">
            From Today, tap “Write this morning in the book” after you land one. Or snapshot the
            gauges above.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {mine.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "rounded-2xl border bg-[color:var(--ink)] p-4",
                  entry.snapshot.areaId === areaId ? "border-[color:var(--sea)]/40" : "border-[color:var(--line)]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-xl text-[color:var(--cream)]">
                      {entry.count} {entry.speciesName}
                      {entry.inches ? ` · ${entry.inches}"` : ""}
                    </p>
                    <p className="text-xs text-[color:var(--cream)]/50">
                      {entry.snapshot.shortName} · {entry.snapshot.forDate} · {fateWord(entry)}
                      {entry.waterNote ? ` · ${entry.waterNote}` : ""}
                    </p>
                  </div>
                  <a
                    className="text-xs text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40"
                    href={briefHref({
                      areaId: entry.snapshot.areaId,
                      theater: entry.snapshot.theater,
                      activity: entry.activity,
                      date: entry.snapshot.forDate,
                    })}
                  >
                    That morning
                  </a>
                </div>
                <Snapshot entry={entry} />
                {entry.notes ? <p className="mt-2 text-sm text-[color:var(--cream)]/75">{entry.notes}</p> : null}
                <p className="mt-2 text-xs text-[color:var(--cream)]/40">{entry.snapshot.headline}</p>
                <button
                  type="button"
                  onClick={() => removeCatch(entry.id)}
                  className="mt-3 text-xs text-[color:var(--cream)]/75 underline"
                >
                  Tear this page
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-3 text-sm">
        <Button
          type="button"
          variant="outline"
          onClick={download}
          className="border-[color:var(--line)] text-[color:var(--cream)]"
        >
          Export the book
        </Button>
        <label className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-[color:var(--line)] px-2.5 text-sm text-[color:var(--cream)]/80">
          Import
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const text = await file.text();
                const { parseBook } = await import("@/lib/book");
                const next = parseBook(JSON.parse(text));
                if (!next.handle && next.catches.length === 0) return;
                replace(next);
              } catch {
                /* bad file — leave the book as it is */
              }
            }}
          />
        </label>
        {confirmWipe ? (
          <Button type="button" variant="destructive" onClick={() => wipe()}>
            Yes, wipe this phone
          </Button>
        ) : (
          <button type="button" className="text-xs text-[color:var(--cream)]/75 underline" onClick={() => setConfirmWipe(true)}>
            Wipe the book on this phone
          </button>
        )}
      </section>
    </div>
  );
}
