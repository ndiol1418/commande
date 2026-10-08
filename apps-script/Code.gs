/**
 * Daaru Minam Cafe — réception des commandes du site
 * =================================================
 * Ce script reçoit chaque commande passée sur le site et :
 *   1. l'écrit dans une feuille Google Sheets ;
 *   2. vous envoie un e-mail.
 *
 * L'e-mail part par Gmail (gratuit, rien à configurer) ou par Resend si vous
 * renseignez une clé API plus bas.
 *
 * INSTALLATION (5 minutes, une seule fois)
 * ----------------------------------------
 * 1. Créez un Google Sheets vide, nommez-le « Commandes Daaru Minam ».
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

/* ---- Réglages ---------------------------------------------------------- */

/* Adresse qui reçoit les commandes. */
var EMAIL = 'VOTRE-ADRESSE@gmail.com';

/* Nom de l'onglet où sont écrites les commandes. */
var ONGLET = 'Commandes';

/* --- Resend (facultatif) ------------------------------------------------
 * Laissez RESEND_API_KEY vide pour envoyer par Gmail : c'est gratuit et il
 * n'y a rien à installer.
 *
 * Pour passer par Resend :
 *   1. créez un compte sur resend.com (offre gratuite : 3 000 e-mails par
 *      mois, 100 par jour) ;
 *   2. vérifiez votre domaine dans Resend (quelques enregistrements DNS) ;
 *   3. collez la clé API ci-dessous et mettez votre adresse d'expédition.
 *
 * ⚠️ Sans domaine vérifié, Resend n'autorise que l'expéditeur
 * onboarding@resend.dev, et seulement vers l'adresse du compte Resend.
 * Tant que le domaine n'est pas vérifié, Gmail reste le choix le plus simple.
 *
 * ⚠️ La clé API ne doit JAMAIS être mise dans le site : elle resterait
 * lisible par tout le monde. Sa place est ici, dans le script, côté serveur.
 */
var RESEND_API_KEY = '';
var RESEND_FROM = 'Daaru Minam Cafe <commandes@votre-domaine.com>';

/* ---- Code -------------------------------------------------------------- */

var COLONNES = [
  'Date de réception', 'Référence', 'Nom', 'Téléphone', 'Mode',
  'Adresse', 'Date souhaitée', 'Heure', 'Commande', 'Détails',
  'Sous-total', 'Livraison', 'Total', 'Devise', 'Remarques', 'Source'
];

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    feuilleCommandes_().appendRow([
      new Date(),
      p.reference || '', p.nom || '', p.telephone || '', p.mode || '',
      p.adresse || '', p.date_livraison || '', p.heure_livraison || '',
      p.commande || '', p.details || '',
      p.sous_total || '', p.livraison || '', p.total || '', p.devise || 'FCFA',
      p.remarques || '', p.source || ''
    ]);
    notifier_(p);
    return reponse_({ ok: true, reference: p.reference || '' });
  } catch (err) {
    return reponse_({ ok: false, erreur: String(err) });
  }
}

/* Permet de vérifier dans le navigateur que le script répond. */
function doGet() {
  return reponse_({ ok: true, message: 'Daaru Minam Cafe — reception des commandes active.' });
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

/* Envoie par Resend si une clé est renseignée, sinon par Gmail. */
function notifier_(p) {
  if (!EMAIL) return;
  var titre = 'Nouvelle commande ' + (p.reference || '') + ' — ' + (p.nom || '');

  if (RESEND_API_KEY) {
    try { envoyerResend_(titre, p); return; }
    catch (err) { /* en cas de pépin, on bascule sur Gmail */ }
  }
  MailApp.sendEmail({ to: EMAIL, subject: titre, body: texteBrut_(p), htmlBody: html_(p) });
}

function envoyerResend_(titre, p) {
  var r = UrlFetchApp.fetch('https://api.resend.com/emails', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      from: RESEND_FROM,
      to: [EMAIL],
      reply_to: EMAIL,
      subject: titre,
      text: texteBrut_(p),
      html: html_(p)
    })
  });
  if (r.getResponseCode() >= 300) throw new Error('Resend : ' + r.getContentText());
}

function texteBrut_(p) {
  return [
    'Nouvelle commande sur le site Daaru Minam Cafe.',
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
}

function html_(p) {
  var tel = String(p.telephone || '').replace(/\D/g, '');
  var ligne = function (etiquette, valeur) {
    return '<tr><td style="padding:6px 16px 6px 0;color:#8a8178;white-space:nowrap">' + etiquette +
      '</td><td style="padding:6px 0;color:#141211"><b>' + (valeur || '—') + '</b></td></tr>';
  };
  return '' +
    '<div style="font-family:Helvetica,Arial,sans-serif;background:#f4ede4;padding:28px">' +
    '<div style="max-width:560px;margin:auto;background:#fff;border-top:4px solid #e2531c;padding:28px">' +
    '<p style="margin:0 0 4px;letter-spacing:.22em;font-size:11px;color:#e2531c">DAARU MINAM CAFE</p>' +
    '<h1 style="margin:0 0 20px;font-size:21px;color:#141211">Nouvelle commande ' + (p.reference || '') + '</h1>' +
    '<p style="margin:0 0 6px;font-size:13px;color:#8a8178">COMMANDE</p>' +
    '<p style="margin:0 0 20px;font-size:16px;color:#141211"><b>' + (p.commande || '') + '</b></p>' +
    '<table style="border-collapse:collapse;font-size:14px;width:100%">' +
    ligne('Total', (p.total || '') + ' ' + (p.devise || 'FCFA')) +
    ligne('Livraison', p.livraison || 'à confirmer') +
    ligne('Mode', p.mode) +
    '</table>' +
    '<hr style="border:0;border-top:1px solid #e6ded3;margin:20px 0">' +
    '<table style="border-collapse:collapse;font-size:14px;width:100%">' +
    ligne('Client', p.nom) +
    ligne('Téléphone', p.telephone) +
    ligne('Adresse', p.adresse) +
    ligne('Souhaitée', (p.date_livraison || '') + ' à ' + (p.heure_livraison || '')) +
    ligne('Remarques', p.remarques) +
    '</table>' +
    (tel ? '<p style="margin:24px 0 0"><a href="https://wa.me/' + tel + '" ' +
      'style="display:inline-block;background:#141211;color:#fff;text-decoration:none;padding:12px 20px;font-size:14px">' +
      'Répondre sur WhatsApp</a></p>' : '') +
    '<p style="margin:20px 0 0;font-size:12px;color:#8a8178;line-height:1.6">' +
    'Le client doit aussi vous écrire sur WhatsApp. Si son message n\'arrive pas, ' +
    'appelez-le : ' + (p.telephone || '') + '</p>' +
    '</div></div>';
}

function reponse_(objet) {
  return ContentService.createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
