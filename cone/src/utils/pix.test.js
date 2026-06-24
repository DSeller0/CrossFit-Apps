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
    const withAmt  = buildPixPayload({ ...base, amount: 100 })
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
})
