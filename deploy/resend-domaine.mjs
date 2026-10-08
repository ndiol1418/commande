/**
 * Vérifie (et crée au besoin) le domaine d'envoi dans Resend, puis affiche
 * les enregistrements DNS à ajouter chez le registrar.
 *   node resend-domaine.mjs daaruminamcafe.com
 */
const domaine = process.argv[2] || 'daaruminamcafe.com';
const cle = process.env.RESEND_API_KEY;
if (!cle) { console.error('RESEND_API_KEY absente.'); process.exit(1); }

const api = async (chemin, options = {}) => {
  const r = await fetch('https://api.resend.com' + chemin, {
    ...options,
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const texte = await r.text();
  let corps = {};
  try { corps = JSON.parse(texte); } catch (e) { corps = { brut: texte }; }
  return { code: r.status, corps };
};

const liste = await api('/domains');
if (liste.code === 401) { console.error('✗ Clé Resend refusée (401).'); process.exit(1); }
if (liste.code >= 400) { console.error('✗ Resend a répondu ' + liste.code, liste.corps); process.exit(1); }

let d = (liste.corps.data || []).find(x => x.name === domaine);

if (!d) {
  console.log(`Le domaine ${domaine} n'est pas encore déclaré dans Resend. Création…`);
  const cree = await api('/domains', { method: 'POST', body: JSON.stringify({ name: domaine }) });
  if (cree.code >= 400) { console.error('✗ Création impossible', cree.corps); process.exit(1); }
  d = cree.corps;
}

const detail = await api('/domains/' + d.id);
const info = detail.code < 400 ? detail.corps : d;

console.log(`\nDomaine : ${info.name}`);
console.log(`Statut  : ${info.status}`);

if (info.status === 'verified') {
  console.log('\n✓ Domaine vérifié : les e-mails peuvent partir de commandes@' + domaine);
} else {
  console.log('\n→ Ajoutez ces enregistrements DNS chez votre registrar, puis');
  console.log('  cliquez « Verify » dans Resend (ou relancez ce script) :\n');
  for (const r of info.records || []) {
    console.log(`  Type   : ${r.type}`);
    console.log(`  Nom    : ${r.name}`);
    console.log(`  Valeur : ${r.value}`);
    if (r.priority) console.log(`  Priorité : ${r.priority}`);
    console.log(`  TTL    : ${r.ttl || 'Auto'}\n`);
  }
  console.log('  Tant que ce n\'est pas fait, mettez dans server/.env :');
  console.log('      MAIL_FROM=Daaru Minam Cafe <onboarding@resend.dev>');
  console.log('  (cet expéditeur de test n\'écrit qu\'à l\'adresse de votre compte Resend)');
}
