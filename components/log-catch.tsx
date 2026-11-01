"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import type { SpeciesId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  newCatchId,
  speciesForTheater,
  speciesName,
  type CatchFate,
  type LogContext,
} from "@/lib/book";
import { useBook } from "@/lib/book-store";
import { calendarHref } from "@/lib/hrefs";
import { cn } from "@/lib/utils";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/75">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ChoiceField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/75">{label}</legend>
      {children}
    </fieldset>
  );
}

export function LogCatchForm({
  context,
  onSaved,
}: {
  context: LogContext;
  onSaved?: () => void;
}) {
  const { book, addCatch } = useBook();
  const fieldId = useId();
  const theaterFish = speciesForTheater(context.theater);
  const fish = useMemo(() => {
    const seen = new Set<string>();
    const list = [...context.inPlay, ...theaterFish.map((s) => ({ id: s.id, commonName: s.commonName }))].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return list;
  }, [context.inPlay, context.theater]);

  const [speciesId, setSpeciesId] = useState<SpeciesId>(context.inPlay[0]?.id ?? theaterFish[0]?.id ?? "redfish");
  const [count, setCount] = useState("1");
  const [inches, setInches] = useState("");
  const [fate, setFate] = useState<CatchFate>("released");
  const [waterNote, setWaterNote] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const snap = context.snapshot;

  function save() {
    const n = Math.max(1, Math.min(99, Number(count) || 1));
    addCatch({
      id: newCatchId(),
      createdAt: new Date().toISOString(),
      when: new Date().toISOString(),
      speciesId,
      speciesName: speciesName(speciesId),
      count: n,
      inches: inches ? Number(inches) : null,
      fate,
      activity: context.activity,
      waterNote: waterNote.trim(),
      notes: notes.trim(),
      snapshot: snap,
    });
    setDone(speciesName(speciesId));
    onSaved?.();
  }

  if (done) {
    return (
      <div className="space-y-3 py-2">
        <p className="font-heading text-2xl text-[color:var(--cream)]">{done} is in the book.</p>
        <p className="text-sm text-[color:var(--cream)]/65">
          The wind and the tide from this morning went with it. The calendar will mark days that rhyme —
          same glass, not the same fish.
        </p>
        <a
          className="inline-flex min-h-11 items-center text-sm text-[color:var(--sea)] underline decoration-[color:var(--sea)]/40"
          href={calendarHref({ areaId: snap.areaId, theater: snap.theater, activity: context.activity })}
        >
          See days that rhyme
        </a>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p className="text-sm text-[color:var(--cream)]/75">
        {book.handle ? `${book.handle} · ` : ""}
        {snap.shortName} · {snap.score.toFixed(1)} · wind{" "}
        {snap.windMph != null ? `${Math.round(snap.windMph)} mph` : "not in"}
        {snap.windCardinal ? ` ${snap.windCardinal}` : ""}
        {" · "}
        {snap.moonName}
      </p>
      <ChoiceField label="Who">
        <div className="flex flex-wrap gap-1.5">
          {fish.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={speciesId === s.id}
              onClick={() => setSpeciesId(s.id)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-sm",
                speciesId === s.id
                  ? "border-[color:var(--copper)] bg-[color:var(--copper)]/15 text-[color:var(--cream)]"
                  : "border-[color:var(--line)] text-[color:var(--cream)]/75",
              )}
            >
              {s.commonName}
            </button>
          ))}
        </div>
      </ChoiceField>
      <div className="grid grid-cols-2 gap-3">
        <Field label="How many" htmlFor={`${fieldId}-count`}>
          <Input
            id={`${fieldId}-count`}
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="h-11 border-[color:var(--line)] text-[color:var(--cream)]"
          />
        </Field>
        <Field label="Inches (optional)" htmlFor={`${fieldId}-inches`}>
          <Input
            id={`${fieldId}-inches`}
            inputMode="decimal"
            value={inches}
            onChange={(e) => setInches(e.target.value)}
            placeholder="—"
            className="h-11 border-[color:var(--line)] text-[color:var(--cream)]"
          />
        </Field>
      </div>
      <ChoiceField label="Fate">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["released", "Released"],
              ["kept", "Kept"],
              ["both", "Both"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={fate === id}
              onClick={() => setFate(id)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-sm",
                fate === id
                  ? "border-[color:var(--sea)] bg-[color:var(--sea)]/15 text-[color:var(--cream)]"
                  : "border-[color:var(--line)] text-[color:var(--cream)]/75",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </ChoiceField>
      <Field label="Where you already know" htmlFor={`${fieldId}-water`}>
        <Input
          id={`${fieldId}-water`}
          value={waterNote}
          onChange={(e) => setWaterNote(e.target.value)}
          placeholder="A name you use — not a GPS"
          className="h-11 border-[color:var(--line)] text-[color:var(--cream)]"
        />
      </Field>
      <Field label="What it felt like" htmlFor={`${fieldId}-notes`}>
        <textarea
          id={`${fieldId}-notes`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional. Keep it short."
          className="w-full rounded-lg border border-[color:var(--line)] bg-transparent px-2.5 py-2 text-sm text-[color:var(--cream)] outline-none placeholder:text-[color:var(--cream)]/70"
        />
      </Field>
      <Button type="submit" className="min-h-12 w-full bg-[color:var(--copper)] text-[color:var(--ink)] hover:bg-[color:var(--copper)]/90">
        Put it in the book
      </Button>
      <p className="text-xs text-[color:var(--cream)]/75">
        No pin. No honey hole. The snapshot is wind, sky, moon, tide, glass, and the 1–10 from this
        morning.
      </p>
    </form>
  );
}

export function LogCatchLaunch({ context }: { context: LogContext }) {
  const { book, ready } = useBook();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="min-h-11 border-[color:var(--line)] text-[color:var(--cream)] hover:bg-[color:var(--cream)]/8"
          />
        }
      >
        Write this morning in the book
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[min(100%,28rem)] overflow-y-auto border-[color:var(--line)] bg-[color:var(--ink)] text-[color:var(--cream)]"
      >
        <SheetHeader>
          <p className="kicker text-[color:var(--copper)]">Your book</p>
          <SheetTitle className="font-heading text-2xl text-[color:var(--cream)]">
            {ready && book.handle ? `${book.handle}’s catch` : "Log the catch"}
          </SheetTitle>
          <SheetDescription className="text-[color:var(--cream)]/55">
            Snapshot the morning with the fish. Days that rhyme show on the calendar.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-8">
          <LogCatchForm context={context} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
