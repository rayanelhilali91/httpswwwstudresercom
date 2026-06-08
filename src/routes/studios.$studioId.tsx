import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  MapPin,
  Users,
  Lock,
  Navigation,
  Instagram,
  Music2,
  Ghost,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Sliders,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StudioStatusBadge } from "@/components/StudioStatusBadge";
import { ClaimStudioButton } from "@/components/ClaimStudioButton";


import { fetchStudio } from "@/data/studios-api";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createBooking } from "@/lib/bookings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/studios/$studioId")({
  head: () => ({
    meta: [{ title: "Studio — [STUD.RESER]" }],
  }),
  component: StudioProfile,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    // Auto-retry une fois immédiatement : la plupart des erreurs ici sont
    // des aléas transitoires (session en cours d'hydratation, race fetch).
    useEffect(() => {
      const t = setTimeout(() => {
        router.invalidate();
        reset();
      }, 50);
      return () => clearTimeout(t);
    }, [router, reset]);
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Chargement du studio…</p>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background text-center">
      <div>
        <h1 className="font-display text-6xl font-extrabold">404</h1>
        <p className="mt-2 text-muted-foreground">Studio introuvable.</p>
        <Link to="/studios" className="mt-6 inline-block text-primary underline">
          ← Retour à la marketplace
        </Link>
      </div>
    </div>
  ),
});

function normalizeSocialUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // strip leading "//" or "www." inconsistencies, then prepend https://
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

type Slot = { id: string; start_at: string; end_at: string; is_booked: boolean };
type BookingRange = { start_at: string; end_at: string };
type HourCell = { startISO: string; endISO: string; label: string; slotId: string; booked: boolean };

function StudioProfile() {
  const { studioId } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setActiveImage(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const scrollTo = (i: number) => emblaApi?.scrollTo(i);

  const { data: studio, isLoading } = useQuery({
    queryKey: ["studio", studioId],
    queryFn: () => fetchStudio(studioId),
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 4000),
    staleTime: 30_000,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["studio-slots", studioId, selectedRoomId],
    queryFn: async () => {
      let q = supabase
        .from("studio_slots")
        .select("id, start_at, end_at, is_booked, room_id")
        .eq("studio_id", studioId)
        .gte("end_at", new Date().toISOString())
        .order("start_at");
      if (selectedRoomId) q = q.eq("room_id", selectedRoomId);
      else q = q.is("room_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["studio-bookings-public", studioId, selectedRoomId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("start_at, end_at, room_id")
        .eq("studio_id", studioId)
        .gte("end_at", new Date().toISOString())
        .neq("status", "cancelled");
      if (selectedRoomId) q = q.eq("room_id", selectedRoomId);
      else q = q.is("room_id", null);
      const { data, error } = await q;
      if (error) return [] as BookingRange[];
      return (data ?? []) as BookingRange[];
    },
  });

  // Découpe les créneaux du studio en cellules d'1h
  const dayGroups = useMemo(() => {
    const map = new Map<string, HourCell[]>();
    const now = Date.now();
    for (const s of slots) {
      const start = new Date(s.start_at).getTime();
      const end = new Date(s.end_at).getTime();
      for (let t = start; t + 3600000 <= end; t += 3600000) {
        if (t < now) continue;
        const cellStart = new Date(t);
        const cellEnd = new Date(t + 3600000);
        const day = cellStart.toISOString().slice(0, 10);
        const conflict = bookings.some((b) => {
          const bs = new Date(b.start_at).getTime();
          const be = new Date(b.end_at).getTime();
          return t < be && t + 3600000 > bs;
        });
        const arr = map.get(day) ?? [];
        const nextCell = {
          startISO: cellStart.toISOString(),
          endISO: cellEnd.toISOString(),
          label: cellStart.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          slotId: s.id,
          booked: s.is_booked || conflict,
        };
        const existingIndex = arr.findIndex((c) => c.startISO === nextCell.startISO);
        if (existingIndex >= 0) {
          arr[existingIndex] = { ...arr[existingIndex], booked: arr[existingIndex].booked || nextCell.booked };
        } else {
          arr.push(nextCell);
        }
        map.set(day, arr);
      }
    }
    return Array.from(map.entries())
      .map(([day, cells]) => [day, cells.sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())] as [string, HourCell[]])
      .sort(([a], [b]) => a.localeCompare(b));
  }, [slots, bookings]);

  const allCells = useMemo(() => dayGroups.flatMap(([, c]) => c), [dayGroups]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-6 py-32 text-center text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-center">
        <div>
          <h1 className="font-display text-6xl font-extrabold">404</h1>
          <p className="mt-2 text-muted-foreground">Studio introuvable ou indisponible.</p>
          <Link to="/studios" className="mt-6 inline-block text-primary underline">
            ← Retour à la marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === studio.ownerId;
  const isStudioAccount = profile?.account_type === "studio";
  const selectedRoom = selectedRoomId ? studio.rooms.find((r) => r.id === selectedRoomId) ?? null : null;
  const effectivePrice = selectedRoom ? selectedRoom.pricePerHour : studio.pricePerHour;
  const minH = selectedRoom ? selectedRoom.minBookingHours : studio.minBookingHours ?? 1;
  const duration = selected.length;
  const total = effectivePrice * duration;
  const firstISO = selected[0];
  const lastISO = selected[selected.length - 1];
  const firstCell = firstISO ? allCells.find((c) => c.startISO === firstISO) : undefined;
  const lastCell = lastISO ? allCells.find((c) => c.startISO === lastISO) : undefined;

  // Construit la plage horaire continue entre deux cellules (inclusif des deux côtés).
  // Toutes les heures intermédiaires doivent être disponibles (non réservées).
  const buildContinuousRange = (fromISO: string, toISO: string) => {
    const start = Math.min(new Date(fromISO).getTime(), new Date(toISO).getTime());
    const end = Math.max(new Date(fromISO).getTime(), new Date(toISO).getTime());
    const availableByTime = new Map<number, HourCell>();
    for (const c of allCells) {
      const time = new Date(c.startISO).getTime();
      if (!c.booked && !availableByTime.has(time)) availableByTime.set(time, c);
    }
    const range: string[] = [];
    for (let t = start; t <= end; t += 3600000) {
      const c = availableByTime.get(t);
      if (!c) return null;
      range.push(c.startISO);
    }
    return range;
  };

  // Logique début / fin :
  // - 1er clic = heure de début
  // - 2ème clic = heure de fin (la plage entre les deux est sélectionnée)
  //   Si le clic est sur l'heure de début → désélection
  //   Si le clic est antérieur → cette heure devient le nouveau début
  // - Quand une plage existe déjà, un nouveau clic réinitialise sur cette heure
  const toggleHour = (cell: HourCell) => {
    if (cell.booked || isOwner || isStudioAccount) return;
    setSelected((prev) => {
      const current = [...prev].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Aucune sélection → on pose le début
      if (current.length === 0) return [cell.startISO];

      // Une seule heure sélectionnée (= début posé, en attente de la fin)
      if (current.length === 1) {
        const startISO = current[0];
        if (cell.startISO === startISO) return []; // re-clic sur le début = annulation
        const startTime = new Date(startISO).getTime();
        const clickTime = new Date(cell.startISO).getTime();
        if (clickTime < startTime) {
          // Clic antérieur → ça devient le nouveau début
          return [cell.startISO];
        }
        // Clic postérieur = heure de fin. La plage couvre [début … fin-1h]
        // (cliquer 12h puis 14h = session 12h→14h, soit 2h sélectionnées)
        const endInclusiveISO = new Date(clickTime - 3600000).toISOString();
        if (clickTime - 3600000 < startTime) return [startISO];
        const range = buildContinuousRange(startISO, endInclusiveISO);
        if (!range) {
          toast.error("Certaines heures de cette plage sont déjà réservées.");
          return current;
        }
        return range;
      }

      // Une plage existe déjà → on repart d'un nouveau début
      return [cell.startISO];
    });
  };

  const createBookingFn = useServerFn(createBooking);

  const handleBooking = async () => {
    if (!user || !profile) {
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    if (profile.account_type !== "artist") {
      toast.error("Seuls les comptes artiste peuvent réserver.");
      return;
    }
    if (!firstCell || !lastCell) {
      toast.error("Sélectionnez au moins une heure.");
      return;
    }
    if (duration < minH) {
      toast.error(`Minimum ${minH}h de réservation.`);
      return;
    }
    setSubmitting(true);
    try {
      await createBookingFn({
        data: {
          studio_id: studio.id,
          slot_id: firstCell.slotId,
          room_id: selectedRoomId,
          engineer: selectedEngineer.trim() ? selectedEngineer.trim() : null,
          start_at: firstCell.startISO,
          end_at: lastCell.endISO,
        },
      });
      toast.success("Réservation confirmée !");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["studio-slots", studioId] });
      qc.invalidateQueries({ queryKey: ["studio-bookings-public", studioId] });
      navigate({ to: "/dashboard" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Réservation impossible.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-8">
        <Link
          to="/studios"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-gradient-to-br from-background/90 to-surface/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_8px_24px_-10px_hsl(var(--primary)/0.55)] backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary"
        >
          <ArrowLeft className="size-3.5" /> Retour
        </Link>
      </div>

      {/* GALLERY — Carousel moderne */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {(() => {
          const images = [
            ...studio.gallery,
            ...(studio.image && !studio.gallery.includes(studio.image) ? [studio.image] : []),
          ];
          if (images.length === 0) {
            return (
              <div className="grid aspect-[16/10] w-full place-items-center rounded-2xl border border-dashed border-border text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Aucun visuel
              </div>
            );
          }
          return (
            <div className="space-y-3">
              <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface">
                <div ref={emblaRef} className="overflow-hidden">
                  <div className="flex">
                    {images.map((img, i) => (
                      <div key={i} className="relative min-w-0 flex-[0_0_100%]">
                        <img
                          src={img}
                          alt={`${studio.name} — photo ${i + 1}`}
                          className="aspect-[16/10] w-full object-cover sm:aspect-[16/9]"
                          loading={i === 0 ? "eager" : "lazy"}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={scrollPrev}
                      aria-label="Photo précédente"
                      className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-background sm:left-5 sm:size-11"
                    >
                      <ChevronLeft className="size-4 sm:size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={scrollNext}
                      aria-label="Photo suivante"
                      className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/80 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-background sm:right-5 sm:size-11"
                    >
                      <ChevronRight className="size-4 sm:size-5" />
                    </button>
                    <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md sm:bottom-4 sm:right-4 sm:px-3 sm:py-1 sm:text-[11px]">
                      {activeImage + 1} / {images.length}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollTo(i)}
                      aria-label={`Aller à la photo ${i + 1}`}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-28 ${
                        i === activeImage
                          ? "border-primary opacity-100"
                          : "border-transparent opacity-50 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </section>


      {/* CONTENT */}
      <section className="mx-auto grid max-w-7xl grid-cols-12 gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:gap-12 lg:py-16">
        <div className="col-span-12 lg:col-span-8">
          {(studio.city || studio.country) && (
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
              <MapPin className="size-3.5" /> {[studio.city, studio.country].filter(Boolean).join(", ")}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tighter sm:text-5xl md:text-7xl">
              {studio.name}
            </h1>
            <StudioStatusBadge status={studio.status} />
            <ClaimStudioButton studio={studio} />

          </div>
          {studio.tagline && (
            <p className="mt-4 max-w-xl text-base italic text-muted-foreground sm:text-lg">{studio.tagline}</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-border py-5 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-4" /> Jusqu'à {studio.capacity} personnes
            </div>
            {studio.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {studio.genres.map((g) => (
                  <span key={g} className="rounded border border-border bg-surface/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          {studio.description && (
            <div className="mt-10">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">À propos</h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{studio.description}</p>
            </div>
          )}

          {studio.engineers.length > 0 && (
            <div className="mt-12">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Ingénieurs son</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {studio.engineers.map((eng) => (
                  <li key={eng} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-sm">
                    <Headphones className="size-3.5 text-primary" /> {eng}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {studio.rooms.length > 0 && (
            <div className="mt-12">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Salles disponibles</h2>
              <p className="mt-2 text-xs text-muted-foreground">Choisissez la salle souhaitée pour voir ses disponibilités et son tarif.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setSelectedRoomId(null); setSelected([]); }}
                  className={`rounded-xl border p-4 text-left transition-all ${selectedRoomId === null ? "border-primary bg-primary/10" : "border-border bg-surface/40 hover:border-primary/50"}`}
                >
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <Sliders className="size-3" /> Studio principal
                  </div>
                  <p className="mt-2 font-display text-base font-bold uppercase tracking-tight">Espace standard</p>
                  <p className="mt-1 text-sm text-muted-foreground">{studio.pricePerHour}€/h · min {studio.minBookingHours}h</p>
                </button>
                {studio.rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRoomId(r.id); setSelected([]); }}
                    className={`rounded-xl border p-4 text-left transition-all ${selectedRoomId === r.id ? "border-primary bg-primary/10" : "border-border bg-surface/40 hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <Sliders className="size-3" /> Salle
                    </div>
                    <p className="mt-2 font-display text-base font-bold uppercase tracking-tight">{r.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{r.pricePerHour}€/h · min {r.minBookingHours}h</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {studio.equipment.length > 0 && (
            <div className="mt-12">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Matériel disponible</h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {studio.equipment.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3 text-sm"
                  >
                    <Check className="size-4 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(studio.instagramUrl || studio.tiktokUrl || studio.snapchatUrl) && (
            <div className="relative z-10 mt-12">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Suivez le studio</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {studio.instagramUrl && (
                  <a
                    href={normalizeSocialUrl(studio.instagramUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative z-10 inline-flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm transition-all hover:border-primary hover:bg-surface"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
                      <Instagram className="size-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Instagram</span>
                      <span className="block font-display text-sm font-bold uppercase tracking-tight">Voir le profil</span>
                    </span>
                  </a>
                )}
                {studio.tiktokUrl && (
                  <a
                    href={normalizeSocialUrl(studio.tiktokUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative z-10 inline-flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm transition-all hover:border-primary hover:bg-surface"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background">
                      <Music2 className="size-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">TikTok</span>
                      <span className="block font-display text-sm font-bold uppercase tracking-tight">Voir le profil</span>
                    </span>
                  </a>
                )}
                {studio.snapchatUrl && (
                  <a
                    href={normalizeSocialUrl(studio.snapchatUrl) ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative z-10 inline-flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm transition-all hover:border-primary hover:bg-surface"
                  >
                    <span className="grid size-9 place-items-center rounded-lg bg-[#fffc00] text-black">
                      <Ghost className="size-4" />
                    </span>
                    <span>
                      <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Snapchat</span>
                      <span className="block font-display text-sm font-bold uppercase tracking-tight">Voir le profil</span>
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* LOCATION */}
          {(studio.address || studio.city) && (() => {
            const mapQuery = encodeURIComponent(
              [studio.address, studio.city, studio.country].filter(Boolean).join(", "),
            );
            return (
              <div className="mt-12">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Localisation</h2>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <span>{[studio.address, studio.city, studio.country].filter(Boolean).join(" · ")}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:border-primary hover:text-primary"
                  >
                    <Navigation className="size-3.5" /> Itinéraire
                  </a>
                </div>
                <div className="mt-3 overflow-hidden rounded-2xl border border-border">
                  <iframe
                    title={`Carte ${studio.name}`}
                    src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-[240px] w-full sm:h-[360px]"
                  />
                </div>
              </div>
            );
          })()}

          {/* AVAILABILITIES — sélection heure par heure */}
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Disponibilités</h2>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm border border-border bg-surface/60" /> Libre</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-destructive/60" /> Réservé</span>
                <span>· Minimum {minH}h</span>
              </div>
            </div>
            {dayGroups.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Aucun créneau publié pour le moment.
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {dayGroups.map(([day, cells]) => (
                  <div key={day}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      {new Date(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2 md:grid-cols-6">
                      {cells.map((c) => {
                        const active = selected.includes(c.startISO);
                        const disabled = c.booked || isOwner || isStudioAccount;
                        return (
                          <button
                            key={c.startISO}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleHour(c)}
                            title={c.booked ? "Créneau déjà réservé" : undefined}
                            className={`relative rounded-md border px-1.5 py-2.5 text-center text-[13px] font-semibold tabular-nums transition-all sm:rounded-lg sm:px-2 sm:py-3 sm:text-sm ${
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                : c.booked
                                  ? "cursor-not-allowed border-destructive/50 bg-destructive/15 text-destructive line-through"
                                  : disabled
                                    ? "cursor-not-allowed border-border bg-surface/20 text-muted-foreground/50"
                                    : "border-border bg-surface/40 hover:border-primary hover:text-primary"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOOKING SIDEBAR */}
        <aside className="order-first col-span-12 lg:order-none lg:col-span-4">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto md:p-7">
            <div className="flex items-end justify-between">
              <span className="font-display text-3xl font-extrabold sm:text-4xl">
                {effectivePrice > 0 ? `${effectivePrice}€` : "—"}
                <span className="text-xs font-normal text-muted-foreground sm:text-sm">/heure</span>
              </span>
            </div>

            {isOwner ? (
              <div className="mt-6 rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                C'est votre studio. Gérez-le depuis votre espace studio.
              </div>
            ) : isStudioAccount ? (
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <span>Les comptes studio ne peuvent pas réserver. Connectez-vous avec un compte artiste.</span>
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-xl border border-border bg-gradient-to-br from-background/60 to-background/20 p-4 sm:mt-6 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <Clock className="size-3" /> Durée
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Minimum {minH}h
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2 sm:mt-3">
                    <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-primary tabular-nums sm:text-6xl">
                      {duration}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                      heure{duration > 1 ? "s" : ""}
                    </span>
                  </div>
                  {firstCell && lastCell ? (
                    <p className="mt-3 text-sm">
                      <span className="block font-medium capitalize">
                        {new Date(firstCell.startISO).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(firstCell.startISO).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} →{" "}
                        {new Date(lastCell.endISO).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Cliquez sur les heures souhaitées (consécutives) pour composer votre session.
                    </p>
                  )}
                </div>

                {duration > 0 && (
                  <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{effectivePrice}€ × {duration}h</span>
                      <span>{total}€</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                      <span>Total</span>
                      <span>{total}€</span>
                    </div>
                    {duration < minH && (
                      <p className="text-[11px] text-amber-500">Sélectionnez au moins {minH}h pour réserver.</p>
                    )}
                  </div>
                )}

                {studio.engineers.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <Headphones className="size-3" /> Ingénieur son
                    </label>
                    <select
                      value={selectedEngineer}
                      onChange={(e) => setSelectedEngineer(e.target.value)}
                      className="w-full rounded-md border border-border bg-surface/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Sans préférence</option>
                      {studio.engineers.map((eng) => (
                        <option key={eng} value={eng}>{eng}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  disabled={submitting || duration < minH}
                  onClick={handleBooking}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-60 sm:mt-6 sm:py-4"
                >
                  <Calendar className="size-4" /> {submitting ? "Envoi…" : "Réserver"}
                </button>
                <p className="mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Confirmation immédiate
                </p>
              </>
            )}
          </div>
        </aside>
      </section>

      <SiteFooter />
    </div>
  );
}
