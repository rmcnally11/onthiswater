import { PEACH, TEAL } from "@/lib/house";

export function Waterline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 48"
      className={`waterline-svg pointer-events-none h-10 w-full opacity-70 ${className}`}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <path
        className="waterline-a"
        d="M0 24 C 80 8, 160 40, 240 24 S 400 8, 480 24 640 40, 720 24 880 8, 960 24 1120 40, 1200 24"
        fill="none"
        stroke={TEAL}
        strokeWidth="1.4"
        strokeOpacity="0.55"
      />
      <path
        className="waterline-b"
        d="M0 30 C 90 18, 170 42, 260 30 S 430 16, 520 30 700 44, 790 30 970 16, 1060 30 1200 42, 1200 30"
        fill="none"
        stroke={PEACH}
        strokeWidth="1.1"
        strokeOpacity="0.4"
      />
    </svg>
  );
}
