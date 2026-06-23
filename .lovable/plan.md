## Objectif

Appliquer la migration SQL corrective fournie : 10 correctifs + bonus (policies, index, contraintes, cron, sécurisation des fonctions admin).

## Plan d'exécution

### Étape 1 — Migration SQL (1 seul fichier)

Tous les changements de schéma/policies/fonctions/index/contraintes seront groupés dans une seule migration, dans l'ordre fourni :

1. **notifications** — policy DELETE pour admins
2. **bookings** — CHECK contrainte `status` + policy UPDATE owner restreinte à `confirmed`/`cancelled`
3. **studio_slots** — index `(studio_id, start_at, is_booked)` + index partiel sur `room_id`
4. **update_updated_at_column** — `SECURITY DEFINER` + `search_path=public` + REVOKE PUBLIC/anon, GRANT authenticated
5. **studios** — index sur `owner_id`
6. **bookings** — index `(artist_id, created_at DESC)` et `(studio_id, start_at)`
7. **notifications** — FK `user_id → auth.users` ON DELETE CASCADE + index partiel non-lues
8. **studio_claims** — policy INSERT renforcée (bloque si claim `pending` OU `approved` existant)
9. ~~cron `finalize-past-bookings`~~ → **déplacé hors migration** (voir Étape 2 : les changements cron doivent passer par le tool insert, pas migration)
10. **profiles** — CHECK `display_name` ≤ 100 chars (+ `artist_name` si la colonne existe)
- **Bonus** : index `(status, end_at)` partiel sur bookings + REVOKE/GRANT sur `approve_studio_claim`, `reject_studio_claim`, `admin_get_studios_stats`, `admin_get_artists_stats`

### Étape 2 — Cron job (via tool insert, pas migration)

Reschedule `finalize-past-bookings` de `* * * * *` (chaque minute) à `*/5 * * * *` (toutes les 5 min) :

```sql
SELECT cron.unschedule('finalize-past-bookings');
SELECT cron.schedule('finalize-past-bookings', '*/5 * * * *',
  $$ SELECT public.finalize_past_bookings(); $$);
```

## Points d'attention (à valider avant exécution)

1. **Item 2 — Policy bookings UPDATE** : restreindre le studio owner à `status IN ('confirmed','cancelled')` empêchera tout autre changement (notes internes, prix, etc.). Si le owner doit pouvoir modifier d'autres champs sans changer le status, il faudra élargir le `WITH CHECK` à `status = OLD.status OR status IN ('confirmed','cancelled')`. **Confirmez le comportement souhaité.**

2. **Item 2 — Valeur `'refunded'`** : ajoutée à la contrainte CHECK. Vérifiez qu'aucune ligne existante n'a un status hors de cette liste (sinon `ADD CONSTRAINT` échoue). Je peux vérifier d'abord avec un SELECT.

3. **Item 7 — FK vers auth.users** : la doc Lovable décourage les FK vers `auth.users` pour les tables app-level. Ici c'est `ON DELETE CASCADE` sur les notifications, ce qui est légitime (purger les notifs d'un user supprimé). À garder.

4. **Item 4 — update_updated_at_column** : passer en `SECURITY DEFINER` est OK (utilisé uniquement par triggers BEFORE UPDATE), les triggers ignorent le check EXECUTE. Aucun risque.

5. **Aucune modification frontend** n'est nécessaire — c'est 100 % backend.

## Vérification post-migration

Après application, je lancerai le linter Supabase pour confirmer qu'aucun nouveau warning critique n'apparaît et je vous remonterai les éventuels findings.

Confirmez (ou ajustez le point 1) et je lance.