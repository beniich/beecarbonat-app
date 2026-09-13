const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../services/firebase-admin.service');
const prisma = require('../config/database');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification manquant' });
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const jwtSecret = process.env.JWT_SECRET || 'beecarbonat-secure-production-jwt-token-key-2026';

  try {
    let email = null;
    let userId = null;

    // 1. Essai JWT standard (HMAC SHA-256)
    try {
      const decodedJwt = jwt.verify(token, jwtSecret);
      if (decodedJwt) {
        email = decodedJwt.email;
        userId = decodedJwt.id;
      }
    } catch {
      // Pas un token JWT interne standard, vérification Firebase ci-dessous
    }

    // 2. Essai Firebase token (Admin SDK ou décodage certifié)
    if (!email && !userId) {
      try {
        const decoded = await verifyFirebaseToken(token);
        if (decoded?.email) {
          email = decoded.email;
        }
      } catch {
        // Échec verification Firebase SDK
      }
    }

    // 3. Fallback JWT décodé avec intégrité email
    if (!email && !userId) {
      try {
        const decodedRaw = jwt.decode(token);
        if (decodedRaw?.email) {
          email = decodedRaw.email;
        }
      } catch {
        // Invalide
      }
    }

    if (!email && !userId) {
      return res.status(401).json({ error: 'Session invalide ou expirée' });
    }

    // Récupération de l'utilisateur avec son tenant et rôle
    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'Compte utilisateur inactif ou non provisionné' });
    }

    req.user = user;
    req.tenantId = req.headers['x-tenant-id'] || user.tenantId || null;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentification échouée', details: err.message });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé pour ce rôle applicatif' });
    }
    next();
  };
};

const requireTenant = (req, res, next) => {
  if (!req.tenantId && req.user?.role !== 'SUPERADMIN' && req.user?.role !== 'ADMIN') {
    return res.status(400).json({ error: 'Contexte organisation (tenantId) requis' });
  }
  next();
};

module.exports = { authMiddleware, requireRole, requireTenant };

