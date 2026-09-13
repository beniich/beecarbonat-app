const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const ctrl = require("./qr.controller");
const { authMiddleware } = require("../../middleware/auth.middleware");

const router = Router();

const scanLimiter = rateLimit({
  windowMs: 60000,
  limit: 60,
  message: { error: "QR_SCAN_RATE_LIMIT", message: "Limite de scans atteinte" },
});

const generateLimiter = rateLimit({
  windowMs: 60000,
  limit: 30,
});

const batchLimiter = rateLimit({
  windowMs: 300000,
  limit: 10,
});

// Middleware helper to optionally verify auth without failing if public
const optionalAuth = (req, res, next) => {
  if (req.headers.authorization) {
    return authMiddleware(req, res, (err) => {
      // Proceed even if auth fails on public scan endpoint
      next();
    });
  }
  next();
};

// PUBLIC / OPTIONAL AUTH ROUTES
router.get("/scan/:code", scanLimiter, optionalAuth, ctrl.scanQrCode);
router.post("/scan/:code", scanLimiter, optionalAuth, ctrl.scanQrCode);

// PROTECTED ROUTES
router.get("/asset/:assetId", generateLimiter, authMiddleware, ctrl.getAssetQRCode);
router.get("/asset/:assetId/dynamic", generateLimiter, authMiddleware, ctrl.getDynamicToken);
router.post("/batch", batchLimiter, authMiddleware, ctrl.generateBatchQR);
router.get("/asset/:assetId/analytics", authMiddleware, ctrl.getQRAnalytics);
router.post("/asset/:assetId/deactivate", authMiddleware, ctrl.deactivateQR);

module.exports = router;
