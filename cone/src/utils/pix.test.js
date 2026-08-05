import { describe, test, expect } from 'vitest'
import { buildPixPayload } from './pix.js'

const base = {
  pixKey: 'test@example.com',
  merchantName: 'Coach Test',
  merchantCity: 'Rio de Janeiro',
  amount: 0,
  description: '',
  txid: 'TEST',
}

describe('buildPixPayload', () => {
  test('returns a non-empty string', () => {
    const p = buildPixPayload(base)
    expect(typeof p).toBe('string')
    expect(p.length).toBeGreaterThan(20)
  })

  test('ends with a 4-character uppercase hex CRC', () => {
    expect(buildPixPayload(base)).toMatch(/[0-9A-F]{4}$/)
  })

  test('CRC is always exactly 4 hex chars', () => {
    const crc = buildPixPayload(base).slice(-4)
    expect(crc).toMatch(/^[0-9A-F]{4}$/)
  })

  test('contains the pix key', () => {
    expect(buildPixPayload(base)).toContain('test@example.com')
  })

  test('amount > 0 is included formatted as XX.XX', () => {
    expect(buildPixPayload({ ...base, amount: 150.5 })).toContain('150.50')
  })

  test('amount 0 omits the amount field (shorter payload)', () => {
    const withZero = buildPixPayload({ ...base, amount: 0 })
    const withAmt = buildPixPayload({ ...base, amount: 100 })
    expect(withZero.length).toBeLessThan(withAmt.length)
  })

  test('phone key gets +55 prefix', () => {
    const p = buildPixPayload({ ...base, pixKey: '11999998888' })
    expect(p).toContain('+5511999998888')
  })

  test('key already starting with +55 is kept as-is (spaces stripped)', () => {
    const p = buildPixPayload({ ...base, pixKey: '+55 11 99999-8888' })
    expect(p).toContain('+5511999998888')
  })

  test('strips accents from merchant name', () => {
    const p = buildPixPayload({ ...base, merchantName: 'Jõao Conceição' })
    expect(p).not.toContain('ã')
    expect(p).not.toContain('ç')
  })

  test('strips accents from city', () => {
    const p = buildPixPayload({ ...base, merchantCity: 'São Paulo' })
    expect(p).not.toContain('ã')
  })

  test('is deterministic for the same input', () => {
    expect(buildPixPayload(base)).toBe(buildPixPayload(base))
  })

  test('different pix keys produce different payloads', () => {
    const a = buildPixPayload({ ...base, pixKey: 'a@test.com' })
    const b = buildPixPayload({ ...base, pixKey: 'b@test.com' })
    expect(a).not.toBe(b)
  })

  test('description is included when provided', () => {
    const p = buildPixPayload({ ...base, description: 'Mensalidade' })
    expect(p).toContain('Mensalidade')
  })

  // #104 — the CRC math had never been checked against anything outside its own
  // round-trip (every prior test above only asserts shape, e.g. "4 hex chars"). This
  // payload's CRC (D225) was cross-checked against a second, independently written
  // CRC16/CCITT (poly 0x1021, init 0xFFFF) implementation, not derived from pix.js's
  // own crc16Pix — so a shared bug in the one algorithm both would need to agree on
  // can't hide behind "the function agrees with itself".
  test('matches a known-good reference payload byte-for-byte', () => {
    const p = buildPixPayload({
      pixKey: '+5511999999999',
      merchantName: 'Coach Test',
      merchantCity: 'Rio de Janeiro',
      amount: 150.0,
      description: 'Mensalidade',
      txid: 'ABC123',
    })
    expect(p).toBe(
      '00020126510014br.gov.bcb.pix0114+55119999999990211Mensalidade' +
        '5204000053039865406150.005802BR5910COACH TEST6014RIO DE JANEIRO' +
        '62100506ABC1236304D225',
    )
  })

  // #104 — each of these fields is silently truncated by buildPixPayload (a length that
  // never fails loudly), so a payload longer than the EMV spec allows would otherwise
  // ship undetected. Asserting both the length-prefixed truncated value AND the absence
  // of the untruncated tail catches either a wrong slice length or a wrong length digit.
  describe('EMV field truncation', () => {
    test('merchant name truncates at 25 chars (field 59)', () => {
      const p = buildPixPayload({ ...base, merchantName: 'A'.repeat(30) })
      expect(p).toContain('5925' + 'A'.repeat(25))
      expect(p).not.toContain('A'.repeat(26))
    })

    test('merchant city truncates at 15 chars (field 60)', () => {
      const p = buildPixPayload({ ...base, merchantCity: 'B'.repeat(20) })
      expect(p).toContain('6015' + 'B'.repeat(15))
      expect(p).not.toContain('B'.repeat(16))
    })

    test('description truncates at 72 chars (field 02, nested in GUI 26)', () => {
      const p = buildPixPayload({ ...base, description: 'C'.repeat(80) })
      expect(p).toContain('0272' + 'C'.repeat(72))
      expect(p).not.toContain('C'.repeat(73))
    })

    test('txid truncates at 25 chars after sanitizing (field 05, nested in 62)', () => {
      const p = buildPixPayload({ ...base, txid: 'D'.repeat(30) })
      expect(p).toContain('0525' + 'D'.repeat(25))
      expect(p).not.toContain('D'.repeat(26))
    })
  })
})
