function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const shell = (title: string, body: string) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px;
    background: #f6f6f7; color: #0a0a0b;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%; max-width: 560px; background: #fff; border: 1px solid #e7e7ea;
    border-radius: 16px; padding: 32px; box-shadow: 0 1px 2px rgba(10,10,11,.04), 0 12px 32px -12px rgba(10,10,11,.12);
  }
  .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 28px; font-size: 13px; font-weight: 600; letter-spacing: -.01em; }
  .dot { width: 22px; height: 22px; border-radius: 6px; background: #0a0a0b; }
  h1 { font-size: 22px; letter-spacing: -.02em; margin: 0 0 8px; }
  p { color: #52525b; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }
  .content { white-space: pre-wrap; word-break: break-word; font-size: 16px; line-height: 1.7; background: #fafafa; border: 1px solid #eeeef1; border-radius: 12px; padding: 16px; }
  a.button { display: inline-block; margin-top: 20px; background: #0a0a0b; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; }
  .footer { margin-top: 28px; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
  <main class="card">
    <div class="brand"><span class="dot"></span> QR Studio</div>
    ${body}
    <p class="footer">Ce QR code est un lien dynamique propulsé par QR Studio.</p>
  </main>
</body>
</html>`;

export function textPage(text: string, qrName: string): string {
  return shell(qrName || 'Message', `
    <h1>${escapeHtml(qrName || 'Message')}</h1>
    <p>Ce QR code contient le message suivant :</p>
    <div class="content">${escapeHtml(text)}</div>
  `);
}

export function notFoundPage(): string {
  return shell('QR code introuvable', `
    <h1>QR code introuvable</h1>
    <p>Ce lien ne correspond à aucun QR code actif. Il a peut-être été supprimé par son propriétaire.</p>
    <a class="button" href="/">Découvrir QR Studio</a>
  `);
}

export function inactivePage(): string {
  return shell('QR code désactivé', `
    <h1>QR code désactivé</h1>
    <p>Ce QR code a été désactivé par son propriétaire. Contactez-le si vous pensez qu’il s’agit d’une erreur.</p>
    <a class="button" href="/">Découvrir QR Studio</a>
  `);
}

export function errorPage(): string {
  return shell('Service momentanément indisponible', `
    <h1>Réessayez dans un instant</h1>
    <p>La redirection ne peut pas être traitée pour le moment. Merci de réessayer dans quelques secondes.</p>
  `);
}
