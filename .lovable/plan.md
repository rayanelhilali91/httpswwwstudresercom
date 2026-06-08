## Objectif

Sécuriser la prise de contrôle des fiches studios. L'admin pré-remplit des fiches publiques ; les vrais propriétaires les revendiquent et n'obtiennent l'accès qu'après validation manuelle.

## Modèle de données

### Nouveau enum `studio_status`
- `non_revendique` (défaut, fiche créée par admin)
- `revendication_en_attente` (au moins une demande en cours)
- `revendique_verifie` (propriétaire validé, accès accordé)

### Modifications `studios`
- Ajouter `status studio_status NOT NULL DEFAULT 'non_revendique'`
- Backfill : `revendique_verifie` si `is_verified=true`, sinon `non_revendique`
- Supprimer `is_verified` (le badge "vérifié" devient dérivé de `status`)
- `owner_id` reste NOT NULL : tant que la fiche n'est pas revendiquée, l'admin en est propriétaire technique
- `is_published` et `is_paused` restent inchangés (orthogonaux à la revendication)

### Nouvelle table `studio_claims`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid PK | |
| studio_id | uuid → studios | |
| user_id | uuid → auth.users | demandeur |
| status | claim_status enum | `pending` / `approved` / `rejected` |
| verification_notes | text | preuves fournies (email pro, site, etc.) |
| admin_notes | text | notes internes admin |
| created_at, reviewed_at, reviewed_by | timestamps + uuid | |

Contrainte : un seul claim `pending` par (studio_id, user_id).

## Sécurité (RLS + triggers + fonctions)

### `studios`
- SELECT public : inchangé
- UPDATE owner : restreint aux studios `status = 'revendique_verifie'` AND `auth.uid() = owner_id`
- UPDATE `owner_id` et `status` : bloqué par trigger pour tout le monde sauf admin / fonctions SECURITY DEFINER
- REVOKE `UPDATE (owner_id, status)` from `authenticated` (défense en profondeur)

### `studio_claims`
- INSERT : utilisateur authentifié, `user_id = auth.uid()`, studio en `non_revendique` ou `revendication_en_attente`
- SELECT : demandeur voit ses propres claims, admin voit tout
- UPDATE : admin uniquement, via fonctions dédiées

### Fonctions SECURITY DEFINER (admin-only)
- `approve_studio_claim(claim_id)` :
  - transfère `owner_id` au demandeur
  - passe `status` à `revendique_verifie`
  - marque le claim `approved`, rejette automatiquement les autres claims pending sur ce studio
  - notifie le demandeur + ancien owner
- `reject_studio_claim(claim_id, reason)` :
  - marque `rejected`
  - si plus aucun claim pending sur le studio → `status` retourne à `non_revendique`
  - notifie le demandeur

### Trigger sur INSERT `studio_claims`
- Passe le studio à `revendication_en_attente`
- Crée une notification pour chaque admin

## Frontend

### Type `Studio` (src/data/studios.ts)
- Remplacer `isVerified: boolean` par `status: 'non_revendique' | 'revendication_en_attente' | 'revendique_verifie'`
- Ajouter helper `isVerified` dérivé

### Badges (StudioCard, fiche studio)
- `non_revendique` → "Profil non vérifié" (gris)
- `revendication_en_attente` → "Revendication en cours" (jaune)
- `revendique_verifie` → `<VerifiedBadge />` (vert/lime, existant)

### Fiche studio publique `/studios/$studioId`
- Bouton **"Revendiquer ce studio"** visible si `status !== 'revendique_verifie'` ET visiteur ≠ owner
- Clic → si non connecté → redirige vers `/auth?redirect=...`
- Si connecté → modal/page avec formulaire `verification_notes` (textarea : email pro, site web, justificatifs)
- Soumission → server fn `createStudioClaim`
- Si un claim pending existe déjà du même user → affiche "Demande en cours, en attente de validation"

### Dashboard studio
- Si `status = 'revendication_en_attente'` chez l'owner admin technique → afficher bannière "Demande de revendication en attente, en cours d'examen par l'équipe"
- Accès à `/studio/dashboard` réservé aux owners de studios `revendique_verifie` (sinon redirection avec message)

### Dashboard admin — nouvelle section "Revendications"
- Route `/admin/claims` (ou onglet dans dashboard admin existant)
- Liste des claims `pending` triés par date
- Pour chaque : nom studio, demandeur (display_name, email), date, notes de vérification
- Boutons "Approuver" / "Refuser" (avec raison optionnelle)
- Lien vers fiche studio + profil demandeur
- Historique des claims approuvés/refusés (onglet)

### Server functions (`src/lib/claims.functions.ts`)
- `createStudioClaim({ studioId, verificationNotes })` — auth user
- `listMyStudioClaims()` — auth user
- `listPendingClaims()` — admin only (via `has_role`)
- `approveStudioClaim({ claimId })` — admin only, appelle la fonction SQL
- `rejectStudioClaim({ claimId, reason })` — admin only

## Migrations (1 seule)

```text
1. CREATE TYPE studio_status, claim_status
2. ALTER studios ADD status, backfill, DROP is_verified
3. CREATE TABLE studio_claims + GRANTs + RLS + policies
4. CREATE FUNCTIONS approve/reject + trigger notify
5. REVOKE UPDATE (owner_id, status) on studios
6. Trigger protect_studio_owner_status
```

## Hors scope (lancement v1)

- Vérification automatique (DNS, email pro vérifié, etc.) — admin manuel uniquement
- Système de contestation après refus — l'utilisateur peut soumettre une nouvelle demande
- Multi-propriétaires — un studio = un owner

## Fichiers touchés

- `supabase/migrations/<new>.sql` (création)
- `src/data/studios.ts`, `src/data/studios-api.ts` (type + mapping)
- `src/components/StudioCard.tsx` (badge selon status)
- `src/routes/studios.$studioId.tsx` (badge + bouton revendiquer)
- `src/routes/studio.dashboard.tsx` (gate sur status, bannière)
- `src/lib/claims.functions.ts` (création)
- `src/routes/_authenticated/claim.$studioId.tsx` (création — formulaire claim)
- `src/routes/_authenticated/admin.claims.tsx` (création — admin)
- Lien admin dans `dashboard.tsx` ou nav existante
