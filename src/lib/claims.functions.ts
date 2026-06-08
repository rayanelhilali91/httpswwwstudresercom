import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateInput = z.object({
  studio_id: z.string().uuid(),
  verification_notes: z.string().trim().min(10).max(2000),
});

export const createStudioClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier que le studio existe et n'est pas déjà vérifié
    const { data: studio, error: sErr } = await supabase
      .from("studios")
      .select("id, owner_id, status, name")
      .eq("id", data.studio_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!studio) throw new Error("Studio introuvable.");
    if (studio.status === "revendique_verifie") {
      throw new Error("Ce studio a déjà été revendiqué.");
    }
    if (studio.owner_id === userId) {
      throw new Error("Vous êtes déjà propriétaire de ce studio.");
    }

    // Empêcher les doublons pending pour le même utilisateur
    const { data: existing } = await supabase
      .from("studio_claims")
      .select("id")
      .eq("studio_id", data.studio_id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      throw new Error("Vous avez déjà une demande en cours sur ce studio.");
    }

    const { data: claim, error: cErr } = await supabase
      .from("studio_claims")
      .insert({
        studio_id: data.studio_id,
        user_id: userId,
        verification_notes: data.verification_notes,
      })
      .select("id, status, created_at")
      .single();
    if (cErr) throw new Error(cErr.message);

    return { claim };
  });

export const listMyStudioClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("studio_claims")
      .select(
        "id, studio_id, status, verification_notes, rejection_reason, created_at, reviewed_at, studios(name, city, country, image_url)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { claims: data ?? [] };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès refusé : rôle administrateur requis.");
}

export const listAllStudioClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data, error } = await supabase
      .from("studio_claims")
      .select(
        "id, studio_id, user_id, status, verification_notes, rejection_reason, admin_notes, created_at, reviewed_at, reviewed_by, studios(name, city, country, image_url, status), profiles:user_id(display_name)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { claims: data ?? [] };
  });

const ApproveInput = z.object({ claim_id: z.string().uuid() });

export const approveStudioClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ApproveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.rpc("approve_studio_claim", {
      _claim_id: data.claim_id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RejectInput = z.object({
  claim_id: z.string().uuid(),
  reason: z.string().trim().max(1000).optional(),
});

export const rejectStudioClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => RejectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase.rpc("reject_studio_claim", {
      _claim_id: data.claim_id,
      _reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
