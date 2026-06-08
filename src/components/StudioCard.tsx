import { Link } from "@tanstack/react-router";
import type { Studio } from "@/data/studios";
import { StudioStatusBadge } from "@/components/StudioStatusBadge";


export function StudioCard({ studio }: { studio: Studio }) {
  return (
    <Link
      to="/studios/$studioId"
      params={{ studioId: studio.id }}
      className="group block"
    >
      <div className="relative mb-5 aspect-[4/5] overflow-hidden rounded-xl bg-surface ring-1 ring-border">
        {studio.image ? (
          <img
            src={studio.image}
            alt={studio.name}
            loading="lazy"
            width={1024}
            height={1280}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Sans visuel
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        {(studio.city || studio.country) && (
          <div className="absolute left-4 top-4 rounded bg-background/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur">
            {[studio.city, studio.country].filter(Boolean).join(" · ")}
          </div>
        )}
        <div className="absolute right-3 top-3">
          <StudioStatusBadge status={studio.status} size="sm" />
        </div>

        {studio.tagline && (
          <div className="absolute bottom-4 left-4 right-4">
            <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
              {studio.tagline}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold tracking-tight transition-colors group-hover:text-primary">
            {studio.name}
          </h3>
          {studio.equipment.length > 0 && (
            <p className="mt-1 truncate text-xs italic text-muted-foreground">
              {studio.equipment.slice(0, 3).join(" · ")}
            </p>
          )}
          {studio.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {studio.genres.slice(0, 2).map((g) => (
                <span
                  key={g}
                  className="rounded border border-border bg-surface/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold">
            {studio.pricePerHour > 0 ? `${studio.pricePerHour}€` : "—"}
            <span className="text-xs font-normal text-muted-foreground">/h</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
