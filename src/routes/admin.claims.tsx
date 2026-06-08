import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, ShieldX, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  listAllStudioClaims,
  approveStudioClaim,
  rejectStudioClaim,
} from "@/lib/claims.functions";

export const Route = createFileRoute("/admin/claims")({
  head: () => ({ meta: [{ title: "Revendications — Admin [STUD.RESER]" }] }),
  component: AdminClaimsPage,
});

type Tab = "pending" | "history";

function AdminClaimsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  // Vérification du rôle admin côté client (la sécurité réelle est server-side)
  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) navigate({ to: "/auth", search: { mode: "login" } });
    else if (isAdmin === false) navigate({ to: "/" });
  }, [user, isAdmin, loading, roleLoading, navigate]);

  const fetchClaims = useServerFn(listAllStudioClaims);
  const approveFn = useServerFn(approveStudioClaim);
  const rejectFn = useServerFn(rejectStudioClaim);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    enabled: isAdmin === true,
    queryFn: async () => fetchClaims(),
  });

  if (loading || roleLoading || !user || isAdmin !== true) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-7xl px-6 py-32 text-center text-muted-foreground">
          Chargement…
        </div>
      </div>
    );
  }

  const claims = data?.claims ?? [];
  const pending = claims.filter((c: any) => c.status === "pending");
  const history = claims.filter((c: any) => c.status !== "pending");
  const list = tab === "pending" ? pending : history;

  const handleApprove = async (claimId: string) => {
    if (!confirm("Confirmer l'approbation : le studio sera transféré au demandeur.")) return;
    setProcessing(claimId);
    try {
      await approveFn({ data: { claim_id: claimId } });
      toast.success("Revendication approuvée.");
      await qc.invalidateQueries({ queryKey: ["admin-claims"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (claimId: string) => {
    const reason = prompt("Motif du refus (optionnel) :");
    if (reason === null) return;
    setProcessing(claimId);
    try {
      await rejectFn({ data: { claim_id: claimId, reason: reason || undefined } });
      toast.success("Revendication refusée.");
      await qc.invalidateQueries({ queryKey: ["admin-claims"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Retour
        </Link>
        <span className="mt-6 block text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
          Administration
        </span>
        <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tighter md:text-6xl">
          Revendications de studios
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Approuvez ou refusez les demandes de prise en main des fiches studios. Aucun accès
          n'est accordé sans validation manuelle.
        </p>

        <div className="mt-8 flex gap-1 border-b border-border">
          {[
            { id: "pending" as Tab, label: `En attente (${pending.length})` },
            { id: "history" as Tab, label: `Historique (${history.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                tab === t.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground">Chargement…</p>
          ) : list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
              Aucune revendication {tab === "pending" ? "en attente" : "dans l'historique"}.
            </p>
          ) : (
            list.map((c: any) => (
              <article
                key={c.id}
                className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/studios/$studioId"
                        params={{ studioId: c.studio_id }}
                        className="font-display text-xl font-bold uppercase tracking-tight hover:text-primary"
                      >
                        {c.studios?.name ?? "Studio"}
                      </Link>
                      {c.studios?.city && (
                        <span className="text-xs text-muted-foreground">
                          · {c.studios.city}
                          {c.studios.country ? `, ${c.studios.country}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Demande de{" "}
                      <span className="text-foreground">
                        {c.profiles?.display_name ?? "Utilisateur"}
                      </span>{" "}
                      · {new Date(c.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                {c.verification_notes && (
                  <div className="mt-4 rounded-lg border border-border bg-background/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Justificatifs fournis
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {c.verification_notes}
                    </p>
                  </div>
                )}

                {c.rejection_reason && (
                  <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">
                      Motif du refus
                    </p>
                    <p className="mt-2 text-sm text-foreground">{c.rejection_reason}</p>
                  </div>
                )}

                {c.status === "pending" && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleApprove(c.id)}
                      disabled={processing === c.id}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {processing === c.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-4" />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      disabled={processing === c.id}
                      className="inline-flex items-center gap-2 rounded-full border border-destructive/60 px-5 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
                    >
                      <ShieldX className="size-4" /> Refuser
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        Approuvée
      </span>
    );
  if (status === "rejected")
    return (
      <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
        Refusée
      </span>
    );
  return (
    <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
      En attente
    </span>
  );
}
