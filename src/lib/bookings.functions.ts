import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  studio_id: z.string().uuid(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  slot_id: z.string().uuid().nullable().optional(),
  room_id: z.string().uuid().nullable().optional(),
  engineer: z.string().trim().min(1).max(120).nullable().optional(),
});

export const createBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verify caller is an artist
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile || profile.account_type !== "artist") {
      throw new Error("Seuls les comptes artiste peuvent réserver.");
    }

    // 2. Load studio (server-side source of truth for price + rules)
    const { data: studio, error: sErr } = await supabase
      .from("studios")
      .select("id, owner_id, price_per_hour, min_booking_hours, max_booking_hours, is_published, is_paused")
      .eq("id", data.studio_id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!studio) throw new Error("Studio introuvable.");
    if (!studio.is_published || studio.is_paused) {
      throw new Error("Ce studio n'est pas disponible à la réservation.");
    }
    if (studio.owner_id === userId) {
      throw new Error("Vous ne pouvez pas réserver votre propre studio.");
    }

    // 2b. If a room is specified, load it and use its rules/price
    let roomPrice = Number(studio.price_per_hour ?? 0);
    let minBookH = studio.min_booking_hours ?? 1;
    let maxBookH = studio.max_booking_hours ?? 24;
    if (data.room_id) {
      const { data: room, error: rErr } = await supabase
        .from("studio_rooms")
        .select("id, studio_id, price_per_hour, min_booking_hours, max_booking_hours, is_active")
        .eq("id", data.room_id)
        .maybeSingle();
      if (rErr) throw new Error(rErr.message);
      if (!room || room.studio_id !== studio.id || !room.is_active) {
        throw new Error("Salle introuvable ou inactive.");
      }
      roomPrice = Number(room.price_per_hour ?? 0);
      minBookH = room.min_booking_hours ?? 1;
      maxBookH = room.max_booking_hours ?? 24;
    }

    // 3. Validate time window
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Dates invalides.");
    }
    if (end <= start) throw new Error("Fin doit être après le début.");
    if (start < new Date()) throw new Error("Impossible de réserver dans le passé.");

    const durationMs = end.getTime() - start.getTime();
    const durationH = durationMs / (1000 * 60 * 60);
    if (!Number.isInteger(durationH) || durationH <= 0) {
      throw new Error("La durée doit être un nombre entier d'heures.");
    }
    if (durationH < minBookH) {
      throw new Error(`Minimum ${minBookH}h de réservation.`);
    }
    if (durationH > maxBookH) {
      throw new Error(`Maximum ${maxBookH}h de réservation.`);
    }

    // 4. Conflict check — no overlapping non-cancelled booking
    //    Scoped by room if a room is specified, otherwise by studio (legacy)
    let conflictQ = supabase
      .from("bookings")
      .select("id")
      .eq("studio_id", studio.id)
      .neq("status", "cancelled")
      .lt("start_at", data.end_at)
      .gt("end_at", data.start_at);
    if (data.room_id) {
      conflictQ = conflictQ.eq("room_id", data.room_id);
    }
    const { data: conflicts, error: cErr } = await conflictQ.limit(1);
    if (cErr) throw new Error(cErr.message);
    if (conflicts && conflicts.length > 0) {
      throw new Error("Ce créneau vient d'être pris. Choisissez-en un autre.");
    }

    // 5. Server-computed price (NEVER trust client)
    const totalPrice = Math.round(roomPrice * durationH * 100) / 100;

    // 6. Insert with computed values
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        studio_id: studio.id,
        artist_id: userId,
        slot_id: data.slot_id ?? null,
        room_id: data.room_id ?? null,
        engineer: data.engineer ?? null,
        start_at: data.start_at,
        end_at: data.end_at,
        total_price: totalPrice,
        status: "confirmed",
      })
      .select("id, total_price, start_at, end_at, status")
      .single();
    if (bErr) throw new Error(bErr.message);

    return { booking };
  });
