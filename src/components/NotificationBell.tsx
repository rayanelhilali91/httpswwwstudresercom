import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export function NotificationBell({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (active) setItems((data ?? []) as Notif[]);
    };
    load();

    const channel = supabase
      .channel(`notif-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => [payload.new as Notif, ...prev].slice(0, 30));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
  };

  const removeOne = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid place-items-center rounded-full border border-border/70 transition-colors hover:border-foreground",
          variant === "desktop" ? "size-10" : "size-11",
        )}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "z-50 overflow-hidden border border-border bg-background/95 shadow-2xl backdrop-blur-xl",
            variant === "desktop"
              ? "absolute right-0 mt-3 w-[340px] rounded-2xl"
              : "fixed left-1/2 top-[68px] w-[calc(100vw-1.5rem)] max-w-[420px] -translate-x-1/2 rounded-2xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Centre</div>
              <div className="font-display text-sm font-extrabold uppercase tracking-tight">Notifications</div>
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                <Check className="size-3" /> Tout lu
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-6 py-10 text-center text-xs text-muted-foreground">
                Aucune notification pour l'instant.
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {items.map((n) => {
                  const isUnread = !n.read_at;
                  const Body = (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          isUnread ? "bg-primary" : "bg-border",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-semibold leading-snug break-words">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                        </div>
                        {n.body && (
                          <p className="mt-1 text-xs text-muted-foreground leading-relaxed break-words">{n.body}</p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeOne(n.id);
                        }}
                        className="text-muted-foreground/60 transition-colors hover:text-destructive"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  );
                  return (
                    <li key={n.id} className={cn(isUnread && "bg-surface/40")}>
                      {n.link ? (
                        <a href={n.link} onClick={() => setOpen(false)} className="block hover:bg-surface/80">
                          {Body}
                        </a>
                      ) : (
                        Body
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
