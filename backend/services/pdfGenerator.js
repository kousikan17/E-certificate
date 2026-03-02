const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Target page dimensions (A4-ish)
const A4_LONG = 842;
const A4_SHORT = 595;

function parseHexColor(hex) {
  hex = (hex || '#000000').replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Generate a certificate PDF from a template image with multiple text fields overlaid.
 *
 * @param {string} templatePath  - Path to the template image (PNG or JPG)
 * @param {Array}  fields        - Array of { label, value, x, y, fontSizePct, fontColor }
 *   x/y are percentages from top-left (0-100), fontSizePct is % of page width
 * @returns {Promise<Uint8Array>} PDF bytes
 */
async function generateCertificatePdf(templatePath, fields) {
  const pdfDoc = await PDFDocument.create();

  // Read and embed template image
  const imageBytes = fs.readFileSync(templatePath);
  const ext = path.extname(templatePath).toLowerCase();

  let image;
  if (ext === '.png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    image = await pdfDoc.embedJpg(imageBytes);
  }

  // Calculate page dimensions — scale to fit A4-ish bounds
  const imgWidth = image.width;
  const imgHeight = image.height;
  const isLandscape = imgWidth >= imgHeight;

  let pageWidth, pageHeight;
  if (isLandscape) {
    const scale = Math.min(A4_LONG / imgWidth, A4_SHORT / imgHeight);
    pageWidth = imgWidth * scale;
    pageHeight = imgHeight * scale;
  } else {
    const scale = Math.min(A4_SHORT / imgWidth, A4_LONG / imgHeight);
    pageWidth = imgWidth * scale;
    pageHeight = imgHeight * scale;
  }

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // Draw template image as full-page background
  page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });

  // Embed fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Draw each text field
  for (const field of fields) {
    const { value, x, y, fontSizePct, fontColor, bold } = field;
    if (!value) continue;

    const font = bold !== false ? boldFont : regularFont;
    // fontSize is in points; scale proportionally to page width vs reference A4 landscape width
    const refWidth = 842; // A4 landscape reference
    const fontSize = Math.max(6, (fontSizePct || 21.7) * (pageWidth / refWidth));

    // x/y are percentages from top-left; PDF origin is bottom-left
    const textWidth = font.widthOfTextAtSize(value, fontSize);
    const drawX = (x / 100) * pageWidth - textWidth / 2;
    const drawY = pageHeight - (y / 100) * pageHeight - fontSize / 3;

    page.drawText(value, {
      x: Math.max(5, drawX),
      y: Math.max(20, drawY),
      size: fontSize,
      font,
      color: parseHexColor(fontColor),
    });
  }

  return await pdfDoc.save();
}

module.exports = { generateCertificatePdf };
