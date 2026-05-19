import { Link } from "@tanstack/react-router";

type FooterLink = {
  label: string;
  to?: "/studios" | "/auth" | "/about" | "/terms";
  search?: Record<string, string>;
  href?: string;
};

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Plateforme",
    links: [
      { label: "Trouver un studio", to: "/studios" },
      { label: "Comment ça marche", to: "/about" },
      { label: "Tarifs", href: "#" },
      { label: "Sécurité", href: "#" },
    ],
  },
  {
    title: "Studios",
    links: [
      { label: "Inscrire mon studio", to: "/auth", search: { mode: "signup", as: "studio" } },
      { label: "Paiements Stripe", href: "#" },
      { label: "Assurance", href: "#" },
    ],
  },
  {
    title: "Société",
    links: [
      { label: "À propos", to: "/about" },
      { label: "Conditions d'utilisation", to: "/terms" },
      { label: "Blog", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 px-6 py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <span className="font-display text-2xl font-extrabold uppercase tracking-tighter">
            [STUD<span className="text-primary">.RESER</span>]
          </span>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            La plateforme premium qui connecte les artistes indépendants avec les meilleurs studios d'enregistrement.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-12 md:grid-cols-3 md:gap-20">
          {columns.map((c) => (
            <FooterCol key={c.title} title={c.title} links={c.links} />
          ))}
        </div>
      </div>
      <div className="mx-auto mt-20 flex max-w-7xl items-center justify-between border-t border-border/60 pt-8 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <p>© {new Date().getFullYear()} [STUD.RESER]</p>
        <div className="flex gap-8">
          <a href="#">Confidentialité</a>
          <Link to="/terms">CGU</Link>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <p className="mb-2 font-bold uppercase tracking-[0.2em]">{title}</p>
      {links.map((l) => {
        const className = "text-muted-foreground transition-colors hover:text-foreground";
        if (l.to) {
          return (
            <Link key={l.label} to={l.to} search={l.search as never} className={className}>
              {l.label}
            </Link>
          );
        }
        return (
          <a key={l.label} href={l.href ?? "#"} className={className}>
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
