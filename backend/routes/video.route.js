const express = require('express');
const router = express.Router();
const axios = require('axios');
const nodemailer = require('nodemailer');
const verifyToken = require('../middleware/verifyToken');
const authorizeRole = require('../middleware/authorizeRole');

const SHOTSTACK_API_KEY = process.env.SHOTSTACK_API_KEY;
const SHOTSTACK_URL = 'https://api.shotstack.io/edit/stage/render';
const BUFFER_API_KEY = process.env.BUFFER_API_KEY;

// Canaux Buffer par réseau
const BUFFER_CHANNELS = {
  facebook: process.env.BUFFER_CHANNEL_FB,
  instagram: process.env.BUFFER_CHANNEL_IG,
};

// Dimensions verticales (compatibles Facebook post ET Instagram Reels)
const W = 1080, H = 1920;

// ── Construire la timeline Shotstack (format vertical 1080x1920) ─────────────
function buildTimeline(hotels) {
  const clips = [];

  // INTRO
  clips.push({
    asset: {
      type: 'html',
      html: "<div style='background:#003580;color:#feba02;font-family:Arial;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center'><span style='font-size:90px;font-weight:900'>SmartTravel</span><span style='font-size:36px;color:#c8e0ff;margin-top:20px'>Agence de voyage en Tunisie</span></div>",
      width: W, height: H, background: '#003580'
    },
    start: 0, length: 3,
    transition: { in: 'fade', out: 'fade' }
  });

  let t = 3;

  for (const h of hotels) {
    const prix = (h.prixMin && h.prixMin > 0) ? `A partir de ${h.prixMin} TND/nuit` : '';
    const imgUrl = (h.images || []).find(img => img && img.indexOf('http') === 0 && img.indexOf('localhost') === -1);

    if (imgUrl) {
      // Image plein écran
      clips.push({
        asset: { type: 'image', src: imgUrl },
        start: t, length: 3.5,
        fit: 'cover',
        effect: 'zoomIn',
        transition: { in: 'fade', out: 'fade' }
      });
      // Overlay texte en bas
      clips.push({
        asset: {
          type: 'html',
          html: `<div style='background:linear-gradient(to top,rgba(0,0,0,0.9),transparent);padding:40px;font-family:Arial;text-align:center'><div style='color:white;font-size:56px;font-weight:900'>${h.nom}</div><div style='color:#e2e8f0;font-size:34px;margin-top:10px'>${h.localisation}</div>${prix ? `<div style='margin-top:16px;background:#feba02;color:#003580;display:inline-block;padding:10px 28px;border-radius:30px;font-weight:900;font-size:32px'>${prix}</div>` : ''}</div>`,
          width: W, height: 600, background: 'transparent'
        },
        start: t, length: 3.5,
        position: 'bottom'
      });
      t += 3.5;
    } else {
      // Slide texte plein écran
      clips.push({
        asset: {
          type: 'html',
          html: `<div style='background:#0057b8;color:white;font-family:Arial;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:50px'><span style='color:#feba02;font-size:64px;font-weight:900'>${h.nom}</span><span style='font-size:36px;margin-top:20px;color:#c8e0ff'>${h.localisation}</span>${prix ? `<span style='font-size:32px;margin-top:16px;color:#feba02'>${prix}</span>` : ''}</div>`,
          width: W, height: H, background: '#0057b8'
        },
        start: t, length: 3.5,
        transition: { in: 'slideUp', out: 'slideUp' }
      });
      t += 3.5;
    }
  }

  // OUTRO
  clips.push({
    asset: {
      type: 'html',
      html: "<div style='background:#003580;color:white;font-family:Arial;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center'><span style='color:#feba02;font-size:70px;font-weight:900'>Reservez maintenant!</span><span style='font-size:42px;margin-top:24px'>smarttravel.tn</span></div>",
      width: W, height: H, background: '#003580'
    },
    start: t, length: 3,
    transition: { in: 'fade', out: 'fade' }
  });

  return {
    soundtrack: {
      src: 'https://shotstack-assets.s3.amazonaws.com/music/freepd/advertising.mp3',
      effect: 'fadeOut', volume: 0.3
    },
    tracks: [{ clips }]
  };
}

// ── Publier sur un canal Buffer (Facebook ou Instagram) ──────────────────────
async function publierBuffer(videoUrl, description, channelId, platform) {
  try {
    const metadata = platform === 'instagram'
      ? { instagram: { type: 'reel', shouldShareToFeed: true } }
      : { facebook: { type: 'post' } };

    const mutation = `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        __typename
        ... on PostActionSuccess { post { id status } }
        ... on UnexpectedError { message }
        ... on InvalidInputError { message }
        ... on UnauthorizedError { message }
      }
    }`;
    const resp = await axios.post('https://api.buffer.com/graphql', {
      query: mutation,
      variables: {
        input: {
          channelId,
          schedulingType: 'automatic',
          mode: 'shareNow',
          text: `${description} #SmartTravel #Hotel #Tunisie #Voyage`,
          assets: [{ video: { url: videoUrl } }],
          metadata
        }
      }
    }, {
      headers: { Authorization: `Bearer ${BUFFER_API_KEY}`, 'Content-Type': 'application/json' }
    });
    console.log(`[Video] Buffer ${platform}:`, JSON.stringify(resp.data?.data?.createPost));
  } catch (err) {
    console.error(`[Video] Erreur Buffer ${platform}:`, err.response?.data || err.message);
  }
}

// ── Email notification ────────────────────────────────────────────────────────
async function sendEmail(adminEmail, videoUrl, titre, publierSur) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await transporter.sendMail({
      from: `"SmartTravel" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: '🎬 Votre vidéo SmartTravel est prête et publiée !',
      html: `
        <div style="font-family:Arial;max-width:600px;margin:0 auto">
          <div style="background:#003580;padding:28px;border-radius:10px 10px 0 0;text-align:center">
            <h1 style="color:#feba02;margin:0">SmartTravel</h1>
          </div>
          <div style="background:#f8fafc;padding:28px;border-radius:0 0 10px 10px">
            <h2 style="color:#1e293b">🎬 Votre vidéo publicitaire est prête !</h2>
            <p style="color:#475569">La vidéo <strong>${titre}</strong> a été générée et publiée.</p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0">
              <p style="font-weight:600;color:#374151;margin:0 0 8px">📹 Télécharger la vidéo :</p>
              <a href="${videoUrl}" style="color:#003580;word-break:break-all">${videoUrl}</a>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#166534">✅ Publiée sur : ${(publierSur || []).join(', ').toUpperCase() || 'Facebook'}</p>
            </div>
            <a href="${videoUrl}" style="display:inline-block;background:#003580;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700">⬇ Télécharger MP4</a>
          </div>
        </div>
      `
    });
    console.log('[Video] Email envoyé à', adminEmail);
  } catch (err) {
    console.error('[Video] Erreur email:', err.message);
  }
}

// ── POST /api/video/generer ────────────────────────────────────────────────────
// ARCHITECTURE HYBRIDE :
//   • Facebook  → délégué au workflow n8n (génère sa vidéo horizontale + publie)
//   • Instagram → traité par le backend (vidéo verticale 1080x1920 pour Reels)
router.post('/generer', verifyToken, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { hotels, titre, description, publierSur } = req.body;
    if (!hotels || hotels.length === 0)
      return res.status(400).json({ message: 'Sélectionnez au moins un hôtel.' });

    const adminEmail = req.user?.email || process.env.SMTP_USER;
    const reseaux = (publierSur && publierSur.length) ? publierSur : ['facebook'];

    res.json({ message: 'Génération lancée ! Vous recevrez un email quand la vidéo sera publiée (~2 min).' });

    // ── FACEBOOK → déclencher le workflow n8n ──────────────────────────────────
    if (reseaux.includes('facebook') && process.env.N8N_VIDEO_WEBHOOK_URL) {
      axios.post(process.env.N8N_VIDEO_WEBHOOK_URL, {
        hotels, titre, description, publierSur: ['facebook'], adminEmail
      }, { timeout: 15000 })
        .then(() => console.log('[Video] Workflow n8n déclenché pour Facebook'))
        .catch(err => console.error('[Video] Erreur webhook n8n:', err.message));
    }

    // ── INSTAGRAM → traitement backend (vidéo verticale) ───────────────────────
    if (reseaux.includes('instagram') && BUFFER_CHANNELS.instagram) {
      (async () => {
        try {
          const timeline = buildTimeline(hotels);
          const shotstackResp = await axios.post(SHOTSTACK_URL, {
            timeline,
            output: { format: 'mp4', size: { width: W, height: H }, fps: 25 }
          }, {
            headers: { 'x-api-key': SHOTSTACK_API_KEY, 'Content-Type': 'application/json' }
          });
          const renderId = shotstackResp.data.response.id;
          console.log('[Video][IG] Render soumis:', renderId);

          let videoUrl = null;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 15000));
            const s = await axios.get(`${SHOTSTACK_URL}/${renderId}`, {
              headers: { 'x-api-key': SHOTSTACK_API_KEY }
            });
            const status = s.data.response.status;
            console.log('[Video][IG] Statut render:', status);
            if (status === 'done') { videoUrl = s.data.response.url; break; }
            if (status === 'failed') { console.error('[Video][IG] Render échoué'); break; }
          }
          if (!videoUrl) { console.error('[Video][IG] Timeout render'); return; }

          const desc = description || 'Découvrez nos hôtels SmartTravel !';
          await publierBuffer(videoUrl, desc, BUFFER_CHANNELS.instagram, 'instagram');
          await sendEmail(adminEmail, videoUrl, titre || 'Vidéo SmartTravel (Instagram)', ['instagram']);
          console.log('[Video][IG] ✅ Publié sur Instagram ! URL:', videoUrl);
        } catch (err) {
          console.error('[Video][IG] Erreur:', err.response?.data || err.message);
        }
      })();
    }

  } catch (err) {
    console.error('[Video]', err.message);
    if (!res.headersSent) res.status(500).json({ message: err.message });
  }
});

module.exports = router;
