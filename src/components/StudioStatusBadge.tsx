import type { StudioStatus } from "@/data/studios";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Clock, ShieldAlert } from "lucide-react";

export function StudioStatusBadge({
  status,
  size = "md",
}: {
  status: StudioStatus;
  size?: "sm" | "md";
}) {
  if (status === "revendique_verifie") return <VerifiedBadge />;

  const base =
    size === "sm"
      ? "text-[9px] tracking-[0.18em] px-2 py-0.5"
      : "text-[10px] tracking-[0.2em] px-2.5 py-1";

  if (status === "revendication_en_attente") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 font-bold uppercase text-amber-400 ${base}`}
        title="Une demande de revendication est en cours d'examen"
      >
        <Clock className="size-3" /> Revendication en cours
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 font-bold uppercase text-muted-foreground ${base}`}
      title="Cette fiche n'a pas encore été revendiquée par son propriétaire"
    >
      <ShieldAlert className="size-3" /> Profil non vérifié
    </span>
  );
}
