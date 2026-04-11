const QRCode = require("qrcode");

/**
 * Generates a QR code as base64 data URL
 * Points to the public trace page for a given batchId
 */
const generateQR = async (batchId, clientUrl) => {
  const traceUrl = `${clientUrl || process.env.CLIENT_URL || "http://localhost:3000"}/trace/${batchId}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(traceUrl, {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#1a3a2a",  // dark green
        light: "#FFFFFF",
      },
      width: 300,
    });
    return qrDataUrl;
  } catch (error) {
    console.error("QR Generation Error:", error);
    return null;
  }
};

module.exports = { generateQR };