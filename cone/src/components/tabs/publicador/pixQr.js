// #162/plans/78 — extracted from ReportModal's own closure (was events.jsx:699-706)
// so Fechamento's InvoiceDetail can render the identical Pix QR without a second
// hand-rolled copy — a second copy of an EMV/QR path is how the four money bugs
// in #104 happened. The dynamic `import('qrcode')` is kept as-is: this stays a
// lazy chunk, not pulled into every tab that happens to import this file.

export async function qrToBase64(text, size = 200) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'M' })
  } catch {
    return null
  }
}
