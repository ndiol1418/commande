import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/* .env minimal, sans dépendance */
const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const ligne of readFileSync(envFile, 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export const CONFIG = {
  port: Number(process.env.PORT || 8787),
  resendKey: process.env.RESEND_API_KEY || '',
  ownerEmail: process.env.OWNER_EMAIL || '',
  from: process.env.MAIL_FROM || 'Daaru Minam Cafe <onboarding@resend.dev>',
  replyTo: process.env.MAIL_REPLY_TO || process.env.OWNER_EMAIL || '',
  exportToken: process.env.EXPORT_TOKEN || '',
  whatsapp: process.env.WHATSAPP || '221775368231',
  devise: 'FCFA',
  dataDir: join(ROOT, 'data')
};

/* Catalogue de référence : les prix sont recalculés ici, jamais repris du
   navigateur. À garder aligné avec PRODUCTS dans assets/js/main.js. */
export const CATALOGUE = {
  'touba-250': { nom: 'Café Touba', format: '250 g', prix: 1625 },
  'touba-500': { nom: 'Café Touba', format: '500 g', prix: 3250 },
  'touba-1kg': { nom: 'Café Touba', format: '1 kg', prix: 6500 }
};

export const money = n =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' ' + CONFIG.devise;
