import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Music2, Mic2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AccountType } from "@/hooks/use-auth";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional().default("login"),
  as: z.enum(["artist", "studio"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Connexion — [STUD.RESER]" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(search.mode);
  const [accountType, setAccountType] = useState<AccountType>(search.as ?? "artist");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      navigate({ to: profile.account_type === "studio" ? "/studio/dashboard" : "/dashboard" });
    }
  }, [user, profile, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const baseSchema = z.object({
          email: z.string().trim().email().max(255),
          password: z.string().min(8).max(72),
        });
        let publicName = "";
        let extraMeta: Record<string, string> = {};
        if (accountType === "artist") {
          const schema = baseSchema.extend({
            firstName: z.string().trim().min(1, "Prénom requis").max(80),
            lastName: z.string().trim().min(1, "Nom de famille requis").max(80),
            artistName: z.string().trim().min(1, "Nom d'artiste requis").max(80),
          });
          const parsed = schema.safeParse({ email, password, firstName, lastName, artistName });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setSubmitting(false);
            return;
          }
          publicName = parsed.data.artistName;
          extraMeta = {
            first_name: parsed.data.firstName,
            last_name: parsed.data.lastName,
            artist_name: parsed.data.artistName,
          };
        } else {
          const schema = baseSchema.extend({
            displayName: z.string().trim().min(1, "Nom du studio requis").max(80),
          });
          const parsed = schema.safeParse({ email, password, displayName });
          if (!parsed.success) {
            toast.error(parsed.error.issues[0].message);
            setSubmitting(false);
            return;
          }
          publicName = parsed.data.displayName;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              account_type: accountType,
              display_name: publicName,
              ...extraMeta,
            },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous êtes connecté.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connecté.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="hidden border-r border-border bg-surface/40 p-12 lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="font-display text-2xl font-extrabold uppercase tracking-tighter">
          [STUD<span className="text-primary">.RESER</span>]
        </Link>
        <div>
          <p className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tighter">
            Là où le son<br />
            prend <span className="italic text-primary">vie.</span>
          </p>
          <p className="mt-6 max-w-md text-sm text-muted-foreground">
            Stud.Reser réunit les artistes et les meilleurs studios d'enregistrement. Réservez votre session, capturez l'instant, façonnez votre son.
          </p>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 self-start rounded-full border border-primary/40 bg-gradient-to-br from-background/90 to-surface/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15),0_8px_24px_-10px_hsl(var(--primary)/0.55)] backdrop-blur-md transition-all hover:scale-[1.02] hover:border-primary">
          <ArrowLeft className="size-3" /> Retour à l'accueil
        </Link>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <Link to="/" className="font-display text-xl font-extrabold uppercase tracking-tighter">
              [STUD<span className="text-primary">.RESER</span>]
            </Link>
          </div>

          <div className="mt-8 flex gap-2 rounded-full border border-border p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === "login" ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                mode === "signup" ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Inscription
            </button>
          </div>

          <h1 className="mt-10 font-display text-4xl font-extrabold uppercase leading-none tracking-tighter">
            {mode === "login" ? "Bon retour." : "Créez votre compte."}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login"
              ? "Accédez à votre espace personnel."
              : "Choisissez votre type de compte pour commencer."}
          </p>

          {mode === "signup" && (
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("artist")}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  accountType === "artist" ? "border-primary bg-primary/5" : "border-border hover:border-foreground"
                }`}
              >
                <Mic2 className={`size-5 ${accountType === "artist" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="mt-3 font-display text-sm font-bold uppercase tracking-wider">Artiste</p>
                <p className="mt-1 text-xs text-muted-foreground">Découvrir & réserver</p>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("studio")}
                className={`rounded-xl border p-5 text-left transition-colors ${
                  accountType === "studio" ? "border-primary bg-primary/5" : "border-border hover:border-foreground"
                }`}
              >
                <Music2 className={`size-5 ${accountType === "studio" ? "text-primary" : "text-muted-foreground"}`} />
                <p className="mt-3 font-display text-sm font-bold uppercase tracking-wider">Studio</p>
                <p className="mt-1 text-xs text-muted-foreground">Publier & gérer</p>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && accountType === "studio" && (
              <Field
                label="Nom du studio"
                value={displayName}
                onChange={setDisplayName}
                required
                maxLength={80}
              />
            )}
            {mode === "signup" && accountType === "artist" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" value={firstName} onChange={setFirstName} required maxLength={80} />
                  <Field label="Nom de famille" value={lastName} onChange={setLastName} required maxLength={80} />
                </div>
                <Field
                  label="Nom d'artiste"
                  value={artistName}
                  onChange={setArtistName}
                  required
                  maxLength={80}
                />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required maxLength={255} />
            <Field label="Mot de passe" type="password" value={password} onChange={setPassword} required minLength={8} />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3.5 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-foreground disabled:opacity-60"
            >
              {submitting ? "…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
              <ArrowRight className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className="mt-1.5 w-full rounded-md border border-border bg-surface/60 px-3 py-3 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  );
}
