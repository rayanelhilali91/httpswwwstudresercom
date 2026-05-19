import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/NotificationBell";

export function SiteNav() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isStudio = profile?.account_type === "studio";
  const dashboardTo = isStudio ? "/studio/dashboard" : "/dashboard";
  const dashboardLabel = isStudio ? "Mon studio" : "Mes réservations";

  const close = () => setOpen(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-6">
        <div className="flex items-center gap-10">
          <Link to="/" onClick={close} className="font-display text-xl font-extrabold uppercase tracking-tighter md:text-2xl">
            [STUD<span className="text-primary">.RESER</span>]
          </Link>
          <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link to="/studios" className="transition-colors hover:text-foreground">Explorer</Link>
            <Link to="/about" className="transition-colors hover:text-foreground">À propos</Link>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to={dashboardTo}
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {dashboardLabel}
              </Link>
              <NotificationBell />
              <button
                onClick={() => signOut()}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-bold transition-all hover:border-foreground"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Connexion
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-foreground"
              >
                Inscription
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && <NotificationBell variant="mobile" />}
          <button
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center rounded-md border border-border"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="space-y-1 px-5 py-4">
            <MobileLink to="/studios" onClick={close}>Explorer</MobileLink>
            <MobileLink to="/about" onClick={close}>À propos</MobileLink>
            {user ? (
              <>
                <MobileLink to={dashboardTo} onClick={close}>{dashboardLabel}</MobileLink>
                <button
                  onClick={() => { close(); signOut(); }}
                  className="block w-full rounded-md border border-border px-4 py-3 text-left text-base font-bold uppercase tracking-wider"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <div className="grid gap-2 pt-2">
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  onClick={close}
                  className="rounded-md border border-border px-4 py-3 text-center text-base font-bold uppercase tracking-wider"
                >
                  Connexion
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  onClick={close}
                  className="rounded-md bg-primary px-4 py-3 text-center text-base font-bold uppercase tracking-wider text-primary-foreground"
                >
                  Inscription
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileLink({ to, onClick, children }: { to: "/studios" | "/about" | "/dashboard" | "/studio/dashboard"; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block rounded-md px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
    >
      {children}
    </Link>
  );
}
