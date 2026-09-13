const crypto = require("node:crypto");

/**
 * Système de signature cryptographique pour QR codes
 * - HMAC-SHA256 pour intégrité
 * - Short codes opaques
 */

const qrSigner = {
  /**
   * Génère un payload signé : {code, exp, sig}
   */
  sign(shortCode, options = {}) {
    const {
      tenantId,
      assetId,
      ttlMs = 0,             // 0 = pas d'expiration
      rotating = false,
      geoFence = null,        // {lat, lng, radiusM}
      metadata = {},
    } = options;

    const now = Date.now();
    const payload = {
      code: shortCode,
      ts: now,
      exp: ttlMs ? now + ttlMs : null,
      tid: tenantId,
      aid: assetId,
      gf: geoFence ? this.compressGeoFence(geoFence) : null,
      md: metadata,
      rot: rotating ? 1 : 0,
    };

    // Sign payload
    const sig = this.computeHmac(payload);
    
    return {
      ...payload,
      sig,
      full: this.encodePayload({ ...payload, sig }),
    };
  },

  /**
   * Vérifie un payload signé
   */
  verify(encoded, options = {}) {
    const { allowExpired = false, allowGeoFence = false } = options;
    
    try {
      const decoded = this.decodePayload(encoded);
      
      // Vérifier signature HMAC
      const expectedSig = this.computeHmac(decoded);
      if (!this.timingSafeEqual(decoded.sig, expectedSig)) {
        return { valid: false, reason: "INVALID_SIGNATURE" };
      }

      // Vérifier expiration
      if (decoded.exp && Date.now() > decoded.exp && !allowExpired) {
        return { valid: false, reason: "EXPIRED" };
      }

      // Vérifier géofence si applicable
      if (decoded.gf && !allowGeoFence) {
        return { valid: true, requiresGeoCheck: true, payload: decoded };
      }

      return { 
        valid: true, 
        payload: decoded,
      };
    } catch (e) {
      return { valid: false, reason: "MALFORMED" };
    }
  },

  /**
   * HMAC-SHA256 avec secret
   */
  computeHmac(payload) {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const secret = this.getCurrentSecret();
    return crypto
      .createHmac("sha256", secret)
      .update(canonical)
      .digest("hex")
      .slice(0, 32);
  },

  getCurrentSecret() {
    return process.env.QR_SIGNING_KEY || process.env.JWT_SECRET || "qr-signing-secret-default-key-2026";
  },

  encodePayload(payload) {
    const json = JSON.stringify(payload);
    return Buffer.from(json)
      .toString("base64url")
      .replace(/=/g, "");
  },

  decodePayload(encoded) {
    const padded = encoded + "=".repeat((4 - encoded.length % 4) % 4);
    const json = Buffer.from(padded, "base64url").toString("utf8");
    return JSON.parse(json);
  },

  compressGeoFence({ lat, lng, radiusM }) {
    return {
      lt: Math.round(lat * 1000) / 1000,
      lg: Math.round(lng * 1000) / 1000,
      r: radiusM,
    };
  },

  timingSafeEqual(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  },
};

function generateShortCode(tenantId = "T", assetId = "A") {
  const tenantPrefix = String(tenantId).slice(0, 1).toUpperCase();
  const assetPrefix = String(assetId).slice(0, 1).toUpperCase();
  const random = crypto.randomBytes(10)
    .toString("hex")
    .slice(0, 15)
    .toUpperCase()
    .match(/.{1,5}/g)
    .join("-");
  return `${tenantPrefix}${assetPrefix}-${random}`;
}

function assetQrHash(tenantId, assetId) {
  return crypto
    .createHash("sha256")
    .update(`${tenantId}:${assetId}`)
    .digest("hex")
    .slice(0, 22);
}

module.exports = {
  qrSigner,
  generateShortCode,
  assetQrHash,
};
