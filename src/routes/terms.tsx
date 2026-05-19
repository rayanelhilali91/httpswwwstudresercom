import { createFileRoute, Link } from "@tanstack/react-router";
import { ScrollText, ShieldCheck, Music2, Calendar, CreditCard, AlertTriangle, Mail } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Conditions d'utilisation — [STUD.RESER]" },
      {
        name: "description",
        content:
          "Les conditions d'utilisation de la plateforme Stud.Reser : règles de réservation, responsabilités des artistes et studios, paiements et bonne conduite.",
      },
      { property: "og:title", content: "Conditions d'utilisation — [STUD.RESER]" },
      { property: "og:description", content: "Les règles qui encadrent l'expérience Stud.Reser." },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    icon: ScrollText,
    title: "1. Objet",
    body: [
      "Stud.Reser est une marketplace qui met en relation des artistes indépendants avec des studios d'enregistrement professionnels. La plateforme facilite la découverte, la réservation et le paiement de sessions studio.",
      "L'utilisation de Stud.Reser implique l'acceptation pleine et entière des présentes conditions, qui s'appliquent à tous les utilisateurs : artistes, studios, et visiteurs.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "2. Création de compte",
    body: [
      "Tout utilisateur doit créer un compte pour réserver une session ou inscrire un studio. Les informations communiquées doivent être exactes, à jour et sincères.",
      "Les artistes choisissent un nom d'artiste qui devient leur identité publique sur la plateforme. Les studios sont identifiés par le nom officiel de leur structure.",
      "Chaque utilisateur est responsable de la confidentialité de ses identifiants et de l'usage qui en est fait depuis son compte.",
    ],
  },
  {
    icon: Music2,
    title: "3. Engagements des studios",
    body: [
      "Les studios garantissent l'exactitude des informations publiées : équipement, tarifs, capacité, disponibilités, photos. Les annonces doivent refléter fidèlement l'expérience proposée.",
      "Les studios s'engagent à honorer les réservations confirmées, à accueillir les artistes dans des conditions professionnelles et à respecter les créneaux convenus.",
      "Le badge « Certifié » est attribué après vérification par notre équipe. Toute fraude entraîne une suspension immédiate.",
    ],
  },
  {
    icon: Calendar,
    title: "4. Réservations & sessions",
    body: [
      "Une réservation devient ferme à sa confirmation. L'artiste s'engage à respecter les créneaux horaires, le matériel mis à disposition et les règles internes du studio.",
      "À la fin de la session, le statut passe automatiquement à « Session finalisée » et la réservation rejoint l'historique de l'artiste.",
      "Les annulations sont encadrées par les conditions propres à chaque studio et par notre politique de rétractation indiquée dans le tunnel de réservation.",
    ],
  },
  {
    icon: CreditCard,
    title: "5. Paiements",
    body: [
      "Les paiements sont sécurisés et traités via nos partenaires bancaires. Le tarif total affiché lors de la réservation comprend l'ensemble des frais applicables.",
      "Stud.Reser perçoit une commission sur chaque transaction, prélevée au moment du règlement au studio.",
    ],
  },
  {
    icon: AlertTriangle,
    title: "6. Bonne conduite",
    body: [
      "Le respect mutuel est une condition fondamentale de la communauté Stud.Reser. Tout comportement abusif, discriminatoire, frauduleux ou portant atteinte à l'intégrité d'un autre utilisateur est strictement interdit.",
      "Le matériel et les locaux des studios doivent être traités avec soin. Toute dégradation engage la responsabilité de l'artiste.",
      "Stud.Reser se réserve le droit de suspendre ou supprimer tout compte ne respectant pas ces règles.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "7. Propriété intellectuelle",
    body: [
      "Les enregistrements réalisés en studio restent la propriété pleine et entière des artistes, sauf accord écrit contraire avec le studio.",
      "Les contenus publiés sur la plateforme (logos, photos, textes) restent la propriété de leurs auteurs respectifs et ne peuvent être réutilisés sans autorisation.",
    ],
  },
  {
    icon: Mail,
    title: "8. Contact",
    body: [
      "Pour toute question relative aux présentes conditions, à votre compte ou à une réservation, notre équipe reste joignable depuis votre espace personnel ou par email.",
      "Stud.Reser se réserve le droit de modifier ces conditions à tout moment. Les utilisateurs seront notifiés des changements significatifs.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <header className="relative overflow-hidden border-b border-border/60 px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Légal</span>
          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-7xl">
            Conditions<br />
            d'<span className="italic text-primary">utilisation</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Les règles qui encadrent l'expérience Stud.Reser — pensées pour protéger
            les artistes, les studios et préserver la qualité de la communauté.
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Dernière mise à jour — {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      <main className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-6">
          {sections.map((s) => (
            <article
              key={s.title}
              className="group rounded-2xl border border-border/60 bg-surface/40 p-6 transition-colors hover:border-primary/40 md:p-8"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight md:text-2xl">
                    {s.title}
                  </h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}

          <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-lg font-bold uppercase tracking-tight">Une question ?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Notre équipe vous accompagne à chaque étape de votre expérience Stud.Reser.
              </p>
            </div>
            <Link
              to="/about"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-foreground"
            >
              En savoir plus
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
