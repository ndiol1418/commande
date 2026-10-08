/* Vérifie le serveur de bout en bout, sans toucher à Resend. */
import { spawn } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const PORT = 8899;
const DATA = join(process.cwd(), 'data');
rmSync(DATA, { recursive: true, force: true });

const srv = spawn(process.execPath, ['index.js'], {
  env: { ...process.env, PORT: String(PORT), RESEND_API_KEY: '', OWNER_EMAIL: '', EXPORT_TOKEN: 'test-token' },
  stdio: ['ignore', 'pipe', 'pipe']
});
srv.stdout.on('data', d => process.stdout.write('  [srv] ' + d));
srv.stderr.on('data', d => process.stdout.write('  [srv!] ' + d));

const attendre = ms => new Promise(r => setTimeout(r, ms));
const post = (corps) => fetch(`http://127.0.0.1:${PORT}/api/commande`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(corps)
}).then(async r => ({ code: r.status, corps: await r.json() }));

let echecs = 0;
const verifier = (nom, condition, detail = '') => {
  console.log((condition ? '  ✓ ' : '  ✗ ') + nom + (condition ? '' : '  → ' + detail));
  if (!condition) echecs++;
};

await attendre(900);
const demain = new Date(Date.now() + 864e5).toISOString().slice(0, 10);

console.log('\n1. Commande valide');
let r = await post({
  reference: 'DM-TEST01', nom: 'Awa Diop', telephone: '77 536 82 31',
  email: 'awa@example.com', mode: 'livraison', adresse: 'Médina, rue 11 x 22',
  date_livraison: demain, heure_livraison: '10:30',
  details: 'touba-1kg:2,touba-250:1', remarques: 'Appeler avant', source: 'test'
});
verifier('réponse 200', r.code === 200, JSON.stringify(r.corps));
verifier('référence conservée', r.corps.reference === 'DM-TEST01', r.corps.reference);
verifier('total recalculé côté serveur = 14625', r.corps.total === 14625, String(r.corps.total));
verifier('échec e-mail signalé sans planter', r.corps.envois && r.corps.envois.boutique === false);

console.log('\n2. Prix falsifié par le navigateur');
r = await post({
  nom: 'Pirate', telephone: '770000000', mode: 'retrait',
  date_livraison: demain, heure_livraison: '09:00',
  details: 'touba-1kg:1', sous_total: '1', total: '1', livraison: '0'
});
verifier('le serveur impose 6500', r.corps.total === 6500, String(r.corps.total));

console.log('\n3. Produit inconnu');
r = await post({ nom: 'X', telephone: '770000000', mode: 'retrait', date_livraison: demain, heure_livraison: '09:00', details: 'gratuit-9999:5' });
verifier('refusé', r.code === 400, JSON.stringify(r.corps));

console.log('\n4. Champs manquants');
r = await post({ nom: '', telephone: 'abc', mode: 'livraison', details: 'touba-250:1' });
verifier('refusé avec la liste des erreurs', r.code === 400 && r.corps.erreurs.length >= 3, JSON.stringify(r.corps));

console.log('\n4b. Troisième commande (vérifie que l\'Excel continue de se remplir)');
r = await post({ nom: 'Ibrahima Fall', telephone: '781234567', mode: 'retrait',
  date_livraison: demain, heure_livraison: '18:00', details: 'touba-500:3' });
verifier('acceptée', r.code === 200 && r.corps.total === 9750, JSON.stringify(r.corps));

console.log('\n5. Fichier Excel');
const xlsx = join(DATA, 'commandes.xlsx');
verifier('commandes.xlsx créé', existsSync(xlsx));
const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(xlsx);
const ws = wb.getWorksheet('Commandes');
verifier('3 commandes enregistrées', ws.rowCount === 4, 'lignes=' + ws.rowCount);
const l2 = ws.getRow(2).values;
verifier('1re ligne correcte', String(l2).includes('Awa Diop') && String(l2).includes('1 kg x2'), String(l2));
verifier('3e ligne correcte', String(ws.getRow(4).values).includes('Ibrahima Fall'), String(ws.getRow(4).values));
verifier('CSV de secours écrit', existsSync(join(DATA, 'commandes.csv')));

console.log('\n6. Santé et export');
const sante = await fetch(`http://127.0.0.1:${PORT}/api/sante`).then(r => r.json());
verifier('/api/sante répond', sante.ok === true && sante.articles === 3, JSON.stringify(sante));
const refuse = await fetch(`http://127.0.0.1:${PORT}/api/export?cle=faux`);
verifier('export protégé', refuse.status === 403);
const ok = await fetch(`http://127.0.0.1:${PORT}/api/export?cle=test-token`);
verifier('export autorisé avec le bon jeton', ok.status === 200 && (ok.headers.get('content-type') || '').includes('spreadsheet'));

console.log('\n7. Limitation anti-abus');
let bloque = false;
for (let i = 0; i < 25; i++) {
  const x = await post({ nom: 'Spam', telephone: '770000000', mode: 'retrait', date_livraison: demain, heure_livraison: '09:00', details: 'touba-250:1' });
  if (x.code === 429) { bloque = true; break; }
}
verifier('bloque au-delà de 20 commandes', bloque);

srv.kill();
console.log(echecs ? `\n❌ ${echecs} vérification(s) en échec` : '\n✅ tout est vert');
process.exit(echecs ? 1 : 0);
