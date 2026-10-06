# LM86 Services — site vitrine + back-office

## Structure du projet

```
lm86-services/
├── server.js              → serveur Express (site + API + admin)
├── package.json
├── data/
│   └── content.json       → tout le contenu éditable du site (source unique)
├── public/                 → site public, servi tel quel
│   ├── index.html
│   ├── css/style.css
│   ├── js/contenu.js       → charge le contenu depuis l'API au démarrage
│   ├── js/script.js        → animations (scroll, menu mobile, compteurs)
│   └── images/
├── admin/                  → back-office (protégé par mot de passe)
│   ├── index.html          → écran de connexion
│   ├── dashboard.html      → éditeur de contenu
│   ├── admin.css
│   └── admin.js
├── scripts/
│   └── create-admin.js     → création du compte admin
└── README.md
```

## Mise en route

```bash
npm install
npm run create-admin   # choisis un identifiant + mot de passe (8 caractères min.)
npm start
```

Puis ouvre :
- **Site public** : http://localhost:3000
- **Back-office** : http://localhost:3000/admin

Le port peut être changé avec `PORT=8080 npm start`.

## Comment ça marche

- Tout le texte, les listes (services, avis, atouts...) et les 3 photos du site
  sont stockés dans `data/content.json`. Le site public va chercher ce contenu
  au chargement (`/api/content`) ; s'il ne le trouve pas, il garde le contenu
  par défaut déjà écrit dans `index.html` — le site ne casse jamais.
- Le back-office (`/admin`) permet de modifier tous ces champs, d'ajouter/retirer
  des avis clients ou des lignes de prestations, et de remplacer les photos —
  sans toucher au code. Un clic sur "Enregistrer" met à jour `content.json` et
  le site public reflète le changement immédiatement pour tous les visiteurs.
- La connexion admin est protégée par mot de passe (haché, jamais stocké en
  clair) et une session cookie ; les tentatives de connexion répétées sont
  limitées automatiquement.

**Limite volontaire** : les 5 "points forts" (bandeau sous le hero) et le
nombre de cartes "Services" restent fixes, car leurs icônes sont codées en dur
dans la page — seul leur texte est modifiable. Les avis clients et les listes
de prestations, eux, acceptent l'ajout/suppression libre.

## À faire avant la mise en ligne

- **Avis clients** : les 3 témoignages sont des exemples de mise en page,
  marqués "Exemple" — à remplacer par de vrais avis via le back-office.
- **Mot de passe admin** : choisis-en un vrai avec `npm run create-admin`
  (celui utilisé pendant les tests n'a pas été conservé).
- **`SESSION_SECRET`** : en production, définis la variable d'environnement
  `SESSION_SECRET` (une longue chaîne aléatoire) plutôt que de laisser le
  serveur en générer une sur disque.
- Pense aux balises Open Graph et aux données structurées
  `schema.org/LocalBusiness` pour le référencement local (non inclus ici).

## Hébergement

Ce n'est plus un site 100% statique : il faut un hébergement capable de faire
tourner un processus Node.js en continu (Render, Railway, un VPS, etc.), pas
un simple hébergement de fichiers. Le dossier `data/` doit être sur un disque
persistant (pas régénéré à chaque déploiement), sans quoi le contenu modifié
via l'admin serait perdu.
