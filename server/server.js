require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3003;

// Render est derrière Cloudflare, qui ajoute lui-même un hop : la chaîne X-Forwarded-For
// observée est "client, cloudflare, render-lb-interne" (3 entrées). Avec le socket direct,
// il faut donc faire confiance à 3 hops pour que req.ip retombe sur la vraie IP du client
// (utilisé pour le contrôle Wi-Fi du pointage). Si Render change son infra, revérifier via
// GET /api/debug-ip depuis un poste connecté au Wi-Fi de l'entreprise.
app.set('trust proxy', 3);

app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/employes', require('./routes/employes'));
app.use('/api/sites-config', require('./routes/sitesConfig'));
app.use('/api/pointages', require('./routes/pointages'));
app.use('/api/demandes', require('./routes/demandes'));
app.use('/api/salaires', require('./routes/salaires'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'Gestion Employés API' });
});

app.use((_req, res) => res.status(404).json({ error: 'Route introuvable' }));

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`Gestion Employés API démarrée sur le port ${PORT}`);
});
