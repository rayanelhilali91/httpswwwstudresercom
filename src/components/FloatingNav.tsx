import { useState } from "react";
import { useRouter, useLocation, Link } from "@tanstack/react-router";
import { ArrowLeft, Home, Navigation } from "lucide-react";

export function FloatingNav() {
  const router = useRouter();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isHome = location.pathname === "/";

  const handleBack = () => {
    setOpen(false);
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="fixed right-3 top-1/2 z-40 -translate-y-1/2 md:right-5">
      <div className="relative flex flex-col items-end gap-2">
        {/* Action buttons */}
        <div
          className={`flex flex-col items-end gap-2 transition-all duration-300 ${
            open
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-3 opacity-0"
          }`}
        >
          <button
            onClick={handleBack}
            aria-label="Revenir en arrière"
            className="group/fn flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.35)] backdrop-blur-md transition-all hover:border-primary/60 hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Retour</span>
          </button>
          {!isHome && (
            <Link
              to="/"
              onClick={() => setOpen(false)}
              aria-label="Aller à l'accueil"
              className="group/fn flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.35)] backdrop-blur-md transition-all hover:border-primary/60 hover:text-primary"
            >
              <Home className="size-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          )}
        </div>

        {/* Trigger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Navigation rapide"
          aria-expanded={open}
          className={`grid size-11 place-items-center rounded-full border border-primary/40 bg-gradient-to-br from-background/90 to-surface/90 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_10px_30px_-10px_hsl(var(--primary)/0.55)] backdrop-blur-md ring-1 ring-background/40 transition-all hover:scale-105 hover:border-primary ${
            open ? "rotate-45" : "rotate-0"
          }`}
        >
          <Navigation className="size-[18px] drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
        </button>
      </div>
    </div>
  );
}
