import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StudioCard } from "@/components/StudioCard";
import { fetchPublishedStudios } from "@/data/studios-api";
import { distanceKm } from "@/lib/geo";

export const Route = createFileRoute("/studios/")({
  head: () => ({
    meta: [
      { title: "Marketplace — [STUD.RESER]" },
      {
        name: "description",
        content:
          "Parcourez tous les studios disponibles. Filtrez par ville, genre, prix et matériel.",
      },
    ],
  }),
  component: StudiosPage,
});

function StudiosPage() {
  const [city, setCity] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [minPrice, setMinPrice] = useState<number>(25);
  const [query, setQuery] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(0); // 0 = désactivé
  const [locating, setLocating] = useState(false);
  const [geocodingNearby, setGeocodingNearby] = useState(false);
  const [fallbackCoords, setFallbackCoords] = useState<
    Record<string, { lat: number; lon: number } | null>
  >({});

  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Géolocalisation indisponible sur cet appareil.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setRadiusKm((r) => (r === 0 ? 20 : r));
        setLocating(false);
        toast.success("Position détectée. Studios proches affichés.");
      },
      () => {
        setLocating(false);
        toast.error("Impossible d'obtenir votre position.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const { data: studios = [], isLoading } = useQuery({
    queryKey: ["studios"],
    queryFn: fetchPublishedStudios,
  });

  const cities = useMemo(
    () => Array.from(new Set(studios.map((s) => s.city).filter(Boolean) as string[])).sort(),
    [studios],
  );
  const genres = useMemo(
    () => Array.from(new Set(studios.flatMap((s) => s.genres))).sort(),
    [studios],
  );

  useEffect(() => {
    if (!userPos) return;
    const missing = studios.filter(
      (s) =>
        (s.latitude == null || s.longitude == null) &&
        fallbackCoords[s.id] === undefined &&
        [s.address, s.city, s.country].some(Boolean),
    );
    if (missing.length === 0) {
      setGeocodingNearby(false);
      return;
    }

    let cancelled = false;
    setGeocodingNearby(true);
    (async () => {
      const { geocodeAddress } = await import("@/lib/geo");
      const entries = await Promise.all(
        missing.map(async (s) => {
          const candidates = [
            [s.address, s.city, s.country],
            [s.address, s.city, "France"],
            [s.city, s.country],
            [s.city, "France"],
          ]
            .map((parts) => parts.filter(Boolean).join(", ").trim())
            .filter((value, index, arr) => value && arr.indexOf(value) === index);
          let coords: { lat: number; lon: number } | null = null;
          for (const candidate of candidates) {
            coords = await geocodeAddress(candidate);
            if (coords) break;
          }
          return [s.id, coords ? { lat: coords.lat, lon: coords.lon } : null] as const;
        }),
      );
      if (!cancelled) {
        setFallbackCoords((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
        setGeocodingNearby(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fallbackCoords, studios, userPos]);

  const filtered = useMemo(() => {
    const list = studios
      .map((s) => {
        const fallback = fallbackCoords[s.id];
        const latitude = s.latitude ?? fallback?.lat ?? null;
        const longitude = s.longitude ?? fallback?.lon ?? null;
        const dist =
          userPos && latitude != null && longitude != null
            ? distanceKm(userPos.lat, userPos.lon, latitude, longitude)
            : null;
        return { studio: s, dist };
      })
      .filter(({ studio: s, dist }) => {
        if (city !== "all" && s.city !== city) return false;
        if (genre !== "all" && !s.genres.includes(genre)) return false;
        if (s.pricePerHour > maxPrice) return false;
        if (s.pricePerHour < minPrice) return false;
        if (
          query &&
          !`${s.name} ${s.equipment.join(" ")}`.toLowerCase().includes(query.toLowerCase())
        )
          return false;
        if (userPos && radiusKm > 0) {
          if (dist == null || dist > radiusKm) return false;
        }
        return true;
      });
    if (userPos) {
      list.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
    }
    return list;
  }, [studios, city, genre, maxPrice, minPrice, query, userPos, radiusKm, fallbackCoords]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <header className="border-b border-border px-5 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Marketplace
          </span>
          <h1 className="mt-3 font-display text-[2.25rem] font-extrabold uppercase leading-[0.95] tracking-tighter sm:text-5xl md:text-7xl">
            {studios.length === 0 ? "Studios à venir" : `${filtered.length} studios disponibles`}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Filtrez, comparez, réservez. Chaque studio publié sur la plateforme est vérifié par
            notre équipe.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-5 py-8 sm:gap-10 sm:px-6 sm:py-12">
        {/* FILTERS */}
        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-24 space-y-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> Filtres
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Studio, matériel..."
                  className="w-full rounded-md border border-border bg-surface/60 px-9 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Autour de moi
              </label>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-gradient-to-br from-background/90 to-surface/90 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_6px_18px_-8px_hsl(var(--primary)/0.5)] backdrop-blur-md transition-all hover:scale-[1.01] hover:border-primary disabled:opacity-60"
              >
                <LocateFixed className={`size-3.5 ${locating ? "animate-pulse" : ""}`} />
                {userPos ? "Position détectée" : locating ? "Localisation…" : "Me localiser"}
              </button>
              {userPos && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Rayon</span>
                    <span className="text-primary">{radiusKm === 0 ? "—" : `${radiusKm} km`}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={500}
                    step={1}
                    value={radiusKm === 0 ? 10 : radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1 km</span>
                    <span>500 km</span>
                  </div>
                  {geocodingNearby && (
                    <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
                      Mise à jour des distances…
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUserPos(null);
                      setRadiusKm(0);
                    }}
                    className="mt-1 w-full text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  >
                    Désactiver la distance
                  </button>
                </div>
              )}
            </div>

            <FilterSelect
              label="Ville"
              value={city}
              onChange={setCity}
              options={[
                { label: "Toutes", value: "all" },
                ...cities.map((c) => ({ label: c, value: c })),
              ]}
            />
            <FilterSelect
              label="Genre musical"
              value={genre}
              onChange={setGenre}
              options={[
                { label: "Tous", value: "all" },
                ...genres.map((g) => ({ label: g, value: g })),
              ]}
            />

            <div>
              <label className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Prix min <span className="text-primary">{minPrice}€/h</span>
              </label>
              <input
                type="range"
                min={25}
                max={200}
                step={5}
                value={minPrice}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMinPrice(v);
                  if (v > maxPrice) setMaxPrice(v);
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>25€</span>
                <span>200€+</span>
              </div>
            </div>

            <div>
              <label className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Prix max <span className="text-primary">{maxPrice}€/h</span>
              </label>
              <input
                type="range"
                min={25}
                max={200}
                step={5}
                value={maxPrice}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxPrice(v);
                  if (v < minPrice) setMinPrice(v);
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
              />
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>25€</span>
                <span>200€+</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCity("all");
                setGenre("all");
                setMinPrice(25);
                setMaxPrice(200);
                setQuery("");
                setUserPos(null);
                setRadiusKm(0);
              }}
              className="w-full rounded-md border border-border py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              Réinitialiser
            </button>
          </div>
        </aside>

        {/* GRID */}
        <section className="col-span-12 lg:col-span-9">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-border p-20 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : studios.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-24 text-center">
              <p className="font-display text-3xl font-extrabold uppercase tracking-tighter md:text-4xl">
                Studios disponibles prochainement
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Aucun studio n'est encore publié sur la plateforme. Revenez bientôt.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-20 text-center">
              <p className="font-display text-2xl font-bold">Aucun studio ne matche.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {geocodingNearby
                  ? "Calcul des distances en cours, les studios proches arrivent…"
                  : "Essayez d'élargir vos filtres."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(({ studio: s, dist }) => (
                <div key={s.id} className="relative">
                  {dist != null && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
                      {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                    </span>
                  )}
                  <StudioCard studio={s} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
