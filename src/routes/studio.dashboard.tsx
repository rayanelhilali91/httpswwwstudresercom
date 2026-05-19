import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Check,
  Copy,
  ImageIcon,
  Inbox,
  Link2,
  Pause,
  Play,
  Plus,
  Save,
  Settings2,
  Sliders,
  Users,
  Trash2,
} from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StudioImageUploader } from "@/components/StudioImageUploader";
import { StudioCalendarManager } from "@/components/StudioCalendarManager";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/studio/dashboard")({
  head: () => ({ meta: [{ title: "Espace studio — [STUD.RESER]" }] }),
  component: StudioDashboard,
});

type StudioRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  address: string | null;
  tagline: string | null;
  description: string | null;
  price_per_hour: number | null;
  capacity: number | null;
  image_url: string | null;
  gallery: unknown;
  genres: string[] | null;
  equipment: string[] | null;
  engineers: string[] | null;
  is_published: boolean;
  is_verified: boolean;
  is_paused: boolean;
  min_booking_hours: number;
  max_booking_hours: number;
  instagram_url: string | null;
  tiktok_url: string | null;
  snapchat_url: string | null;
};

type RoomRow = {
  id: string;
  studio_id: string;
  name: string;
  price_per_hour: number;
  min_booking_hours: number;
  max_booking_hours: number;
  is_active: boolean;
  position: number;
};

type Tab = "profile" | "photos" | "calendar" | "bookings";

function StudioDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("bookings");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { mode: "login" } });
    else if (profile?.account_type === "artist") navigate({ to: "/dashboard" });
  }, [user, profile, loading, navigate]);

  const { data: studio, isLoading: loadingStudio } = useQuery({
    queryKey: ["my-studio", user?.id],
    enabled: !!user && profile?.account_type === "studio",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .eq("owner_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as StudioRow | null;
    },
  });

  const isStudioDraft =
    !!studio &&
    !studio.is_published &&
    !studio.city &&
    !studio.country &&
    !studio.description &&
    Number(studio.price_per_hour ?? 0) === 0;

  // Si le studio n'est pas encore configuré, on bascule sur l'onglet Profil (onboarding)
  useEffect(() => {
    if (!loadingStudio && (!studio || isStudioDraft) && tab !== "profile") {
      setTab("profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingStudio, studio?.id, isStudioDraft]);

  const { data: bookings = [] } = useQuery({
    queryKey: ["studio-bookings", studio?.id],
    enabled: !!studio?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, total_price, status, artist_id")
        .eq("studio_id", studio!.id)
        .order("start_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const artistIds = Array.from(new Set(rows.map((r) => r.artist_id).filter(Boolean)));
      let profilesById = new Map<string, { display_name: string | null }>();
      if (artistIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", artistIds);
        profilesById = new Map((profs ?? []).map((p) => [p.id, { display_name: p.display_name }]));
      }
      return rows.map((r) => ({ ...r, profiles: profilesById.get(r.artist_id) ?? null }));
    },
  });

  if (loading || loadingStudio || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-6 py-32 text-center text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Settings2; disabled?: boolean }[] = [
    { id: "bookings", label: "Réservations", icon: Inbox, disabled: !studio || isStudioDraft },
    { id: "calendar", label: "Calendrier", icon: CalendarDays, disabled: !studio || isStudioDraft },
    { id: "photos", label: "Photos", icon: ImageIcon, disabled: !studio || isStudioDraft },
    { id: "profile", label: "Profil", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-14">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Espace studio
          </span>
          {studio?.is_verified && <VerifiedBadge />}
          {studio && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                studio.is_paused
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-400"
                  : studio.is_published
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {studio.is_paused ? "En pause" : studio.is_published ? "Publié" : "Brouillon"}
            </span>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-extrabold uppercase leading-none tracking-tighter md:text-5xl">
          {studio?.name ?? profile?.display_name ?? "Mon studio"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Gérez votre profil, vos photos, vos disponibilités et vos réservations depuis un seul
          endroit.
        </p>

        {(!studio || isStudioDraft) && <OnboardingHint />}
        {studio && !isStudioDraft && <ShareStudioCard studioId={studio.id} studioName={studio.name} isPublished={studio.is_published} isPaused={studio.is_paused} />}

        <div className="mt-8 -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <div className="flex min-w-max gap-1 border-b border-border md:min-w-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => !t.disabled && setTab(t.id)}
                disabled={t.disabled}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="size-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {tab === "profile" && (
            <div className="space-y-8">
              <StudioForm
                studio={studio}
                ownerId={user.id}
                defaultName={profile?.display_name ?? ""}
                onSaved={(created) => {
                  qc.invalidateQueries({ queryKey: ["my-studio", user.id] });
                  if (created) setTab("photos");
                }}
              />
              {studio && <RoomsManager studioId={studio.id} />}
            </div>
          )}
          {tab === "photos" && studio && (
            <StudioImageUploader
              ownerId={user.id}
              studioId={studio.id}
              imageUrl={studio.image_url}
              gallery={Array.isArray(studio.gallery) ? (studio.gallery as string[]) : []}
              onChange={async ({ imageUrl, gallery }) => {
                const { error } = await supabase
                  .from("studios")
                  .update({ image_url: imageUrl, gallery, updated_at: new Date().toISOString() })
                  .eq("id", studio.id);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                await qc.invalidateQueries({ queryKey: ["my-studio", user.id] });
              }}
            />
          )}
          {tab === "calendar" && <StudioCalendarManager studioId={studio?.id} />}
          {tab === "bookings" && <BookingsList bookings={bookings} />}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ShareStudioCard({
  studioId,
  studioName,
  isPublished,
  isPaused,
}: {
  studioId: string;
  studioName: string;
  isPublished: boolean;
  isPaused: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const url = `https://studreser.com/studios/${studioId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const notLive = !isPublished || isPaused;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
            <Link2 className="size-4" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Partager mon studio
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold uppercase tracking-tight md:text-xl">
              Votre lien public Stud.Reser
            </h2>
          </div>
        </div>
        {notLive && (
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
            {isPaused ? "En pause" : "Brouillon"}
          </span>
        )}
      </div>

      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Collez ce lien dans votre bio Instagram, TikTok ou Snapchat pour que vos contacts puissent
        réserver votre studio en un clic.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2.5">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copié" : "Copier le lien"}
        </button>
      </div>

      {notLive && (
        <p className="mt-4 text-xs text-amber-400/90">
          Astuce : votre studio doit être <strong>publié</strong> et non en pause pour être
          visible publiquement depuis ce lien.
        </p>
      )}
    </div>
  );
}


function OnboardingHint() {
  const steps = [
    "Renseignez les informations de base",
    "Ajoutez des photos pour vous démarquer",
    "Ouvrez votre calendrier de disponibilités",
    "Recevez vos premières réservations",
  ];
  return (
    <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Bienvenue</p>
      <p className="mt-2 font-display text-xl font-bold uppercase tracking-tight md:text-2xl">
        Configurez votre studio en 4 étapes.
      </p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StudioForm({
  studio,
  ownerId,
  defaultName,
  onSaved,
}: {
  studio: StudioRow | null | undefined;
  ownerId: string;
  defaultName: string;
  onSaved: (created: boolean) => void;
}) {
  const [name, setName] = useState(studio?.name ?? defaultName ?? "");
  const [city, setCity] = useState(studio?.city ?? "");
  const [country, setCountry] = useState(studio?.country ?? "");
  const [address, setAddress] = useState(studio?.address ?? "");
  const [tagline, setTagline] = useState(studio?.tagline ?? "");
  const [description, setDescription] = useState(studio?.description ?? "");
  const [pricePerHour, setPricePerHour] = useState<string>(
    studio?.price_per_hour != null ? String(studio.price_per_hour) : "",
  );
  const [capacity, setCapacity] = useState<string>(String(studio?.capacity ?? 1));
  const [genres, setGenres] = useState((studio?.genres ?? []).join(", "));
  const [equipment, setEquipment] = useState((studio?.equipment ?? []).join(", "));
  const [engineers, setEngineers] = useState((studio?.engineers ?? []).join(", "));
  const [published, setPublished] = useState(studio?.is_published ?? true);
  const [minHours, setMinHours] = useState<string>(String(studio?.min_booking_hours ?? 2));
  const [instagramUrl, setInstagramUrl] = useState(studio?.instagram_url ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(studio?.tiktok_url ?? "");
  const [snapchatUrl, setSnapchatUrl] = useState(studio?.snapchat_url ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (studio) {
      setName(studio.name);
      setCity(studio.city ?? "");
      setCountry(studio.country ?? "");
      setAddress(studio.address ?? "");
      setTagline(studio.tagline ?? "");
      setDescription(studio.description ?? "");
      setPricePerHour(studio.price_per_hour != null ? String(studio.price_per_hour) : "");
      setCapacity(String(studio.capacity ?? 1));
      setGenres((studio.genres ?? []).join(", "));
      setEquipment((studio.equipment ?? []).join(", "));
      setEngineers((studio.engineers ?? []).join(", "));
      setPublished(studio.is_published);
      setMinHours(String(studio.min_booking_hours ?? 2));
      setInstagramUrl(studio.instagram_url ?? "");
      setTiktokUrl(studio.tiktok_url ?? "");
      setSnapchatUrl(studio.snapchat_url ?? "");
    }
  }, [studio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom du studio est requis.");
      return;
    }
    const minH = Math.max(1, Math.min(24, Number(minHours) || 2));
    setSaving(true);

    // Géocodage automatique de l'adresse pour les recherches par distance
    let lat: number | null = null;
    let lon: number | null = null;
    const addressCandidates = [
      [address.trim(), city.trim(), country.trim()],
      [address.trim(), city.trim(), "France"],
      [city.trim(), country.trim()],
      [city.trim(), "France"],
    ]
      .map((parts) => parts.filter(Boolean).join(", ").trim())
      .filter((value, index, arr) => value && arr.indexOf(value) === index);
    if (addressCandidates.length > 0) {
      const { geocodeAddress } = await import("@/lib/geo");
      for (const candidate of addressCandidates) {
        const geo = await geocodeAddress(candidate);
        if (geo) {
          lat = geo.lat;
          lon = geo.lon;
          break;
        }
      }
    }

    const payload: Record<string, unknown> = {
      owner_id: ownerId,
      name: name.trim(),
      city: city.trim() || null,
      country: country.trim() || null,
      address: address.trim() || null,
      tagline: tagline.trim() || null,
      description: description.trim() || null,
      price_per_hour: pricePerHour ? Number(pricePerHour) : 0,
      capacity: capacity ? Number(capacity) : 1,
      genres: genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      equipment: equipment
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      engineers: engineers
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      is_published: published,
      min_booking_hours: minH,
      instagram_url: instagramUrl.trim() || null,
      tiktok_url: tiktokUrl.trim() || null,
      snapchat_url: snapchatUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (lat !== null && lon !== null) {
      payload.latitude = lat;
      payload.longitude = lon;
    }
    const { error } = studio
      ? await supabase
          .from("studios")
          .update(payload as never)
          .eq("id", studio.id)
      : await supabase.from("studios").insert(payload as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(studio ? "Profil studio mis à jour." : "Studio créé et publié !");
    onSaved(!studio);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {saving && !studio && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 px-6 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10">
              <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
            <h3 className="mt-5 font-display text-2xl font-extrabold uppercase tracking-tight">
              Enregistrement en cours
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Votre studio est en cours d'ajout sur la plateforme. Cela peut prendre quelques
              instants. Il apparaîtra automatiquement dans la marketplace une fois l'enregistrement
              terminé.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Veuillez patienter
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
            Informations du studio
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em]">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="accent-primary"
            />
            {published ? (
              <span className="inline-flex items-center gap-1 text-primary">
                <CheckCircle2 className="size-3" /> Publié
              </span>
            ) : (
              <span className="text-muted-foreground">Brouillon</span>
            )}
          </label>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Nom du studio" value={name} onChange={setName} required />
          <FormField
            label="Tarif horaire (€)"
            value={pricePerHour}
            onChange={setPricePerHour}
            type="number"
            inputMode="decimal"
          />
          <FormField label="Ville" value={city} onChange={setCity} />
          <FormField label="Pays" value={country} onChange={setCountry} />
          <FormField
            label="Capacité (personnes)"
            value={capacity}
            onChange={setCapacity}
            type="number"
            inputMode="numeric"
          />
          <FormField label="Accroche" value={tagline} onChange={setTagline} />
          <div className="sm:col-span-2">
            <FormField
              label="Adresse complète (pour la carte)"
              value={address}
              onChange={setAddress}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-md border border-border bg-background/40 px-3 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <FormField label="Genres (séparés par ,)" value={genres} onChange={setGenres} />
          <FormField label="Matériel (séparés par ,)" value={equipment} onChange={setEquipment} />
          <div className="sm:col-span-2">
            <FormField
              label="Ingénieurs son (séparés par ,)"
              value={engineers}
              onChange={setEngineers}
              placeholder="Ex : Marc Dupont, Sarah L., Yann"
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="size-3" />
              Ces noms apparaîtront sur la page publique du studio.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
          Réseaux sociaux
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Renforcez votre visibilité : ces liens apparaîtront sur la page publique de votre studio.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Instagram (URL)"
            value={instagramUrl}
            onChange={setInstagramUrl}
            placeholder="https://instagram.com/votre-studio"
          />
          <FormField
            label="TikTok (URL)"
            value={tiktokUrl}
            onChange={setTiktokUrl}
            placeholder="https://tiktok.com/@votre-studio"
          />
          <div className="sm:col-span-2">
            <FormField
              label="Snapchat (URL)"
              value={snapchatUrl}
              onChange={setSnapchatUrl}
              placeholder="https://snapchat.com/add/votre-studio"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
        <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
          Règles de réservation
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Définissez uniquement la durée minimale qu'un artiste doit réserver dans vos plages
          horaires.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setMinHours(String(h))}
              className={`rounded-md border px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all ${
                minHours === String(h)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-primary hover:text-foreground"
              }`}
            >
              Minimum {h}h
            </button>
          ))}
        </div>
        <div className="mt-4 max-w-xs">
          <FormField
            label="Autre minimum (heures)"
            value={minHours}
            onChange={setMinHours}
            type="number"
            inputMode="numeric"
          />
        </div>
      </div>

      {studio && <DangerZone studio={studio} />}

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-foreground disabled:opacity-60 md:w-auto md:py-4"
        >
          <Save className="size-4" />{" "}
          {saving
            ? "Enregistrement…"
            : studio
              ? "Enregistrer les modifications"
              : "Créer le studio"}
        </button>
      </div>
    </form>
  );
}

function DangerZone({ studio }: { studio: StudioRow }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const togglePause = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("studios")
      .update({ is_paused: !studio.is_paused, updated_at: new Date().toISOString() })
      .eq("id", studio.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(
      studio.is_paused
        ? "Studio réactivé."
        : "Studio mis en pause. Il n'est plus visible publiquement.",
    );
    qc.invalidateQueries({ queryKey: ["my-studio"] });
  };

  const deleteStudio = async () => {
    if (
      !confirm(
        "Supprimer définitivement votre studio ? Cette action est irréversible. Les réservations associées resteront archivées.",
      )
    )
      return;
    setBusy(true);
    const { error: slotsErr } = await supabase
      .from("studio_slots")
      .delete()
      .eq("studio_id", studio.id);
    if (slotsErr) {
      setBusy(false);
      return toast.error(slotsErr.message);
    }
    const { error } = await supabase.from("studios").delete().eq("id", studio.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Studio supprimé.");
    qc.invalidateQueries({ queryKey: ["my-studio"] });
    navigate({ to: "/" });
  };

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
            Zone sensible
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mettez votre studio en pause pour le masquer temporairement, ou supprimez-le
            définitivement.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={togglePause}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background/40 px-4 py-3 text-xs font-bold uppercase tracking-wider hover:border-foreground disabled:opacity-60"
        >
          {studio.is_paused ? (
            <>
              <Play className="size-3.5" /> Réactiver le studio
            </>
          ) : (
            <>
              <Pause className="size-3.5" /> Mettre en pause
            </>
          )}
        </button>
        <button
          type="button"
          onClick={deleteStudio}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs font-bold uppercase tracking-wider text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-60"
        >
          <Trash2 className="size-3.5" /> Supprimer définitivement
        </button>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-border bg-background/40 px-3 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}

type Booking = {
  id: string;
  start_at: string;
  end_at: string;
  total_price: number;
  status: string;
  artist_id: string;
  profiles?: { display_name: string | null } | null;
};

function BookingsList({ bookings }: { bookings: Booking[] }) {
  const now = Date.now();
  const upcoming = bookings
    .filter((b) => new Date(b.end_at).getTime() >= now)
    .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
  const past = bookings.filter((b) => new Date(b.end_at).getTime() < now);
  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((s, b) => s + Number(b.total_price), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Réservations" value={String(bookings.length)} />
        <Stat label="À venir" value={String(upcoming.length)} />
        <Stat label="Revenus cumulés" value={`${totalRevenue}€`} />
      </div>

      <Section title="À venir" empty="Aucune session planifiée pour l'instant." items={upcoming} />
      <Section title="Historique" empty="Aucune session passée." items={past} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

function Section({ title, empty, items }: { title: string; empty: string; items: Booking[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
      <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-12 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {items.map((b) => {
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            const hours = Math.round((+end - +start) / 36e5);
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold uppercase tracking-tight">
                    {b.profiles?.display_name ?? "Artiste"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {start.toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {" · "}
                    {start.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    → {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {hours}h
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    {b.status === "confirmed" ? "Confirmée" : b.status}
                  </span>
                  <span className="font-display text-base font-bold">{Number(b.total_price)}€</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RoomsManager({ studioId }: { studioId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["studio-rooms-manage", studioId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_rooms")
        .select("id, studio_id, name, price_per_hour, min_booking_hours, max_booking_hours, is_active, position")
        .eq("studio_id", studioId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RoomRow[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["studio-rooms-manage", studioId] });

  const addRoom = async () => {
    setBusy(true);
    const { error } = await supabase.from("studio_rooms").insert({
      studio_id: studioId,
      name: `Salle ${rooms.length + 1}`,
      price_per_hour: 0,
      min_booking_hours: 1,
      max_booking_hours: 12,
      is_active: true,
      position: rooms.length,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Salle ajoutée.");
    refresh();
  };

  const updateRoom = async (id: string, patch: Partial<RoomRow>) => {
    const { error } = await supabase
      .from("studio_rooms")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeRoom = async (id: string) => {
    if (!confirm("Supprimer cette salle ? Les réservations associées seront conservées (sans salle).")) return;
    const { error } = await supabase.from("studio_rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Salle supprimée.");
    refresh();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Sliders className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-tight md:text-xl">
              Salles du studio
            </h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">
              Plusieurs espaces dans votre établissement ? Créez une salle par espace avec son propre tarif et ses propres règles. Les artistes pourront choisir la salle au moment de la réservation. Si vous n'avez qu'un seul espace, laissez cette section vide — le tarif principal du studio s'appliquera.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={addRoom}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> Ajouter une salle
        </button>
      </div>

      {isLoading ? (
        <p className="mt-5 text-xs text-muted-foreground">Chargement…</p>
      ) : rooms.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
          Aucune salle pour le moment.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rooms.map((r) => (
            <RoomRowEditor key={r.id} room={r} onSave={(patch) => { void updateRoom(r.id, patch); }} onDelete={() => { void removeRoom(r.id); }} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RoomRowEditor({
  room,
  onSave,
  onDelete,
}: {
  room: RoomRow;
  onSave: (patch: Partial<RoomRow>) => void | Promise<void>;
  onDelete: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [price, setPrice] = useState(String(room.price_per_hour ?? 0));
  const [minH, setMinH] = useState(String(room.min_booking_hours ?? 1));
  const [maxH, setMaxH] = useState(String(room.max_booking_hours ?? 12));
  const [active, setActive] = useState(room.is_active);

  useEffect(() => {
    setName(room.name);
    setPrice(String(room.price_per_hour ?? 0));
    setMinH(String(room.min_booking_hours ?? 1));
    setMaxH(String(room.max_booking_hours ?? 12));
    setActive(room.is_active);
  }, [room.id, room.name, room.price_per_hour, room.min_booking_hours, room.max_booking_hours, room.is_active]);

  const dirty =
    name !== room.name ||
    Number(price) !== Number(room.price_per_hour) ||
    Number(minH) !== room.min_booking_hours ||
    Number(maxH) !== room.max_booking_hours ||
    active !== room.is_active;

  const save = () => {
    if (!name.trim()) return toast.error("Le nom de la salle est requis.");
    const mn = Math.max(1, Math.min(24, Number(minH) || 1));
    const mx = Math.max(mn, Math.min(24, Number(maxH) || 12));
    onSave({
      name: name.trim(),
      price_per_hour: Number(price) || 0,
      min_booking_hours: mn,
      max_booking_hours: mx,
      is_active: active,
    });
  };

  return (
    <li className="rounded-xl border border-border bg-background/40 p-4">
      <div className="grid gap-3 sm:grid-cols-12">
        <div className="sm:col-span-4">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tarif €/h</label>
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Min h</label>
          <input
            type="number"
            inputMode="numeric"
            value={minH}
            onChange={(e) => setMinH(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Max h</label>
          <input
            type="number"
            inputMode="numeric"
            value={maxH}
            onChange={(e) => setMaxH(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-primary"
            />
            {active ? "Actif" : "Inactif"}
          </label>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
        >
          <Trash2 className="size-3" /> Supprimer
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-50"
        >
          <Save className="size-3" /> Enregistrer
        </button>
      </div>
    </li>
  );
}
