# Toujours Reliés

Application collective pour partager une émotion ou un petit morceau de vie pendant une durée limitée, puis découvrir une cérémonie finale.

## Déploiement Cloudflare Pages

- Framework preset : None
- Build command : vide
- Build output directory : `/`
- Variables d’environnement à créer dans **Settings > Variables and Secrets** :
  - `ADMIN_USER`
  - `ADMIN_PASSWORD`
  - `SESSION_SECRET` (une longue phrase aléatoire)

## Pages

- `/` : participant (utiliser le lien généré par l’administration)
- `/admin.html` : administration

## Firebase

Le projet utilise Firebase Realtime Database. Les chemins principaux sont `moments` et `messages`.
