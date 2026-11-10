/**
 * AES-GCM secrets at rest.
 * The key is HKDF-SHA-256 from STATS_SECRET, or STATS_PASSWORD when that is unset.
 * Changing the source invalidates ciphertext already stored in Redis.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const SALT = encoder.encode('my-linkpage-stats-v1')
const INFO = encoder.encode('stats-settings')

export function secretKeyMaterial(): string | null {
  const dedicated = process.env.STATS_SECRET?.trim()
  if (dedicated) return dedicated
  const password = process.env.STATS_PASSWORD?.trim()
  return password || null
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function b64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function deriveKey(material: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(material), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJson(material: string, value: unknown): Promise<string> {
  const key = await deriveKey(material)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(value))),
  )
  return `${bytesToB64(iv)}.${bytesToB64(cipher)}`
}

export async function decryptJson<T>(material: string, payload: string): Promise<T | null> {
  const [ivPart, cipherPart] = payload.split('.')
  if (!ivPart || !cipherPart) return null
  try {
    const key = await deriveKey(material)
    const iv = b64ToBytes(ivPart)
    const cipher = b64ToBytes(cipherPart)
    const clear = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer },
      key,
      cipher.buffer.slice(cipher.byteOffset, cipher.byteOffset + cipher.byteLength) as ArrayBuffer,
    )
    return JSON.parse(decoder.decode(clear)) as T
  } catch {
    return null
  }
}
