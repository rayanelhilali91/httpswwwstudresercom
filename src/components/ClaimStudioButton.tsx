import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Studio } from "@/data/studios";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { createStudioClaim } from "@/lib/claims.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ClaimStudioButton({ studio }: { studio: Studio }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(createStudioClaim);

  // On n'affiche rien pour un studio déjà vérifié ou pour le propriétaire
  if (studio.status === "revendique_verifie") return null;
  if (user && user.id === studio.ownerId) return null;

  // Vérifie si l'utilisateur a déjà un claim pending
  const { data: existingClaim } = useQuery({
    queryKey: ["my-claim", studio.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("studio_claims")
        .select("id, status, created_at")
        .eq("studio_id", studio.id)
        .eq("user_id", user!.id)
        .eq("status", "pending")
        .maybeSingle();
      return data;
    },
  });

  if (existingClaim) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400"
        title="Votre demande est en cours d'examen"
      >
        Demande en cours
      </span>
    );
  }

  const onSubmit = async () => {
    if (notes.trim().length < 10) {
      toast.error("Merci de fournir au moins 10 caractères pour justifier votre demande.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ data: { studio_id: studio.id, verification_notes: notes.trim() } });
      toast.success("Demande envoyée. Un administrateur va l'examiner.");
      setOpen(false);
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["my-claim", studio.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClick = () => {
    if (!user) {
      navigate({ to: "/auth", search: { mode: "login" } });
      toast.info("Connectez-vous pour revendiquer ce studio.");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <ShieldCheck className="size-3.5" /> Revendiquer ce studio
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revendiquer « {studio.name} »</DialogTitle>
            <DialogDescription>
              Justifiez votre demande pour qu'un administrateur puisse vérifier que vous êtes
              bien le propriétaire ou gérant de ce studio. Fournissez par exemple : un email
              professionnel, le site web officiel, un justificatif d'activité, ou tout autre
              élément pertinent.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="claim-notes" className="text-xs font-bold uppercase tracking-wider">
              Justificatifs et coordonnées
            </Label>
            <Textarea
              id="claim-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Email pro contact@monstudio.fr, site web monstudio.fr, je suis le gérant depuis 2019..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground">
              Votre demande sera validée manuellement par l'équipe.
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />} Envoyer la demande
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
