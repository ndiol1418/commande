import { readFileSync } from 'node:fs';
import { CONFIG } from './config.js';
import { mailBoutique, mailClient, texteBoutique } from './templates.js';

async function envoyer(payload) {
  if (!CONFIG.resendKey) throw new Error('RESEND_API_KEY absente');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.resendKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const corps = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status} : ${corps}`);
  return JSON.parse(corps || '{}');
}

/* Commande vers la boutique, avec le fichier Excel en pièce jointe. */
export async function prevenirBoutique(c, cheminExcel) {
  const piece = [];
  try {
    piece.push({
      filename: 'commandes-daaru-minam.xlsx',
      content: readFileSync(cheminExcel).toString('base64')
    });
  } catch (e) { /* on envoie quand même l'e-mail sans la pièce jointe */ }

  return envoyer({
    from: CONFIG.from,
    to: [CONFIG.ownerEmail],
    reply_to: c.email || CONFIG.replyTo,
    subject: `Nouvelle commande ${c.ref} — ${c.nom}`,
    text: texteBoutique(c),
    html: mailBoutique(c),
    attachments: piece
  });
}

/* Confirmation automatique au client. */
export async function confirmerClient(c) {
  if (!c.email) return null;
  return envoyer({
    from: CONFIG.from,
    to: [c.email],
    reply_to: CONFIG.replyTo,
    subject: `Votre commande ${c.ref} — Daaru Minam Cafe`,
    html: mailClient(c),
    text: texteBoutique(c)
  });
}
