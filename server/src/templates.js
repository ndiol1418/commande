import { CONFIG, money } from './config.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ligneTable = (etiquette, valeur) => valeur
  ? `<tr><td style="padding:7px 18px 7px 0;color:#8a8178;white-space:nowrap;vertical-align:top">${esc(etiquette)}</td>
         <td style="padding:7px 0;color:#141211"><b>${esc(valeur)}</b></td></tr>`
  : '';

const cadre = (titre, corps) => `
<div style="font-family:Helvetica,Arial,sans-serif;background:#f4ede4;padding:28px 16px">
  <div style="max-width:560px;margin:auto;background:#fff;border-top:4px solid #e2531c;padding:30px">
    <p style="margin:0 0 6px;letter-spacing:.24em;font-size:11px;color:#e2531c">DAARU MINAM CAFE</p>
    <h1 style="margin:0 0 22px;font-size:21px;line-height:1.3;color:#141211">${esc(titre)}</h1>
    ${corps}
  </div>
  <p style="max-width:560px;margin:16px auto 0;font-size:11px;color:#8a8178;text-align:center">
    Daaru Minam Cafe · Le caractère du café Touba
  </p>
</div>`;

const recapProduits = c => `
  <table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 18px">
    ${c.lignes.map(l => `
      <tr>
        <td style="padding:7px 0;border-bottom:1px solid #efe7dc;color:#141211">
          ${esc(l.nom)} ${esc(l.format)} <span style="color:#8a8178">× ${l.qte}</span>
        </td>
        <td style="padding:7px 0;border-bottom:1px solid #efe7dc;text-align:right;white-space:nowrap">
          ${money(l.total)}
        </td>
      </tr>`).join('')}
    <tr>
      <td style="padding:10px 0;color:#8a8178">Livraison</td>
      <td style="padding:10px 0;text-align:right;color:#8a8178">
        ${c.livraison === null ? 'à confirmer' : money(c.livraison)}
      </td>
    </tr>
    <tr>
      <td style="padding:4px 0;font-size:16px"><b>${c.livraison === null ? 'Total produits' : 'Total'}</b></td>
      <td style="padding:4px 0;text-align:right;font-size:18px"><b>${money(c.total)}</b></td>
    </tr>
  </table>`;

/* E-mail reçu par la boutique */
export function mailBoutique(c) {
  const tel = String(c.tel || '').replace(/\D/g, '');
  return cadre(`Nouvelle commande ${c.ref}`, `
    ${recapProduits(c)}
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${ligneTable('Client', c.nom)}
      ${ligneTable('Téléphone', c.telAffiche)}
      ${ligneTable('E-mail', c.email)}
      ${ligneTable('Mode', c.mode === 'retrait' ? 'Retrait sur place' : 'Livraison')}
      ${ligneTable('Adresse', c.mode === 'retrait' ? '' : c.adresse)}
      ${ligneTable('Souhaitée', `${c.dateLisible} à ${c.heure}`)}
      ${ligneTable('Remarques', c.remarques)}
    </table>
    ${tel ? `<p style="margin:26px 0 0">
      <a href="https://wa.me/${tel}" style="display:inline-block;background:#141211;color:#fff;
         text-decoration:none;padding:13px 22px;font-size:14px">Répondre sur WhatsApp</a></p>` : ''}
    <p style="margin:22px 0 0;font-size:12px;color:#8a8178;line-height:1.6">
      Le fichier Excel de toutes les commandes est joint à ce message.
    </p>`);
}

/* E-mail de confirmation envoyé au client */
export function mailClient(c) {
  return cadre('Votre commande est bien reçue.', `
    <p style="margin:0 0 20px;font-size:15px;color:#141211;line-height:1.6">
      Bonjour ${esc(c.nom.split(' ')[0])}, merci pour votre commande.
      Sa référence est <b>${esc(c.ref)}</b>. Nous vous contactons très vite sur
      WhatsApp au ${esc(c.telAffiche)} pour confirmer
      ${c.mode === 'retrait' ? 'le retrait' : 'la livraison et son coût'}.
    </p>
    ${recapProduits(c)}
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${ligneTable(c.mode === 'retrait' ? 'Retrait' : 'Livraison',
        c.mode === 'retrait' ? 'Sur place' : c.adresse)}
      ${ligneTable('Souhaitée', `${c.dateLisible} à ${c.heure}`)}
      ${ligneTable('Remarques', c.remarques)}
    </table>
    <p style="margin:26px 0 0">
      <a href="https://wa.me/${CONFIG.whatsapp}" style="display:inline-block;background:#e2531c;
         color:#fff;text-decoration:none;padding:13px 22px;font-size:14px">Nous écrire sur WhatsApp</a></p>
    <p style="margin:22px 0 0;font-size:12px;color:#8a8178;line-height:1.6">
      Paiement à la livraison. Pour modifier ou annuler, répondez simplement à cet e-mail.
    </p>`);
}

export function texteBoutique(c) {
  return [
    `Nouvelle commande ${c.ref}`, '',
    ...c.lignes.map(l => `- ${l.nom} ${l.format} x${l.qte} : ${money(l.total)}`),
    '', `Total : ${money(c.total)}`,
    `Livraison : ${c.livraison === null ? 'à confirmer' : money(c.livraison)}`, '',
    `Client : ${c.nom}`, `Téléphone : ${c.telAffiche}`,
    c.email ? `E-mail : ${c.email}` : '',
    c.mode === 'retrait' ? 'Retrait sur place' : `Adresse : ${c.adresse}`,
    `Souhaitée : ${c.dateLisible} à ${c.heure}`,
    c.remarques ? `Remarques : ${c.remarques}` : ''
  ].filter(Boolean).join('\n');
}
