/**
 * Google Search Console — vérification de propriété.
 *
 * Google exige le fichier à l'URL exacte `/google828cdca86e1ae00b.html`.
 * Cloudflare Pages normalise les chemins en `.html` vers l'équivalent sans
 * extension avec un 308, donc l'asset statique de `public/` ne peut pas être
 * servi tel quel. Cette fonction répond directement sur le chemin exact.
 */
const BODY = 'google-site-verification: google828cdca86e1ae00b.html';

export const onRequest = async (): Promise<Response> =>
  new Response(BODY, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
