import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Compass, MapPin, Tag, Wallet } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Mon espace — [STUD.RESER]" }] }),
  component: ArtistDashboard,
});

function ArtistDashboard() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { mode: "login" } });
    else if (profile?.account_type === "studio") navigate({ to: "/studio/dashboard" });
  }, [user, profile, loading, navigate]);

  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_at, end_at, total_price, status, studios(name, city, image_url)")
        .eq("artist_id", user!.id)
        .order("start_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-6 py-32 text-center text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Espace artiste</span>
        <h1 className="mt-3 font-display text-5xl font-extrabold uppercase leading-none tracking-tighter md:text-7xl">
          Bonjour {profile?.display_name ?? ""}
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Retrouvez vos demandes de réservation et explorez de nouveaux studios.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <Link
            to="/studios"
            className="group rounded-2xl border border-border bg-surface/40 p-6 transition-colors hover:border-primary"
          >
            <Compass className="size-5 text-primary" />
            <p className="mt-4 font-display text-xl font-bold uppercase tracking-tight">Découvrir les studios</p>
            <p className="mt-2 text-sm text-muted-foreground">Parcourez la marketplace et trouvez votre prochain studio.</p>
          </Link>
        </div>

        <section className="mt-16">
          <div className="flex items-center gap-3">
            <Calendar className="size-4 text-primary" />
            <h2 className="font-display text-2xl font-extrabold uppercase tracking-tighter">Mes réservations</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-20 text-center">
              <p className="font-display text-xl font-bold uppercase tracking-tight">Aucune réservation</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Vos sessions apparaîtront ici dès votre première réservation confirmée.
              </p>
            </div>
          ) : (
            (() => {
              const now = Date.now();
              const upcoming = bookings
                .filter((b) => new Date(b.end_at).getTime() > now && b.status !== "completed" && b.status !== "cancelled")
                .sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at));
              const past = bookings
                .filter((b) => !(new Date(b.end_at).getTime() > now && b.status !== "completed" && b.status !== "cancelled"))
                .sort((a, b) => +new Date(b.start_at) - +new Date(a.start_at));
              return (
                <div className="mt-6 space-y-10">
                  <BookingGroup title="À venir" items={upcoming} empty="Aucune session planifiée." />
                  <BookingGroup title="Historique" items={past} empty="Aucune session passée." />
                </div>
              );
            })()
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type ArtistBooking = {
  id: string;
  start_at: string;
  end_at: string;
  total_price: number;
  status: string;
  studios: { name: string; city: string | null; image_url: string | null } | null;
};

function getEffectiveStatus(b: ArtistBooking): { label: string; tone: "primary" | "muted" | "destructive" | "success" } {
  if (b.status === "cancelled") return { label: "Annulée", tone: "destructive" };
  const ended = new Date(b.end_at).getTime() <= Date.now();
  if (b.status === "completed" || ended) return { label: "Session finalisée", tone: "success" };
  if (b.status === "confirmed") {
    const started = new Date(b.start_at).getTime() <= Date.now();
    return { label: started ? "En cours" : "Confirmée", tone: "primary" };
  }
  if (b.status === "pending") return { label: "En attente", tone: "muted" };
  return { label: b.status, tone: "muted" };
}

function BookingGroup({ title, items, empty }: { title: string; items: ArtistBooking[]; empty: string }) {
  return (
    <div>
      <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-muted-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((b) => {
            const start = new Date(b.start_at);
            const end = new Date(b.end_at);
            const hours = Math.max(1, Math.round((+end - +start) / 36e5));
            const status = getEffectiveStatus(b);
            const toneClass =
              status.tone === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : status.tone === "destructive"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : status.tone === "muted"
                ? "border-border bg-muted/40 text-muted-foreground"
                : "border-primary/30 bg-primary/10 text-primary";
            return (
              <li
                key={b.id}
                className="grid gap-4 rounded-xl border border-border bg-surface/40 p-4 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6 md:p-5"
              >
                {b.studios?.image_url ? (
                  <img src={b.studios.image_url} alt={b.studios.name} className="size-20 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="size-20 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="font-display text-lg font-bold uppercase tracking-tight">{b.studios?.name ?? "Studio"}</p>
                    {b.studios?.city && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {b.studios.city}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3" />
                      {start.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3" />
                      {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → {end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Tag className="size-3" />
                      Durée : {hours}h
                    </span>
                  </div>
                </div>
                <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-end md:justify-center">
                  <p className="flex items-center gap-1.5 font-display text-xl font-bold">
                    <Wallet className="size-4 text-primary" />
                    {Number(b.total_price)}€
                  </p>
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] ${toneClass}`}>
                    {status.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
