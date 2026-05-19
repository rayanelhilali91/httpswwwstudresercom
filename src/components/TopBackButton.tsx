import { useLocation, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function TopBackButton() {
  const router = useRouter();
  const location = useLocation();

  if (location.pathname === "/") return null;

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Revenir à la page précédente"
      className="fixed left-3 top-20 z-40 inline-flex items-center gap-2 rounded-full border border-primary/45 bg-background/85 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_10px_28px_-12px_hsl(var(--primary)/0.6)] backdrop-blur-md transition-all hover:-translate-x-0.5 hover:border-primary hover:bg-surface/90 md:left-5 md:px-4"
    >
      <ArrowLeft className="size-4" />
      <span>Retour</span>
    </button>
  );
}
