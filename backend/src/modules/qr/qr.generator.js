const QRCode = require("qrcode");
const bwipjs = require("bwip-js");
const PDFDocument = require("pdfkit");
const { qrSigner, generateShortCode } = require("./qr.signing");

const FORMATS = {
  QR_STANDARD: { 
    generator: "qrcode", 
    ecLevel: "M", 
    defaultSize: 256,
  },
  QR_HIGH: { 
    generator: "qrcode", 
    ecLevel: "H",  // 30% recovery
    defaultSize: 384,
  },
  QR_LOW: { 
    generator: "qrcode", 
    ecLevel: "L",  // Volumétrie max
    defaultSize: 192,
  },
  DATAMATRIX: { generator: "bwipjs", format: "datamatrix" },
  PDF417: { generator: "bwipjs", format: "pdf417" },
  AZTEC: { generator: "bwipjs", format: "azteccode" },
};

const qrGenerator = {
  async generateAssetQR(options) {
    const {
      tenantId,
      assetId,
      format = "QR_HIGH",
      style = {},
      includeLogo = false,
      logoBuffer = null,
      targetUrl = null,
    } = options;

    const shortCode = generateShortCode(tenantId, assetId);
    const baseUrl = targetUrl || process.env.FRONTEND_URL || "http://localhost:3000";
    const signedUrl = `${baseUrl}/qr/${shortCode}`;

    const signedPayload = qrSigner.sign(shortCode, {
      tenantId,
      assetId,
      ttlMs: 0,
    });

    const formatConfig = FORMATS[format] || FORMATS.QR_HIGH;

    let dataUrl;
    let buffer;

    if (formatConfig.generator === "qrcode") {
      const res = await this.generateStandard({
        url: signedUrl,
        ecLevel: formatConfig.ecLevel,
        size: formatConfig.defaultSize,
        style,
        includeLogo,
        logoBuffer,
      });
      dataUrl = res.dataUrl;
      buffer = res.buffer;
    } else {
      const res = await this.generateBWIP({
        text: signedUrl,
        format: formatConfig.format,
      });
      buffer = res.buffer;
      dataUrl = res.dataUrl;
    }

    return {
      shortCode,
      url: signedUrl,
      signedPayload: signedPayload.full,
      dataUrl,
      buffer,
      format,
      generatedAt: new Date().toISOString(),
    };
  },

  async generateDynamicToken(tenantId, assetId) {
    const shortCode = generateShortCode(tenantId, assetId);
    
    const payload = qrSigner.sign(shortCode, {
      tenantId,
      assetId,
      rotating: true,
      ttlMs: 30000,
    });

    const dataUrl = await QRCode.toDataURL(payload.full, {
      errorCorrectionLevel: "H",
      width: 256,
      margin: 1,
      color: {
        dark: "#0d1117",
        light: "#ffffff",
      },
    });

    return {
      shortCode,
      token: payload.full,
      dataUrl,
      ts: payload.ts,
      exp: payload.ts + 30000,
    };
  },

  async generateStandard({ url, ecLevel, size, style }) {
    const qrDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: ecLevel,
      width: size,
      margin: 2,
      color: {
        dark: style?.darkColor || "#0d1117",
        light: style?.lightColor || "#ffffff",
      },
    });

    const buffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
    
    return { dataUrl: qrDataUrl, buffer };
  },

  async generateBWIP({ text, format }) {
    const png = await bwipjs.toBuffer({
      bcid: format,
      text,
      scale: 3,
      rotate: "N",
      paddingwidth: 0,
      paddingheight: 0,
    });

    return {
      buffer: png,
      dataUrl: `data:image/png;base64,${png.toString("base64")}`,
    };
  },

  async generateBatch({ 
    tenantId, 
    assets, 
    format = "QR_HIGH",
    layout = "a4",
    includeText = true,
    customStyles = {},
  }) {
    const layouts = {
      a4: { sheetWidth: 2480, sheetHeight: 3508, cols: 4, rows: 6 },
      label_50x30: { sheetWidth: 1414, sheetHeight: 850, cols: 4, rows: 9 },
      label_70x50: { sheetWidth: 992, sheetHeight: 709, cols: 3, rows: 6 },
    };
    const sheetConfig = layouts[layout] || layouts.a4;

    const qrCodes = await Promise.all(
      assets.map(async (asset) => {
        const qr = await this.generateAssetQR({
          tenantId,
          assetId: asset.id,
          format,
          style: customStyles,
        });
        return { ...qr, asset };
      })
    );

    const doc = new PDFDocument({
      size: [sheetConfig.sheetWidth / 3.78, sheetConfig.sheetHeight / 3.78],
      margin: 10,
    });

    const buffers = [];
    doc.on("data", b => buffers.push(b));
    
    const cellWidth = (sheetConfig.sheetWidth - 60) / sheetConfig.cols;
    
    qrCodes.forEach((qr, index) => {
      const col = index % sheetConfig.cols;
      const row = Math.floor(index / sheetConfig.cols) % sheetConfig.rows;
      
      if (index > 0 && col === 0 && row === 0) doc.addPage();
      
      const x = 20 + col * cellWidth;
      const y = 20 + row * cellWidth;
      
      try {
        doc.image(qr.dataUrl, x + 10, y + 10, {
          width: Math.max(cellWidth - 20, 50),
          height: Math.max(cellWidth - 20, 50),
        });
      } catch (e) {
        // Fallback for doc image
      }
      
      if (includeText) {
        doc.fontSize(8)
          .fillColor("#000")
          .text(qr.asset.code || qr.shortCode, x, y + cellWidth, {
            width: cellWidth,
            align: "center",
          });
        doc.fontSize(7)
          .fillColor("#666")
          .text((qr.asset.name || "Équipement").slice(0, 30), x, y + cellWidth + 10, {
            width: cellWidth,
            align: "center",
          });
      }
    });

    await new Promise(resolve => {
      doc.on("end", resolve);
      doc.end();
    });
    
    return {
      pdf: Buffer.concat(buffers),
      count: qrCodes.length,
      shortCodes: qrCodes.map(q => q.shortCode),
    };
  },
};

module.exports = { qrGenerator };
