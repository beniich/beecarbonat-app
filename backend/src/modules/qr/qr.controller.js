const prisma = require("../../config/database");
const { qrGenerator } = require("./qr.generator");
const { qrSigner } = require("./qr.signing");
const { qrAnalytics } = require("./qr.analytics");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

async function getAssetQRCode(req, res, next) {
  try {
    const { assetId } = req.params;
    const { format = "QR_HIGH", regenerate = false } = req.query;
    const tenantId = req.user?.tenantId || req.tenantId || "default-tenant";

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      include: {
        building: true,
        type: true,
      },
    });

    if (!asset) {
      return res.status(404).json({ error: "ASSET_NOT_FOUND", message: "Équipement non trouvé" });
    }

    let qr = null;
    
    if (regenerate !== "true" && regenerate !== true) {
      const existing = await prisma.assetQRCode.findFirst({
        where: { 
          tenantId, 
          assetId,
          isActive: true,
        },
        orderBy: { generatedAt: "desc" },
      });
      
      if (existing) {
        qr = await qrGenerator.generateAssetQR({
          tenantId,
          assetId,
          format,
        });
        qr = { 
          ...qr,
          shortCode: existing.shortCode || qr.shortCode,
          scanCount: existing.scanCount,
          firstScannedAt: existing.firstScannedAt,
          lastScannedAt: existing.lastScannedAt,
          isExisting: true,
        };
      }
    }

    if (!qr) {
      qr = await qrGenerator.generateAssetQR({
        tenantId,
        assetId,
        format,
      });

      try {
        await prisma.assetQRCode.create({
          data: {
            tenantId,
            assetId,
            shortCode: qr.shortCode,
            qrUrl: qr.url,
            signedPayload: qr.signedPayload,
            format,
            generatedBy: req.user?.id || "system",
          },
        });
      } catch (e) {
        console.warn("Notice: could not persist QR in DB", e.message);
      }
    }

    res.json({
      data: {
        asset: {
          id: asset.id,
          code: asset.code || asset.id,
          name: asset.name,
          buildingName: asset.building?.name,
        },
        qr: {
          shortCode: qr.shortCode,
          url: qr.url,
          dataUrl: qr.dataUrl,
          format,
          isDynamic: false,
        },
        stats: {
          scanCount: qr.scanCount || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getDynamicToken(req, res, next) {
  try {
    const { assetId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId || "default-tenant";

    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
    });
    if (!asset) {
      return res.status(404).json({ error: "ASSET_NOT_FOUND", message: "Équipement introuvable" });
    }

    const token = await qrGenerator.generateDynamicToken(tenantId, assetId);

    res.json({
      data: {
        shortCode: token.shortCode,
        token: token.token,
        dataUrl: token.dataUrl,
        expiresAt: new Date(token.exp).toISOString(),
        durationMs: 30000,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function scanQrCode(req, res, next) {
  try {
    const { code } = req.params;
    
    const isShortCode = /^[A-Z0-9-]{6,40}$/i.test(code);
    const isFullPayload = code.startsWith("eyJ") || code.length > 80;

    let assetId = null;
    let tenantId = null;
    let signedPayload = null;

    if (isFullPayload) {
      const verification = qrSigner.verify(code);
      if (!verification.valid) {
        return res.status(400).json({
          error: "INVALID_QR",
          reason: verification.reason,
        });
      }
      assetId = verification.payload.aid;
      tenantId = verification.payload.tid;
      signedPayload = verification.payload;
    } else if (isShortCode) {
      let qrEntry = null;
      try {
        qrEntry = await prisma.assetQRCode.findFirst({
          where: { 
            shortCode: code.toUpperCase(),
            isActive: true,
          },
          include: { asset: true },
        });
      } catch (e) {
        qrEntry = null;
      }
      
      if (!qrEntry) {
        // Fallback: lookup directly by asset code or ID if present
        const fallbackAsset = await prisma.asset.findFirst({
          where: {
            OR: [
              { code: code.toUpperCase() },
              { id: code }
            ]
          }
        });

        if (!fallbackAsset) {
          return res.status(404).json({
            error: "QR_NOT_FOUND",
            suggestion: "Ce QR code est inconnu ou a été désactivé.",
          });
        }

        tenantId = fallbackAsset.tenantId;
        assetId = fallbackAsset.id;
      } else {
        tenantId = qrEntry.tenantId;
        assetId = qrEntry.assetId;
        signedPayload = qrEntry.signedPayload;
      }
      
      if (signedPayload && typeof signedPayload === "string") {
        const sigCheck = qrSigner.verify(signedPayload);
        if (!sigCheck.valid) {
          return res.status(400).json({ 
            error: "INVALID_QR_SIGNATURE",
            message: "Signature QR non valide",
          });
        }
      }
    } else {
      return res.status(400).json({ error: "INVALID_QR_FORMAT", message: "Format QR non reconnu" });
    }

    try {
      await prisma.assetQRCode.updateMany({
        where: { shortCode: code.toUpperCase() },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      });
    } catch (e) {
      // Ignored
    }

    trackScanEvent({
      tenantId: tenantId || req.user?.tenantId || "default-tenant",
      assetId,
      shortCode: code.toUpperCase(),
      request: req,
    }).catch(() => {});

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        building: true,
        type: true,
        _count: {
          select: { 
            tickets: { 
              where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
            } 
          },
        },
      },
    });

    if (!asset) {
      return res.status(404).json({ error: "ASSET_NOT_FOUND", message: "Équipement introuvable" });
    }

    res.json({
      data: {
        asset: {
          id: asset.id,
          code: asset.code || asset.id,
          name: asset.name,
          type: asset.type?.name || "Équipement",
          building: asset.building?.name || "Bâtiment principal",
          openTickets: asset._count?.tickets || 0,
        },
        redirectUrl: `/tickets/new?asset=${asset.id}`,
        requiresAuth: !req.user,
        signedPayload,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function trackScanEvent({ tenantId, assetId, shortCode, request }) {
  try {
    const userAgent = request.headers["user-agent"] || "";
    const ipAddress = request.ip || request.headers["x-forwarded-for"]?.split(",")[0] || "127.0.0.1";
    const referer = request.headers.referer || "";
    
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();
    const geo = geoip.lookup(ipAddress);

    await prisma.qRScanEvent.create({
      data: {
        tenantId: tenantId || "default-tenant",
        assetId,
        shortCode,
        ipAddress,
        country: geo?.country || "FR",
        city: geo?.city || "Paris",
        deviceType: ua.device?.type || "mobile",
        os: ua.os?.name || "iOS",
        browser: ua.browser?.name || "Safari",
        referer,
        userAgent,
      },
    });
  } catch (e) {
    // Non blocking analytics logger
  }
}

async function generateBatchQR(req, res, next) {
  try {
    const tenantId = req.user?.tenantId || req.tenantId || "default-tenant";
    const { 
      assetIds = [], 
      buildingId,
      format = "QR_HIGH",
      layout = "a4",
    } = req.body;

    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        id: assetIds.length ? { in: assetIds } : undefined,
        buildingId: buildingId || undefined,
      },
      take: 1000,
    });

    if (assets.length === 0) {
      return res.status(400).json({ error: "NO_ASSETS", message: "Aucun équipement trouvé" });
    }

    const result = await qrGenerator.generateBatch({
      tenantId,
      assets,
      format,
      layout,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=qr-batch-${Date.now()}.pdf`);
    return res.send(result.pdf);
  } catch (error) {
    next(error);
  }
}

async function getQRAnalytics(req, res, next) {
  try {
    const { assetId } = req.params;
    const { period = "30d" } = req.query;
    const tenantId = req.user?.tenantId || req.tenantId || "default-tenant";

    const stats = await qrAnalytics.getAssetStats(tenantId, assetId, period);
    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
}

async function deactivateQR(req, res, next) {
  try {
    const { assetId } = req.params;
    const { reason } = req.body;
    const tenantId = req.user?.tenantId || req.tenantId || "default-tenant";

    await prisma.assetQRCode.updateMany({
      where: { tenantId, assetId },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: req.user?.id || "system",
        deactivationReason: reason,
      },
    });

    res.json({ data: { deactivated: true } });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAssetQRCode,
  getDynamicToken,
  scanQrCode,
  generateBatchQR,
  getQRAnalytics,
  deactivateQR,
};
