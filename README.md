# Darou Minam Cafe — site vitrine + boutique

Site d'une seule page (HTML/CSS/JS, sans build ni dépendance) avec une boutique
intégrée : choix du format, panier persistant, tunnel de commande et envoi de la
commande sur WhatsApp + Google Sheets.

```
index.html              la page du site (sections 01 → 05 + boutique)
assets/css/main.css     design system, mises en page et animations
assets/js/main.js       boutique, panier, commande, animations pilotées au scroll
assets/img/*.webp       photos (issues des maquettes)
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
  whatsapp: '221786156206',   // format international, sans le +
  sheet: 'https://script.google.com/macros/s/.../exec',  // '' pour désactiver
  currency: 'FCFA',
  shipping: null              // null = « à confirmer », ou un nombre (ex. 1000)
};
```

### 2. Produits et prix  ⚠️ à ajuster

```js
const PRODUCTS = [
  { id:'touba-250', brand:'Café Touba', name:'Le format découverte',
    weight:'250 g', price:3000, desc:'…', img:'assets/img/pack-250.webp' },
  …
];
```

Les prix actuels (3 000 / 5 500 FCFA) sont des valeurs de départ : il suffit de
changer `price`. Ajouter un produit = ajouter un objet dans la liste ; le
carrousel, les boutons de format, le compteur « 01 / 02 » et le panier se mettent
à jour tout seuls.

### 3. Photos

Remplacer les fichiers dans `assets/img/` en gardant les mêmes noms, ou changer
les chemins dans `index.html`. Les images actuelles sont des recadrages des
maquettes ; dès que les vraies photos produit sont disponibles, elles prennent
leur place sans toucher au code.

## Champs envoyés au Google Apps Script

Le script reçoit maintenant (en `application/x-www-form-urlencoded`) :

`nom`, `telephone`, `adresse`, `date_livraison`, `heure_livraison`, `remarques`,
`commande` (résumé lisible), `details` (`id:quantité,…`), `total`, `devise`,
`source`.

L'ancien script attendait une colonne par produit (`pack_330`…) : il faut donc
adapter la feuille / le script pour ces nouveaux noms. Tant que ce n'est pas
fait, la commande part quand même sur WhatsApp avec le détail complet — rien
n'est perdu.

## Détails techniques

- Animations en CSS + JS natif (IntersectionObserver, requestAnimationFrame) :
  pas de GSAP, pas de jQuery, rien à installer.
- `prefers-reduced-motion` est respecté : les animations se coupent pour les
  personnes qui le demandent dans leur système.
- Le panier est conservé dans `localStorage` (clé `dm-cart-v1`).
- Le « film » est une séquence d'images enchaînées : le jour où une vraie vidéo
  existe, elle remplace les `<figure>` de `#film` et les `.hero__frame`.
