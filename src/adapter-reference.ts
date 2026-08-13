const ID_COMPONENT = /^[A-Za-z0-9_-]+$/
const RESERVED_ID_COMPONENTS = new Set([
  '__proto__',
  'prototype',
  'constructor',
])
const BASE64URL =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const ID_SEPARATOR_CHARS = 1
const DIGEST_PREFIX_BYTES = 12
const DIGEST_SUFFIX_CHARS = 16
// Keep this copy-only reference limit synchronized with FIELD_WEFT_MAX_ID_CHARS_V1.
const FIELD_WEFT_MAX_ID_CHARS = 256
const MAX_OBJECT_KIND_CHARS =
  FIELD_WEFT_MAX_ID_CHARS - ID_SEPARATOR_CHARS - DIGEST_SUFFIX_CHARS

function encodeLengthPrefixed(
  parts: readonly string[],
): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const encoded = parts.map((part) => encoder.encode(part))
  const size = encoded.reduce((total, part) => total + 4 + part.length, 0)
  const tuple: Uint8Array<ArrayBuffer> = new Uint8Array(size)
  const view = new DataView(tuple.buffer)
  let offset = 0
  for (const part of encoded) {
    view.setUint32(offset, part.length, false)
    offset += 4
    tuple.set(part, offset)
    offset += part.length
  }
  return tuple
}

function encodeBase64Url(bytes: Uint8Array): string {
  let value = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    value += BASE64URL[first >> 2]
    value += BASE64URL[((first & 0x03) << 4) | (second >> 4)]
    if (index + 1 < bytes.length) {
      value += BASE64URL[((second & 0x0f) << 2) | (third >> 6)]
    }
    if (index + 2 < bytes.length) value += BASE64URL[third & 0x3f]
  }
  return value
}

/**
 * Reference deterministic-ID implementation for adapters that provide
 * revision or diff continuity. Supply only the object kind and stable source
 * identity, excluding display-facing kind and label values. The helper does
 * not inject namespaces or slugs or apply Unicode normalization. The caller
 * must detect duplicate source tuples and 96-bit ID collisions outside this
 * stateless helper.
 */
export async function deterministicAdapterId(
  objectKind: string,
  sourceIdentity: readonly string[],
): Promise<string> {
  if (
    !ID_COMPONENT.test(objectKind) ||
    RESERVED_ID_COMPONENTS.has(objectKind)
  ) {
    throw new Error('objectKind must be an unreserved FieldWeft ID segment.')
  }
  if (objectKind.length > MAX_OBJECT_KIND_CHARS) {
    throw new Error(
      `objectKind must be at most ${MAX_OBJECT_KIND_CHARS} characters so the resulting ID fits the FieldWeft limit.`,
    )
  }
  if (sourceIdentity.length === 0) {
    throw new Error('sourceIdentity must contain at least one segment.')
  }
  const tuple = encodeLengthPrefixed([objectKind, ...sourceIdentity])
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', tuple.buffer),
  )
  return `${objectKind}_${encodeBase64Url(digest.subarray(0, DIGEST_PREFIX_BYTES))}`
}
