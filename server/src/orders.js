import { mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { CONFIG } from './config.js';

const XLSX = () => join(CONFIG.dataDir, 'commandes.xlsx');
const CSV = () => join(CONFIG.dataDir, 'commandes.csv');

const COLONNES = [
  { header: 'Reçue le', key: 'recue', width: 20 },
  { header: 'Référence', key: 'ref', width: 12 },
  { header: 'Nom', key: 'nom', width: 24 },
  { header: 'Téléphone', key: 'tel', width: 18 },
  { header: 'E-mail', key: 'email', width: 26 },
  { header: 'Mode', key: 'mode', width: 12 },
  { header: 'Adresse', key: 'adresse', width: 38 },
  { header: 'Souhaitée le', key: 'date', width: 14 },
  { header: 'Heure', key: 'heure', width: 8 },
  { header: 'Commande', key: 'commande', width: 42 },
  { header: 'Sous-total', key: 'sousTotal', width: 12 },
  { header: 'Livraison', key: 'livraison', width: 12 },
  { header: 'Total', key: 'total', width: 12 },
  { header: 'Devise', key: 'devise', width: 8 },
  { header: 'Remarques', key: 'remarques', width: 34 },
  { header: 'Source', key: 'source', width: 18 }
];

/* Une commande, dans l'ordre exact de COLONNES. */
function valeurs(c) {
  return [
    new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }),
    c.ref,
    c.nom,
    c.telAffiche || c.tel,
    c.email || '',
    c.mode,
    c.mode === 'retrait' ? 'Retrait sur place' : c.adresse,
    c.date,
    c.heure,
    c.lignes.map(l => `${l.format} x${l.qte}`).join(' | '),
    c.sousTotal,
    c.livraison === null ? 'à confirmer' : c.livraison,
    c.total,
    c.devise,
    c.remarques || '',
    c.source || ''
  ];
}

function assurerDossier() {
  if (!existsSync(CONFIG.dataDir)) mkdirSync(CONFIG.dataDir, { recursive: true });
}

async function classeur() {
  assurerDossier();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Daaru Minam Cafe';
  if (existsSync(XLSX())) {
    await wb.xlsx.readFile(XLSX());
    return wb;
  }
  const ws = wb.addWorksheet('Commandes', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLONNES;
  ws.getRow(1).font = { bold: true, color: { argb: 'FFF4EDE4' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF141211' } };
  ws.getRow(1).height = 22;
  return wb;
}

/* Ajoute la commande au fichier Excel et au CSV de secours. */
export async function enregistrer(c) {
  const wb = await classeur();
  const ws = wb.getWorksheet('Commandes');
  /* ExcelJS perd les clés de colonnes quand il relit un fichier : on ajoute
     donc la ligne sous forme de tableau, dans l'ordre fixe de COLONNES. */
  ws.addRow(valeurs(c));
  ws.columns.forEach((col, i) => { if (!col.width) col.width = COLONNES[i].width; });
  await wb.xlsx.writeFile(XLSX());

  const champ = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  if (!existsSync(CSV())) {
    appendFileSync(CSV(), COLONNES.map(c => champ(c.header)).join(';') + '\n');
  }
  appendFileSync(CSV(), valeurs(c).map(champ).join(';') + '\n');

  return XLSX();
}

export async function fichierExcel() {
  assurerDossier();
  if (!existsSync(XLSX())) await (await classeur()).xlsx.writeFile(XLSX());
  return XLSX();
}

export const cheminExcel = XLSX;
