import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Headphones, Sparkles, Users } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — [STUD.RESER]" },
      {
        name: "description",
        content:
          "[STUD.RESER] modernise la réservation de studios d'enregistrement. Notre mission : connecter les artistes indépendants aux meilleurs espaces créatifs.",
      },
      { property: "og:title", content: "À propos — [STUD.RESER]" },
      { property: "og:description", content: "Notre vision pour la nouvelle génération de studios." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <header className="px-6 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-5xl">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">À propos</span>
          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter md:text-8xl">
            La nouvelle ère<br />
            du <span className="italic text-primary">studio</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            [STUD.RESER] est née d'un constat simple : trouver un studio d'enregistrement reste compliqué,
            opaque et lent. Nous construisons la plateforme qui change ça — pensée pour les artistes
            indépendants et les studios indépendants comme professionnels.
          </p>
        </div>
      </header>

      <section className="border-y border-border bg-surface/40 px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-tighter md:text-5xl">
              Notre vision
            </h2>
            <p className="mt-6 text-muted-foreground">
              Démocratiser l'accès aux meilleurs studios. Donner à chaque artiste, peu importe sa notoriété,
              les moyens d'enregistrer dans des conditions professionnelles. Et donner à chaque studio les
              outils pour remplir son planning sans intermédiaire.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold uppercase tracking-tighter md:text-5xl">
              Notre mission
            </h2>
            <p className="mt-6 text-muted-foreground">
              Réduire la friction entre l'idée d'un projet musical et sa concrétisation. Réservation en
              quelques clics, transparence totale sur les tarifs, le matériel et les disponibilités.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          <Pillar
            icon={Users}
            title="Pensé pour les indés"
            body="Artistes émergents, beatmakers, podcasters. Pas de frais cachés, pas de gatekeeping."
          />
          <Pillar
            icon={Headphones}
            title="Studios vérifiés"
            body="Chaque studio publié est validé manuellement. Acoustique, matériel, ambiance."
          />
          <Pillar
            icon={Sparkles}
            title="Expérience premium"
            body="Une interface immersive, claire, rapide — à la hauteur de vos sessions."
          />
        </div>
      </section>

      {!user && (
        <section className="px-6 pb-32">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/60 p-10 text-center md:p-16">
            <h2 className="font-display text-4xl font-extrabold uppercase leading-none tracking-tighter md:text-5xl">
              Rejoignez l'aventure.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Que vous soyez artiste à la recherche du studio parfait ou propriétaire d'un espace à partager,
              votre place est ici.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/studios"
                className="inline-flex items-center gap-2 rounded-sm bg-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-foreground"
              >
                Explorer <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signup", as: "studio" }}
                className="inline-flex items-center gap-2 rounded-sm border border-foreground px-6 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-foreground hover:text-background"
              >
                Inscrire mon studio
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-6">
      <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 font-display text-lg font-bold uppercase tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
