/**
 * image.route.js — Proxy d'images
 * Certaines images d'hôtels proviennent de CDN protégés contre le hotlink
 * (tripadvisor, marriott, trvl-media…) : chargées directement par le navigateur
 * depuis l'origine de l'app, elles renvoient 403/échec → images cassées.
 * Ce proxy les récupère côté serveur (sans Referer navigateur) et les ré-émet.
 *
 * GET /api/image-proxy?url=<url encodée>
 */
const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// Bloque les hôtes internes pour éviter le SSRF.
function hoteInterdit(hostname) {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' || h === '0.0.0.0' || h.endsWith('.local') ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

router.get('/', async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).send('Paramètre url manquant');

  let cible;
  try { cible = new URL(String(raw)); }
  catch { return res.status(400).send('url invalide'); }

  if (!/^https?:$/.test(cible.protocol)) return res.status(400).send('protocole non autorisé');
  if (hoteInterdit(cible.hostname))      return res.status(400).send('hôte non autorisé');

  try {
    const upstream = await axios.get(cible.href, {
      responseType: 'stream',
      timeout: 12000,
      maxRedirects: 3,
      // Headers « navigateur » sans Referer de notre origine → contourne le hotlink.
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const contentType = upstream.headers['content-type'] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      upstream.data.destroy?.();
      return res.status(415).send('La ressource cible n’est pas une image');
    }

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800'); // 7 jours
    res.set('Access-Control-Allow-Origin', '*');
    upstream.data.pipe(res);
  } catch (err) {
    console.error('[image-proxy]', cible.hostname, err.message);
    res.status(502).send('Image indisponible');
  }
});

module.exports = router;
