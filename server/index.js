/**
 * Daaru Minam Cafe — réception des commandes
 * POST /api/commande  enregistre la commande, écrit l'Excel, envoie les e-mails
 * GET  /api/sante     état du service
 * GET  /api/export    télécharge le fichier Excel (jeton requis)
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { CONFIG, CATALOGUE } from './src/config.js';
import { enregistrer, fichierExcel, cheminExcel } from './src/orders.js';
import { prevenirBoutique, confirmerClient } from './src/mail.js';

const LIMITE_CORPS = 64 * 1024;

/* ---- utilitaires ------------------------------------------------------- */
const json = (res, code, obj) => {
  const corps = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corps),
    'Cache-Control': 'no-store'
  });
  res.end(corps);
};

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const morceaux = [];
    req.on('data', c => {
      total += c.length;
      if (total > LIMITE_CORPS) { reject(new Error('corps trop grand')); req.destroy(); return; }
      morceaux.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')));
    req.on('error', reject);
  });
}

function analyser(brut, type = '') {
  if (type.includes('application/json')) { try { return JSON.parse(brut); } catch (e) { return {}; } }
  return Object.fromEntries(new URLSearchParams(brut));
}

/* ---- limitation simple par IP ------------------------------------------ */
const vus = new Map();
function tropDeRequetes(ip) {
  const maintenant = Date.now(), fenetre = 10 * 60 * 1000, max = 20;
  const liste = (vus.get(ip) || []).filter(t => maintenant - t < fenetre);
  liste.push(maintenant);
  vus.set(ip, liste);
  if (vus.size > 5000) vus.clear();
  return liste.length > max;
}

/* ---- validation -------------------------------------------------------- */
function normTel(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (/^7\d{8}$/.test(d)) return '221' + d;
  if (/^221\d{9}$/.test(d)) return d;
  if (/^00221\d{9}$/.test(d)) return d.slice(2);
  if (d.length >= 8 && d.length <= 15) return d;
  return null;
}
const telAffiche = n => /^221\d{9}$/.test(n)
  ? n.replace(/^221(\d{2})(\d{3})(\d{2})(\d{2})$/, '+221 $1 $2 $3 $4') : '+' + n;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const nettoyer = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function construire(p) {
  const erreurs = [];

  const lignes = [];
  for (const part of String(p.details || '').split(',')) {
    const [id, qte] = part.split(':');
    const article = CATALOGUE[String(id || '').trim()];
    const q = Math.min(99, Math.max(1, parseInt(qte, 10) || 0));
    if (!article || !q) continue;
    lignes.push({ id: id.trim(), nom: article.nom, format: article.format, prix: article.prix, qte: q, total: article.prix * q });
  }
  if (!lignes.length) erreurs.push('Aucun produit reconnu dans la commande.');

  const nom = nettoyer(p.nom, 80);
  if (nom.length < 2) erreurs.push('Nom manquant.');

  const tel = normTel(p.telephone);
  if (!tel) erreurs.push('Téléphone invalide.');

  const email = nettoyer(p.email, 120).toLowerCase();
  if (email && !EMAIL_RE.test(email)) erreurs.push('E-mail invalide.');

  const mode = p.mode === 'retrait' ? 'retrait' : 'livraison';
  const adresse = nettoyer(p.adresse, 300);
  if (mode === 'livraison' && adresse.length < 5) erreurs.push('Adresse manquante.');

  const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date_livraison || '') ? p.date_livraison : '';
  const heure = /^\d{2}:\d{2}$/.test(p.heure_livraison || '') ? p.heure_livraison : '';
  if (!date || !heure) erreurs.push('Date ou heure manquante.');

  if (erreurs.length) return { erreurs };

  const sousTotal = lignes.reduce((n, l) => n + l.total, 0);
  const livraison = mode === 'retrait' ? 0 : null;   // à confirmer pour une livraison

  return {
    commande: {
      ref: /^DM-[A-Z0-9]{4,10}$/.test(p.reference || '') ? p.reference
        : 'DM-' + Date.now().toString(36).slice(-6).toUpperCase(),
      nom, tel, telAffiche: telAffiche(tel), email, mode, adresse,
      date, heure,
      dateLisible: new Date(date + 'T12:00:00').toLocaleDateString('fr-FR',
        { weekday: 'long', day: 'numeric', month: 'long' }),
      remarques: nettoyer(p.remarques, 500),
      lignes, sousTotal, livraison,
      total: sousTotal + (livraison || 0),
      devise: CONFIG.devise,
      source: nettoyer(p.source, 60)
    }
  };
}

/* ---- serveur ----------------------------------------------------------- */
const serveur = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

  if (url.pathname === '/api/sante') {
    return json(res, 200, {
      ok: true,
      resend: Boolean(CONFIG.resendKey),
      destinataire: CONFIG.ownerEmail ? CONFIG.ownerEmail.replace(/(.).*(@.*)/, '$1***$2') : null,
      articles: Object.keys(CATALOGUE).length
    });
  }

  if (url.pathname === '/api/export' && req.method === 'GET') {
    if (!CONFIG.exportToken || url.searchParams.get('cle') !== CONFIG.exportToken) {
      return json(res, 403, { ok: false, erreur: 'Jeton invalide.' });
    }
    const chemin = await fichierExcel();
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="commandes-daaru-minam.xlsx"',
      'Content-Length': statSync(chemin).size
    });
    return createReadStream(chemin).pipe(res);
  }

  if (url.pathname !== '/api/commande') return json(res, 404, { ok: false, erreur: 'Inconnu.' });
  if (req.method !== 'POST') return json(res, 405, { ok: false, erreur: 'Méthode non autorisée.' });
  if (tropDeRequetes(ip)) return json(res, 429, { ok: false, erreur: 'Trop de commandes. Réessayez plus tard.' });

  let brut;
  try { brut = await lireCorps(req); }
  catch (e) { return json(res, 413, { ok: false, erreur: 'Requête trop volumineuse.' }); }

  const { erreurs, commande } = construire(analyser(brut, req.headers['content-type'] || ''));
  if (erreurs) return json(res, 400, { ok: false, erreurs });

  /* 1. on enregistre AVANT d'envoyer les e-mails : rien ne doit être perdu */
  let chemin = cheminExcel();
  try { chemin = await enregistrer(commande); }
  catch (e) { console.error('[excel]', commande.ref, e.message); }

  /* 2. e-mails, sans bloquer la réponse si Resend tousse */
  const envois = { boutique: false, client: false, erreurs: [] };
  try { await prevenirBoutique(commande, chemin); envois.boutique = true; }
  catch (e) { envois.erreurs.push('boutique: ' + e.message); console.error('[mail boutique]', commande.ref, e.message); }
  try { if (await confirmerClient(commande)) envois.client = true; }
  catch (e) { envois.erreurs.push('client: ' + e.message); console.error('[mail client]', commande.ref, e.message); }

  console.log(`[commande] ${commande.ref} ${commande.nom} ${commande.total} ${CONFIG.devise}` +
    ` · boutique=${envois.boutique} client=${envois.client}`);
  return json(res, 200, { ok: true, reference: commande.ref, total: commande.total, envois });
});

serveur.listen(CONFIG.port, '127.0.0.1', () => {
  console.log(`Daaru Minam API — écoute sur 127.0.0.1:${CONFIG.port}`);
  if (!CONFIG.resendKey) console.warn('⚠️  RESEND_API_KEY absente : aucun e-mail ne partira.');
  if (!CONFIG.ownerEmail) console.warn('⚠️  OWNER_EMAIL absente : aucun e-mail ne partira.');
});
