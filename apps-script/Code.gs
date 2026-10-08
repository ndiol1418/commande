/**
 * Darou Minam Cafe — réception des commandes du site
 * =================================================
 * Ce script est GRATUIT (compte Google ordinaire). Il fait deux choses :
 *   1. il écrit chaque commande dans une feuille Google Sheets ;
 *   2. il vous envoie un e-mail dès qu'une commande arrive.
 *
 * INSTALLATION (5 minutes, une seule fois)
 * ----------------------------------------
 * 1. Créez un Google Sheets vide, nommez-le « Commandes Darou Minam ».
 * 2. Menu  Extensions > Apps Script.
 * 3. Effacez le contenu de Code.gs et collez TOUT ce fichier à la place.
 * 4. Remplacez VOTRE-ADRESSE@gmail.com ci-dessous par votre vraie adresse.
 * 5. Cliquez sur « Déployer » > « Nouveau déploiement » :
 *       Type        : Application web
 *       Exécuter en tant que : moi
 *       Accès       : « Tout le monde »   ← indispensable
 * 6. Copiez l'URL qui se termine par /exec et collez-la dans
 *    assets/js/main.js, dans CONFIG.sheet.
 *
 * Après chaque modification du script, refaites « Déployer > Gérer les
 * déploiements > (crayon) > Version : Nouvelle version ».
 */

/* ⚠️ Mettez ici l'adresse qui doit recevoir les commandes. */
var EMAIL = 'VOTRE-ADRESSE@gmail.com';

/* Nom de l'onglet où sont écrites les commandes. */
var ONGLET = 'Commandes';

var COLONNES = [
  'Date de réception', 'Référence', 'Nom', 'Téléphone', 'Mode',
  'Adresse', 'Date souhaitée', 'Heure', 'Commande', 'Détails',
  'Sous-total', 'Livraison', 'Total', 'Devise', 'Remarques', 'Source'
];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    var feuille = feuilleCommandes_();

    feuille.appendRow([
      new Date(),
      p.reference || '',
      p.nom || '',
      p.telephone || '',
      p.mode || '',
      p.adresse || '',
      p.date_livraison || '',
      p.heure_livraison || '',
      p.commande || '',
      p.details || '',
      p.sous_total || '',
      p.livraison || '',
      p.total || '',
      p.devise || 'FCFA',
      p.remarques || '',
      p.source || ''
    ]);

    envoyerEmail_(p);
    return reponse_({ ok: true, reference: p.reference || '' });
  } catch (err) {
    return reponse_({ ok: false, erreur: String(err) });
  }
}

/* Permet de vérifier dans le navigateur que le script répond. */
function doGet() {
  return reponse_({ ok: true, message: 'Darou Minam Cafe — reception des commandes active.' });
}

function feuilleCommandes_() {
  var classeur = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = classeur.getSheetByName(ONGLET) || classeur.insertSheet(ONGLET);
  if (feuille.getLastRow() === 0) {
    feuille.appendRow(COLONNES);
    feuille.getRange(1, 1, 1, COLONNES.length).setFontWeight('bold');
    feuille.setFrozenRows(1);
  }
  return feuille;
}

function envoyerEmail_(p) {
  if (!EMAIL) return;
  var titre = 'Nouvelle commande ' + (p.reference || '') + ' — ' + (p.nom || '');
  var corps = [
    'Nouvelle commande sur le site Darou Minam Cafe.',
    '',
    'Référence : ' + (p.reference || ''),
    'Nom       : ' + (p.nom || ''),
    'Téléphone : ' + (p.telephone || ''),
    'Mode      : ' + (p.mode || ''),
    'Adresse   : ' + (p.adresse || ''),
    'Souhaitée : ' + (p.date_livraison || '') + ' à ' + (p.heure_livraison || ''),
    '',
    'Commande  : ' + (p.commande || ''),
    'Sous-total: ' + (p.sous_total || '') + ' ' + (p.devise || ''),
    'Livraison : ' + (p.livraison || 'à confirmer'),
    'Total     : ' + (p.total || '') + ' ' + (p.devise || ''),
    'Remarques : ' + (p.remarques || '—'),
    '',
    'Le client doit aussi vous écrire sur WhatsApp. Si ce n\'est pas le cas,',
    'appelez-le : ' + (p.telephone || '')
  ].join('\n');

  MailApp.sendEmail(EMAIL, titre, corps);
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
