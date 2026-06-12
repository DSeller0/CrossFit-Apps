// ── Pix EMV payload builder (CRC16/CCITT) ────────────────────────────────────

function crc16Pix(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

const pixClean = s => (s || '').normalize('NFD')
  .replace(/[\u0300-\u036F]/g, '')
  .replace(/[^a-zA-Z0-9 @._\-+\/]/g, '')
  .trim();

export function buildPixPayload({ pixKey, merchantName, merchantCity, amount, description, txid }) {
  const clean = pixClean;
  const f = (id, val) => { const l = String(val.length).padStart(2, '0'); return `${id}${l}${val}`; };

  // Normalise phone key
  let key = (pixKey || '').trim();
  if (/^[\+\d\s\(\)\-]+$/.test(key) && !key.includes('@') && !key.includes('.')) {
    const digits = key.replace(/\D/g, '');
    if (key.startsWith('+55')) {
      key = key.replace(/[\s\(\)\-]/g, '');
    } else if (digits.startsWith('55') && digits.length === 13) {
      key = '+' + digits;
    } else if (digits.length >= 10) {
      key = '+55' + digits;
    }
  }

  const gui = f('00', 'br.gov.bcb.pix') + f('01', key) +
    (description ? f('02', clean(description).slice(0, 72)) : '');
  const amtStr = amount && Number(amount) > 0 ? Number(amount).toFixed(2) : '';
  const name = clean(merchantName || 'COACH').slice(0, 25).toUpperCase() || 'COACH';
  const city = clean(merchantCity || 'BRASIL').slice(0, 15).toUpperCase() || 'BRASIL';
  const additional = f('62', f('05', (txid || 'CONE').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'CONE'));

  const payload =
    f('00', '01') +
    f('26', gui) +
    f('52', '0000') +
    f('53', '986') +
    (amtStr ? f('54', amtStr) : '') +
    f('58', 'BR') +
    f('59', name) +
    f('60', city) +
    additional +
    '6304';
  return payload + crc16Pix(payload);
}
