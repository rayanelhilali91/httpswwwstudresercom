import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  ownerId: string;
  studioId: string | undefined;
  imageUrl: string | null;
  gallery: string[];
  onChange: (next: { imageUrl: string | null; gallery: string[] }) => Promise<void> | void;
};

export function StudioImageUploader({ ownerId, studioId, imageUrl, gallery, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Source de vérité = props. On enchaîne les mutations à partir des valeurs reçues
  // pour éviter toute désynchronisation entre clics rapides.
  const commit = async (next: { imageUrl: string | null; gallery: string[] }) => {
    await onChange(next);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!studioId) {
      toast.error("Enregistrez d'abord les infos du studio.");
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} n'est pas une image.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} dépasse 5 Mo.`);
          continue;
        }
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${ownerId}/${studioId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from("studio-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data } = supabase.storage.from("studio-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length > 0) {
        const nextGallery = [...gallery, ...uploaded];
        await commit({
          imageUrl: imageUrl ?? uploaded[0] ?? null,
          gallery: nextGallery,
        });
        toast.success(`${uploaded.length} image(s) ajoutée(s).`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (url: string) => {
    setBusyUrl(url);
    try {
      const nextGallery = gallery.filter((u) => u !== url);
      const nextCover = imageUrl === url ? nextGallery[0] ?? null : imageUrl;
      await commit({ imageUrl: nextCover, gallery: nextGallery });
      // Best-effort: supprimer du Storage si le chemin est reconnaissable
      try {
        const marker = "/studio-images/";
        const idx = url.indexOf(marker);
        if (idx !== -1) {
          const path = url.slice(idx + marker.length);
          await supabase.storage.from("studio-images").remove([path]);
        }
      } catch {
        /* ignore */
      }
      toast.success("Photo supprimée.");
    } finally {
      setBusyUrl(null);
    }
  };

  const setCover = async (url: string) => {
    if (imageUrl === url) return;
    setBusyUrl(url);
    try {
      await commit({ imageUrl: url, gallery });
      toast.success("Photo principale mise à jour.");
    } finally {
      setBusyUrl(null);
    }
  };

  const move = async (url: string, dir: -1 | 1) => {
    const idx = gallery.indexOf(url);
    if (idx === -1) return;
    const target = idx + dir;
    if (target < 0 || target >= gallery.length) return;
    const next = [...gallery];
    [next[idx], next[target]] = [next[target], next[idx]];
    setBusyUrl(url);
    try {
      await commit({ imageUrl, gallery: next });
    } finally {
      setBusyUrl(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold uppercase tracking-tight">
            Photos du studio
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoutez, réorganisez et choisissez votre photo principale. JPG/PNG/WebP — 5 Mo max.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading || !studioId}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {uploading ? "Envoi…" : "Ajouter des photos"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {!studioId ? (
        <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-10 text-center text-xs text-muted-foreground">
          Enregistrez d'abord le profil pour ajouter des photos.
        </p>
      ) : gallery.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-12 text-center text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="size-5" />
          Cabine, matériel, ambiance — déposez vos premières photos.
        </button>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((url, i) => {
            const isCover = imageUrl === url;
            const isBusy = busyUrl === url;
            return (
              <li
                key={url}
                className={`group relative overflow-hidden rounded-xl border transition-colors ${
                  isCover ? "border-primary ring-1 ring-primary/40" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreview(url)}
                  className="block w-full"
                  aria-label="Voir la photo"
                >
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.02]"
                  />
                </button>

                {isCover && (
                  <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                    <Check className="size-3" /> Principale
                  </span>
                )}

                <span className="pointer-events-none absolute right-2 top-2 rounded-md bg-background/80 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-foreground">
                  {i + 1}/{gallery.length}
                </span>

                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-1 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isBusy || i === 0}
                      onClick={() => move(url, -1)}
                      className="rounded-md bg-background/80 p-1.5 text-foreground transition hover:text-primary disabled:opacity-40"
                      title="Déplacer à gauche"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || i === gallery.length - 1}
                      onClick={() => move(url, 1)}
                      className="rounded-md bg-background/80 p-1.5 text-foreground transition hover:text-primary disabled:opacity-40"
                      title="Déplacer à droite"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isCover && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCover(url)}
                        className="rounded-md bg-background/80 p-1.5 text-foreground transition hover:text-primary disabled:opacity-40"
                        title="Définir comme photo principale"
                      >
                        <Star className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => remove(url)}
                      className="rounded-md bg-background/80 p-1.5 text-foreground transition hover:text-destructive disabled:opacity-40"
                      title="Supprimer"
                    >
                      {isBusy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur"
          onClick={() => setPreview(null)}
        >
          <img
            src={preview}
            alt=""
            className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
