import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Trash2, Plus, Clock, CheckSquare, Square, X, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Slot = { id: string; start_at: string; end_at: string; is_booked: boolean };
type BookingRange = { start_at: string; end_at: string };

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function StudioCalendarManager({ studioId }: { studioId: string | undefined }) {
  const qc = useQueryClient();
  const today = ymd(new Date());

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("22:00");
  const [allDay, setAllDay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [roomId, setRoomId] = useState<string | "none">("none");

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleMany = (ids: string[], select: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const { data: rooms = [] } = useQuery({
    queryKey: ["studio-rooms-manager", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_rooms")
        .select("id, name, is_active, position")
        .eq("studio_id", studioId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; is_active: boolean; position: number }[];
    },
  });

  const effectiveRoomId = roomId === "none" ? null : roomId;

  const { data: slots = [] } = useQuery({
    queryKey: ["studio-slots-manager", studioId, effectiveRoomId],
    enabled: !!studioId,
    queryFn: async () => {
      let q = supabase
        .from("studio_slots")
        .select("id, start_at, end_at, is_booked, room_id")
        .eq("studio_id", studioId!)
        .gte("end_at", new Date().toISOString())
        .order("start_at");
      q = effectiveRoomId ? q.eq("room_id", effectiveRoomId) : q.is("room_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });


  // Réservations actives — utilisées pour verrouiller des créneaux/journées qui
  // chevauchent une réservation, indépendamment du flag is_booked.
  const { data: bookings = [] } = useQuery({
    queryKey: ["studio-bookings-manager", studioId, effectiveRoomId],
    enabled: !!studioId,
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("start_at, end_at, status, room_id")
        .eq("studio_id", studioId!)
        .gte("end_at", new Date().toISOString())
        .neq("status", "cancelled");
      q = effectiveRoomId ? q.eq("room_id", effectiveRoomId) : q.is("room_id", null);
      const { data, error } = await q;
      if (error) return [] as BookingRange[];
      return (data ?? []) as BookingRange[];
    },
  });


  const isSlotLocked = (s: Slot) => {
    if (s.is_booked) return true;
    const ss = new Date(s.start_at).getTime();
    const se = new Date(s.end_at).getTime();
    return bookings.some((b) => {
      const bs = new Date(b.start_at).getTime();
      const be = new Date(b.end_at).getTime();
      return ss < be && se > bs;
    });
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = ymd(new Date(s.start_at));
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  if (!studioId) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Enregistrez d'abord les informations du studio pour gérer le calendrier.
      </div>
    );
  }

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["studio-slots-manager", studioId] });
    qc.invalidateQueries({ queryKey: ["studio-bookings-manager", studioId] });
  };


  const addAvailability = async () => {
    if (!from || !to) return toast.error("Sélectionnez une période.");
    if (from > to) return toast.error("La date de fin doit être après la date de début.");

    const sTime = allDay ? "00:00" : start;
    const eTime = allDay ? "23:59" : end;
    if (!allDay && eTime <= sTime) return toast.error("L'heure de fin doit être après l'heure de début.");

    setBusy(true);
    const rows: { studio_id: string; start_at: string; end_at: string; room_id: string | null }[] = [];
    const fromD = new Date(`${from}T00:00:00`);
    const toD = new Date(`${to}T00:00:00`);
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      const [sh, sm] = sTime.split(":").map(Number);
      const [eh, em] = eTime.split(":").map(Number);
      const ds = new Date(d);
      ds.setHours(sh, sm, 0, 0);
      const de = new Date(d);
      de.setHours(eh, em, 0, 0);
      if (eh === 23 && em === 59) {
        de.setHours(24, 0, 0, 0);
      }
      rows.push({ studio_id: studioId, start_at: ds.toISOString(), end_at: de.toISOString(), room_id: effectiveRoomId });
    }

    const { error } = await supabase.from("studio_slots").insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} disponibilité(s) ajoutée(s).`);
    refresh();
  };

  const removeSlot = async (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (slot && isSlotLocked(slot)) {
      toast.error("Créneau verrouillé : une réservation active existe sur cette période.");
      return;
    }
    const { error } = await supabase.from("studio_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const removeDay = async (day: string, daySlots: Slot[]) => {
    const free = daySlots.filter((s) => !isSlotLocked(s));
    const locked = daySlots.length - free.length;
    if (free.length === 0) {
      toast.error("Journée verrouillée : toutes les disponibilités sont liées à une réservation.");
      return;
    }
    const msg = locked > 0
      ? `Supprimer ${free.length} disponibilité(s) libre(s) du ${formatDay(day)} ? (${locked} créneau(x) réservé(s) seront conservés)`
      : `Supprimer toutes les disponibilités du ${formatDay(day)} ?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("studio_slots").delete().in("id", free.map((s) => s.id));
    if (error) return toast.error(error.message);
    toast.success("Journée nettoyée.");
    refresh();
  };

  const removeSelected = async () => {
    const ids = Array.from(selected);
    const safeIds = ids.filter((id) => {
      const s = slots.find((x) => x.id === id);
      return s && !isSlotLocked(s);
    });
    const blocked = ids.length - safeIds.length;
    if (safeIds.length === 0) {
      toast.error("Aucun créneau supprimable : tous sont liés à une réservation.");
      return;
    }
    const msg = blocked > 0
      ? `Supprimer ${safeIds.length} créneau(x) ? (${blocked} verrouillé(s) par une réservation seront conservés)`
      : `Supprimer ${safeIds.length} créneau${safeIds.length > 1 ? "x" : ""} sélectionné${safeIds.length > 1 ? "s" : ""} ?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("studio_slots").delete().in("id", safeIds);
    if (error) return toast.error(error.message);
    toast.success(`${safeIds.length} créneau(x) supprimé(s).`);
    clearSelection();
    refresh();
  };

  const allFreeIds = slots.filter((s) => !isSlotLocked(s)).map((s) => s.id);
  const allSelected = allFreeIds.length > 0 && allFreeIds.every((id) => selected.has(id));

  return (
    <div className="space-y-6">
      {/* FORMULAIRE — Simple et direct */}
      <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-tight">
              Ajouter une disponibilité
            </h2>
            <p className="text-xs text-muted-foreground">
              Choisissez une période et une plage horaire. C'est tout.
            </p>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="mt-5">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Salle
            </label>
            <select
              value={roomId}
              onChange={(e) => { setRoomId(e.target.value as string | "none"); clearSelection(); }}
              className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="none">Studio entier (pas de salle)</option>
              {rooms.filter((r) => r.is_active).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Les disponibilités et réservations affichées correspondent à la salle sélectionnée.
            </p>
          </div>
        )}


        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Du
            </label>
            <input
              type="date"
              value={from}
              min={today}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Au
            </label>
            <input
              type="date"
              value={to}
              min={from || today}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="accent-primary"
          />
          <Clock className="size-3" /> Ouvert 24h/24
        </label>

        {!allDay && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Heure de début
              </label>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Heure de fin
              </label>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        <button
          onClick={addAvailability}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-60"
        >
          <Plus className="size-4" /> {busy ? "Enregistrement…" : "Enregistrer la disponibilité"}
        </button>
      </div>

      {/* LISTE — Disponibilités existantes */}
      <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold uppercase tracking-tight">
            Disponibilités à venir
          </h3>
          <div className="flex items-center gap-2">
            {allFreeIds.length > 0 && (
              <button
                onClick={() => toggleMany(allFreeIds, !allSelected)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {allSelected ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
                {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>
            )}
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {slots.length} créneau{slots.length > 1 ? "x" : ""}
            </span>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
            Aucune disponibilité enregistrée pour le moment.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {grouped.map(([day, daySlots]) => {
              const freeSlots = daySlots.filter((s) => !isSlotLocked(s));
              const freeIds = freeSlots.map((s) => s.id);
              const lockedCount = daySlots.length - freeIds.length;
              const daySelected = freeIds.length > 0 && freeIds.every((id) => selected.has(id));
              return (
                <div key={day} className="rounded-xl border border-border bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {freeIds.length > 0 && (
                        <button
                          onClick={() => toggleMany(freeIds, !daySelected)}
                          className="grid size-5 place-items-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                          aria-label="Sélectionner la journée"
                        >
                          {daySelected ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
                        </button>
                      )}
                      <p className="font-display text-sm font-bold uppercase tracking-tight capitalize">
                        {formatDay(day)}
                      </p>
                      {lockedCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
                          <Lock className="size-2.5" /> {lockedCount} verrouillé{lockedCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {freeIds.length > 0 ? (
                      <button
                        onClick={() => removeDay(day, daySlots)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" /> Supprimer les libres
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                        <Lock className="size-3" /> Journée verrouillée
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {daySlots.map((s) => {
                      const locked = isSlotLocked(s);
                      const isSel = selected.has(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => !locked && toggleOne(s.id)}
                          title={locked ? "Verrouillé par une réservation active" : undefined}
                          className={`group inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold tabular-nums transition-all ${
                            locked
                              ? "cursor-not-allowed border-amber-500/40 bg-amber-500/10 text-amber-500"
                              : isSel
                              ? "cursor-pointer border-primary bg-primary/15 text-primary ring-2 ring-primary/30"
                              : "cursor-pointer border-border bg-surface/60 hover:border-primary/50"
                          }`}
                        >
                          {!locked && (
                            isSel ? <CheckSquare className="size-3 text-primary" /> : <Square className="size-3 opacity-50" />
                          )}
                          {locked ? <Lock className="size-3" /> : <Clock className="size-3 opacity-60" />}
                          {formatTime(s.start_at)} → {formatTime(s.end_at)}
                          {locked ? (
                            <span className="ml-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                              Réservé
                            </span>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); removeSlot(s.id); }}
                              className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-3 z-20 mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wider">
            {selected.size} créneau{selected.size > 1 ? "x" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" /> Annuler
            </button>
            <button
              onClick={removeSelected}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-destructive-foreground transition-colors hover:opacity-90"
            >
              <Trash2 className="size-3" /> Supprimer la sélection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
