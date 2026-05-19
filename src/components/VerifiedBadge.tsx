import { Mic } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Studio certifié par Stud.Reser"
      aria-label="Studio certifié"
      className={`group/vb relative inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-primary/60 bg-gradient-to-br from-primary/30 via-primary/15 to-background/80 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_6px_20px_-6px_hsl(var(--primary)/0.55)] backdrop-blur-md ring-1 ring-background/40 transition-transform duration-300 hover:scale-105 ${className}`}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-transform duration-700 ease-out group-hover/vb:translate-x-full" />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,hsl(var(--primary)/0.35),transparent_60%)]" />
      <Mic
        className="relative size-4 drop-shadow-[0_0_6px_hsl(var(--primary)/0.7)]"
        strokeWidth={2.6}
        fill="currentColor"
        fillOpacity={0.18}
      />
    </span>
  );
}
