# Toujours Reliés — Audit sécurité et données

## État vérifié

- Le site est hébergé sur GitHub Pages.
- Les moments et participations sont enregistrés dans Firebase Realtime Database, projet `chaudron-collectif`.
- La configuration Firebase publique du navigateur n’est pas un mot de passe. La protection réelle dépend des règles Firebase et de l’authentification.
- Les règles actives de la base ne sont pas présentes dans ce dépôt. Elles doivent être contrôlées directement dans la console Firebase avant tout lancement public.

## Données actuellement manipulées

Selon les formulaires et scripts du site :

- titre, thème, question et réglages d’un moment ;
- date de début et de fin ;
- prénom facultatif ;
- choix d’anonymat ;
- émotion ;
- message ;
- dates techniques de création ou modification ;
- identifiants techniques nécessaires au fonctionnement du moment.

## Risques prioritaires

1. **Règles Firebase inconnues** : si elles autorisent une lecture ou écriture publique trop large, la base peut être interrogée directement.
2. **Administration côté navigateur** : la connexion actuelle ne constitue pas une authentification serveur robuste.
3. **Messages potentiellement sensibles** : le projet peut recevoir des émotions ou difficultés personnelles.
4. **Durée de conservation non définie** : les données restent probablement présentes jusqu’à suppression manuelle.
5. **Anonymat limité** : masquer le prénom à l’écran ne garantit pas une anonymisation technique complète.

## Actions obligatoires avant lancement public

### Priorité 1 — Console Firebase

- Ouvrir Firebase Console > Realtime Database > Règles.
- Copier les règles actives et les faire auditer.
- Ne pas publier de nouvelles règles sans test dans l’émulateur Firebase.

### Priorité 2 — Authentification

- Remplacer la connexion administrateur locale par Firebase Authentication ou un backend sécurisé.
- Donner les droits d’administration uniquement à des comptes authentifiés.

### Priorité 3 — Modèle d’accès

Définir explicitement :

- qui peut lire les informations générales d’un moment ;
- qui peut créer un message ;
- qui peut modifier ou supprimer son message ;
- qui peut lire tous les messages avant la cérémonie ;
- qui peut modifier ou supprimer un moment.

### Priorité 4 — Conservation

Décider et annoncer une durée, par exemple :

- suppression automatique 30 jours après la fin du moment ;
- ou archivage limité avec suppression manuelle claire.

### Priorité 5 — Transparence

Afficher avant l’envoi :

- quelles données sont enregistrées ;
- pourquoi ;
- qui peut les consulter ;
- comment demander leur suppression.

## Ce qui a été ajouté immédiatement

- Information courte sur Firebase dès l’écran d’invitation.
- Information détaillée avant l’envoi du message.
- Consentement explicite obligatoire avant publication.
- Mention honnête sur les limites du mode anonyme.

## Limite actuelle

Ce document ne certifie pas la sécurité de la base. Une certification n’est possible qu’après examen des règles actives dans la console Firebase, tests d’accès et mise en place d’une authentification réelle.
