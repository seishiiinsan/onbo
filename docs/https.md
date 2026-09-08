# HTTPS, domaine et reverse proxy

Issue #30. Aucune agence ne confie les accès de ses clients à
`http://51.255.x.x:3000`, et un cookie de session ne peut pas être `Secure`
sans TLS.

## Mise en place

1. Pointer deux enregistrements A (et AAAA) vers le serveur :
   `app.example.fr` et `portail.example.fr`.
2. Renseigner l'environnement :

```
DOMAIN=app.example.fr
PORTAL_DOMAIN=portail.example.fr
ACME_EMAIL=technique@example.fr
APP_URL=https://app.example.fr
PORTAL_URL=https://portail.example.fr
```

3. `docker compose up -d`. Caddy obtient les certificats Let's Encrypt tout
   seul et les renouvelle sans intervention.

Le port applicatif n'est plus publié : le service `app` n'expose plus que le
réseau interne Docker, tout entre par le proxy. La base ne l'a jamais été.

## Sous-domaine des portails

`https://portail.example.fr/<token>` est réécrit vers `/p/<token>` par le
proxy. Le lien envoyé au client ne montre ni `/p/`, ni l'espace agence.
`PORTAL_URL` fait fabriquer ces liens par l'application ; sans cette variable,
on reste sur `https://<domaine>/p/<token>`.

## En-têtes

HSTS (un an, sous-domaines inclus, `preload`), `X-Content-Type-Options`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` et une CSP
sont posés **deux fois** : par le proxy et par l'application
(`next.config.ts`). Si l'un des deux saute lors d'un changement
d'infrastructure, l'autre tient.

La redirection HTTP → HTTPS est faite par Caddy par défaut.

## Cookie de session

`secure` est désormais inconditionnel (`src/lib/auth.ts`) : le contournement
indexé sur `APP_URL` a disparu. Le développement local n'est pas gêné, les
navigateurs traitant `http://localhost` comme un contexte sécurisé.

## Vérifier

- `https://<domaine>` répond, `http://<domaine>` redirige ;
- un scan SSL (SSL Labs, testssl.sh) rend un A ;
- `curl -I https://<domaine>` montre HSTS et les autres en-têtes ;
- plus aucun `secure:` conditionnel dans `src/lib/auth.ts`.
