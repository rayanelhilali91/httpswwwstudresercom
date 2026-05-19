import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Calendar, CreditCard, Headphones, Music2, Shield, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import heroImage from "@/assets/hero-studio.jpg";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { StudioCard } from "@/components/StudioCard";
import { fetchPublishedStudios } from "@/data/studios-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "[STUD.RESER] — Réservez les meilleurs studios d'enregistrement" },
      {
        name: "description",
        content:
          "La marketplace premium des studios d'enregistrement. Découvrez, réservez et payez en quelques clics. Pour artistes indépendants et studios professionnels.",
      },
      { property: "og:title", content: "[STUD.RESER] — Studios d'enregistrement premium" },
      { property: "og:description", content: "Trouvez le studio parfait pour votre prochain projet musical." },
      { property: "og:image", content: heroImage },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: studios = [] } = useQuery({
    queryKey: ["studios", "featured"],
    queryFn: fetchPublishedStudios,
  });
  const featured = studios.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="mx-auto max-w-7xl">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-3" /> La marketplace des studios
            </span>
            <h1 className="mt-8 font-display text-6xl font-extrabold leading-[0.88] tracking-tighter text-white md:text-8xl lg:text-[9rem]">
              RÉSERVE <br />
              LE STUDIO <br />
              FAIT POUR TOI.
            </h1>
            <div className="mt-12 flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
              <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                Découvrez et réservez en quelques clics les studios d'enregistrement les plus inspirants. De la cabine analogique à la suite Atmos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/studios"
                  className="group inline-flex items-center gap-2 rounded-sm bg-primary px-8 py-4 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-foreground"
                >
                  Réserver un studio
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup", as: "studio" }}
                  className="inline-flex items-center gap-2 rounded-sm border border-border px-8 py-4 text-sm font-bold uppercase tracking-wider transition-all hover:border-foreground hover:bg-surface"
                >
                  Ajouter mon studio
                </Link>
              </div>
            </div>
          </div>

          <div className="reveal mt-20 overflow-hidden rounded-2xl border border-border" style={{ animationDelay: "200ms" }}>
            <img
              src={heroImage}
              alt="Studio d'enregistrement professionnel avec console de mixage"
              width={1920}
              height={1080}
              className="h-[60vh] w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="relative overflow-hidden border-y border-border bg-surface/40 py-6">
        <div className="marquee flex w-max gap-12 whitespace-nowrap font-display text-3xl font-bold uppercase tracking-tighter md:text-5xl">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-12">
              <span>Hip-Hop</span>
              <span className="text-primary">•</span>
              <span>Soul</span>
              <span className="text-primary">•</span>
              <span>Afro</span>
              <span className="text-primary">•</span>
              <span>Trap</span>
              <span className="text-primary">•</span>
              <span>Drill</span>
              <span className="text-primary">•</span>
              <span>RnB</span>
              <span className="text-primary">•</span>
              <span>House</span>
              <span className="text-primary">•</span>
              <span>Electro</span>
              <span className="text-primary">•</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Sélection</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase tracking-tighter md:text-6xl">
                Studios à la une
              </h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Triés sur le volet pour leur acoustique, leur matériel et leur âme.
              </p>
            </div>
            <Link
              to="/studios"
              className="group inline-flex items-center gap-2 self-start text-sm font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              Voir tous les studios
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-6 py-24 text-center">
              <p className="font-display text-3xl font-extrabold uppercase tracking-tighter md:text-4xl">
                Studios disponibles prochainement
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                La sélection ouvre bientôt. Studios professionnels et indépendants pourront publier leur espace ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((s) => (
                <StudioCard key={s.id} studio={s} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ADVANTAGES — ARTISTS */}
      <section id="advantages" className="border-y border-border bg-surface/30 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 md:grid-cols-2 md:gap-20">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Pour les artistes</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tighter md:text-6xl">
                Trouvez le studio<br />qui matche votre son.
              </h2>
              <p className="mt-6 max-w-md text-muted-foreground">
                Plus besoin de chercher pendant des heures. Filtrez par ville, genre, équipement et budget. Réservez en ligne, payez sécurisé, enregistrez.
              </p>
            </div>
            <div className="space-y-6">
              <ArtistFeature icon={Music2} title="Filtres intelligents" body="Genre musical, matériel, ambiance — trouvez le studio aligné avec votre projet." />
              <ArtistFeature icon={Calendar} title="Réservation instantanée" body="Calendrier en temps réel. Bloquez votre créneau en moins d'une minute." />
              <ArtistFeature icon={CreditCard} title="Paiement sécurisé" body="Stripe protège chaque transaction. Annulation flexible selon le studio." />
            </div>
          </div>
        </div>
      </section>

      {/* OWNERS */}
      <section id="owners" className="px-6 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-20 md:grid-cols-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Pour les studios</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none tracking-tighter md:text-6xl">
                Remplissez votre planning.<br />Sans effort.
              </h2>
              <p className="mt-6 max-w-md text-muted-foreground">
                Un dashboard pensé pour les studios. Gérez vos créneaux, vos prix, vos photos et vos paiements depuis une seule interface.
              </p>
              <ul className="mt-10 space-y-4 text-sm">
                <li className="flex items-center gap-4">
                  <span className="size-1.5 rounded-full bg-primary" /> Visibilité auprès d'artistes qualifiés
                </li>
                <li className="flex items-center gap-4">
                  <span className="size-1.5 rounded-full bg-primary" /> Paiements rapides et sécurisés
                </li>
                <li className="flex items-center gap-4">
                  <span className="size-1.5 rounded-full bg-primary" /> Gestion calendrier & tarifs en temps réel
                </li>
                <li className="flex items-center gap-4">
                  <span className="size-1.5 rounded-full bg-primary" /> Avis clients & réputation construite
                </li>
              </ul>
              <Link
                to="/auth"
                search={{ mode: "signup", as: "studio" }}
                className="mt-10 inline-flex items-center gap-2 rounded-sm border border-foreground bg-foreground px-8 py-4 text-sm font-bold uppercase tracking-wider text-background transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                Inscrire mon studio <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-destructive/40" />
                  <div className="size-2.5 rounded-full bg-yellow-500/40" />
                  <div className="size-2.5 rounded-full bg-primary/40" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Owner Dashboard
                </span>
              </div>
              <div className="grid place-items-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-20 text-center">
                <p className="font-display text-lg font-bold uppercase tracking-tight">
                  Aucune session pour le moment
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Vos prochaines réservations apparaîtront ici.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / SECURITY */}
      <section className="border-t border-border bg-surface/30 px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          <TrustItem icon={Shield} title="Paiements sécurisés" body="Chaque transaction est protégée de bout en bout." />
          <TrustItem icon={Headphones} title="Studios vérifiés" body="Chaque studio est validé manuellement par notre équipe." />
          <TrustItem icon={Sparkles} title="Support 7j/7" body="Une équipe humaine à votre écoute pour chaque session." />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-8xl">
            Réserve le studio<br />fait pour toi.
          </h2>
          <Link
            to="/studios"
            className="mt-12 inline-flex items-center gap-2 rounded-sm bg-primary px-10 py-5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-foreground"
          >
            Explorer la marketplace <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ArtistFeature({ icon: Icon, title, body }: { icon: typeof Music2; title: string; body: string }) {
  return (
    <div className="flex gap-5 rounded-xl border border-border bg-background/40 p-6 transition-colors hover:border-primary/40">
      <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, title, body }: { icon: typeof Shield; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <Icon className="size-5 shrink-0 text-primary" />
      <div>
        <h3 className="font-display text-base font-bold uppercase tracking-wide">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
