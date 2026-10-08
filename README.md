# Daaru Minam Cafe — site vitrine + boutique

Site d'une seule page (HTML/CSS/JS, sans build ni dépendance) avec une boutique
intégrée : choix du format, panier persistant, tunnel de commande et envoi de la
commande sur WhatsApp + Google Sheets.

```
index.html              la page du site (sections 01 → 05 + boutique)
assets/css/main.css     design system, mises en page et animations
assets/js/main.js       boutique, panier, commande, animations pilotées au scroll
assets/img/*.webp       photos (issues des maquettes)
assets/audio/           la bande-son, coupée à 58 s et jouée en boucle
apps-script/Code.gs     le script Google (gratuit) qui reçoit les commandes
assets/fonts/           Anton + Space Grotesk auto-hébergées (pas d'appel Google)
baobab.html             l'ancien formulaire de commande Baobab, conservé tel quel
```

## Aperçu en local

```bash
npx http-server -p 8080 .      # puis ouvrir http://127.0.0.1:8080
```

Un simple double-clic sur `index.html` fonctionne aussi.

## Les 3 réglages à connaître

Tout est au début de `assets/js/main.js`.

### 1. Numéro WhatsApp et tableur

```js
const CONFIG = {
  whatsapp: '221775368231',   // format international, sans le +
  sheet: 'https://script.google.com/macros/s/.../exec',  // '' pour désactiver
  currency: 'FCFA',
  shipping: null              // null = « à confirmer », ou un nombre (ex. 1000)
};
```

### 2. Produits et prix

```js
const PRODUCTS = [
  { id:'touba-250', brand:'Café Touba', name:'Le format découverte',
    weight:'250 g', price:1625, desc:'…', img:'assets/img/pack-250.webp' },
  …
];
```

Prix en vigueur : **250 g — 1 625 FCFA**, **500 g — 3 250 FCFA**,
**1 kg — 6 500 FCFA**. Pour les changer, modifiez `price`. Ajouter un format =
ajouter un objet dans la liste ; le carrousel, les boutons de format, le
compteur « 01 / 03 » et le panier se mettent à jour tout seuls.

### 3. Photos

Remplacer les fichiers dans `assets/img/` en gardant les mêmes noms, ou changer
les chemins dans `index.html`. Les images actuelles sont des recadrages des
maquettes ; dès que les vraies photos produit sont disponibles, elles prennent
leur place sans toucher au code.

⚠️ Les trois formats partagent aujourd'hui la même photo de paquet (cadrages
différents de la même image de maquette), et le sachet visible porte l'étiquette
« 250 g ». Une photo par format (`pack-250`, `pack-500`, `pack-1kg`) rendra la
boutique juste.

## Comment arrivent les commandes (et pourquoi c'est gratuit)

Le tunnel compte trois étapes : **Panier → Vos infos → Validation**, puis le
client envoie lui-même sa commande depuis son WhatsApp.

1. Le client remplit ses informations (livraison ou retrait, nom, téléphone,
   adresse, date, heure). Tout est vérifié avant de continuer : nom, numéro
   sénégalais ou étranger, adresse, date non passée.
2. Il voit un récapitulatif complet avec une **référence de commande**
   (ex. `DM-7K3F9A`).
3. Le bouton « Envoyer sur WhatsApp » est un **vrai lien** `wa.me` : il ouvre
   WhatsApp avec le message déjà écrit. Le client appuie sur envoyer, et la
   commande arrive dans votre WhatsApp comme un message normal.
4. Au même moment, la commande est enregistrée en arrière-plan dans votre
   Google Sheets, qui vous envoie aussi un e-mail.

**Coût : zéro.** Le lien `wa.me` est la fonction « click to chat » officielle
de WhatsApp : pas d'inscription, pas d'API, pas d'abonnement. Google Sheets et
Apps Script sont gratuits avec un compte Google ordinaire.

La seule option payante serait l'*API WhatsApp Business (Cloud API)*, qui
permet au serveur d'écrire au client tout seul. Elle demande un compte Meta
Business, un serveur, et se facture à la conversation. **Vous n'en avez pas
besoin** pour recevoir des commandes.

Un détail important : comme c'est le client qui appuie sur « envoyer », il peut
abandonner à ce moment-là. C'est pour cela que le site garde son panier tant
qu'il n'a pas confirmé, et surtout que la commande part **en parallèle** dans
le tableur et par e-mail : même si le message WhatsApp n'arrive jamais, vous
avez le nom, le numéro et la commande pour rappeler le client.

### Installer la réception par e-mail et tableur

Tout est expliqué en tête de `apps-script/Code.gs` : créer un Google Sheets,
coller le script, déployer en application web accessible à « tout le monde »,
puis coller l'URL `/exec` dans `CONFIG.sheet` (en haut de `assets/js/main.js`).
Mettre `sheet: ''` désactive cette partie : la commande part alors uniquement
sur WhatsApp.

### Gmail ou Resend ?

Par défaut l'e-mail part par **Gmail** (`MailApp`) : gratuit, rien à configurer,
amplement suffisant pour être prévenu de ses commandes.

`apps-script/Code.gs` sait aussi passer par **Resend** : il suffit de remplir
`RESEND_API_KEY` et `RESEND_FROM` en haut du fichier. Utile le jour où vous
voulez un e-mail qui part de `commandes@daaruminam.sn` plutôt que de votre
Gmail, ou envoyer une confirmation au client.

Trois choses à savoir avant de basculer :

- **La clé API ne doit jamais être mise dans le site.** `assets/js/` est public :
  n'importe qui pourrait la lire et envoyer des e-mails en votre nom. Sa place
  est dans le script Apps Script, qui s'exécute chez Google.
- **Sans domaine vérifié**, Resend n'autorise que l'expéditeur
  `onboarding@resend.dev`, et uniquement vers l'adresse du compte Resend.
  Il faut donc un nom de domaine et quelques enregistrements DNS pour en
  profiter vraiment.
- **Offre gratuite** : 3 000 e-mails par mois, 100 par jour — largement de quoi
  encaisser les commandes.

Si Resend échoue (clé expirée, domaine non vérifié), le script bascule
automatiquement sur Gmail : aucune commande n'est perdue.

## Champs envoyés au Google Apps Script

Le script reçoit (en `application/x-www-form-urlencoded`) :

`reference`, `nom`, `telephone`, `mode` (`livraison` ou `retrait`), `adresse`,
`date_livraison`, `heure_livraison`, `remarques`, `commande` (résumé lisible),
`details` (`id:quantité,…`), `sous_total`, `livraison`, `total`, `devise`,
`source`.

Le fichier `apps-script/Code.gs` fourni attend exactement ces noms : il n'y a
rien à adapter si vous l'utilisez tel quel. L'ancien script Baobab attendait
une colonne par produit (`pack_330`…) ; il faut donc le remplacer par celui-ci,
sinon les commandes partent sur WhatsApp mais ne s'écrivent nulle part.

## Détails techniques

- Animations en CSS + JS natif (IntersectionObserver, requestAnimationFrame) :
  pas de GSAP, pas de jQuery, rien à installer.
- `prefers-reduced-motion` est respecté : les animations se coupent pour les
  personnes qui le demandent dans leur système.
- Le panier est conservé dans `localStorage` (clé `dm-cart-v1`).
- Le héros enchaîne trois plans en fondu (pas de vidéo, pas de lecteur).
- La bande-son (`assets/audio/ambiance.webm` + `.mp3` de secours) dure 58 s et
  tourne en boucle. Pour la remplacer : refaire les deux fichiers avec
  `ffmpeg -i source.mp3 -t 58 …`. Les navigateurs interdisent le son avant un
  geste de l'internaute : la musique démarre donc au premier clic, et le bouton
  en bas à droite permet de la couper (le choix est mémorisé).
- Défilement fluide, inclinaison des images selon la vitesse, inclinaison 3D du
  paquet, indicateur de section, grain animé et volet orange de transition sont
  actifs sur ordinateur ; sur mobile et si « réduire les animations » est activé,
  le site revient à un défilement natif et sobre.
