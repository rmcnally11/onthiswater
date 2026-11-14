import Image from "next/image";

function Figure({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  kind,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  kind: "house-hero" | "house-room";
}) {
  return (
    <figure
      className={`${kind} overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[#F4EBD8] ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={1456}
        height={816}
        sizes={sizes}
        priority={priority}
        className="h-auto w-full"
      />
    </figure>
  );
}

const WIDE_SIZES = "(min-width: 80rem) 72rem, 100vw";
const ROOM_SIZES = "(min-width: 48rem) 42rem, 100vw";

export function FieldLetterHeader({
  priority = false,
  className = "",
  sizes = WIDE_SIZES,
}: {
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <Figure
      kind="house-hero"
      src="/art/field-letter-header.jpg"
      alt="A wooden skiff with a small pirate flag on a pastel sunrise flat."
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}

export function WelcomeWide({
  priority = false,
  className = "",
  sizes = WIDE_SIZES,
}: {
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <Figure
      kind="house-hero"
      src="/art/welcome-email.jpg"
      alt="Footprints on the sand leading to a skiff on a pastel morning flat."
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}

export function RoomSaltWater({
  className = "",
  sizes = ROOM_SIZES,
}: {
  className?: string;
  sizes?: string;
}) {
  return (
    <Figure
      kind="house-room"
      src="/art/room-salt-water.jpg"
      alt="A skiff on a shallow flat at sunrise, a rod over the side and mangroves along the bank."
      sizes={sizes}
      className={className}
    />
  );
}

export function PrintSheet({ className = "" }: { className?: string }) {
  return (
    <figure className={`print-sheet ${className}`}>
      <Image
        src="/art/sheet-header.jpg"
        alt=""
        width={1200}
        height={420}
        sizes="100vw"
        className="h-auto w-full"
      />
    </figure>
  );
}

export function BrandMark({ pixels = 36 }: { pixels?: number }) {
  return (
    <Image
      src="/art/logo-square.jpg"
      alt=""
      width={pixels}
      height={pixels}
      sizes={`${pixels}px`}
      className="shrink-0 rounded-md"
      style={{ width: pixels, height: pixels }}
    />
  );
}
