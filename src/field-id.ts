import type { FieldWeftId } from './fieldweft-v1.generated.js'

export const FIELD_ID_SUFFIX_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
export const FIELD_ID_SUFFIX_LENGTH = 9
export const FIELD_ID_SUFFIX_BITS = 54
export const FIELD_ID_SLUG_MAX_CHARS = 24
export const FIELD_ID_ALLOCATION_ATTEMPTS = 32

export type FillFieldIdRandomValues = (bytes: Uint8Array<ArrayBuffer>) => void

/** Converts a name to an ASCII ID prefix readable in diagnostics and code views. */
export function fieldIdSlug(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, FIELD_ID_SLUG_MAX_CHARS)
    .replace(/_+$/g, '')
  return normalized || 'field'
}

function fillSecureRandomValues(bytes: Uint8Array<ArrayBuffer>): void {
  globalThis.crypto.getRandomValues(bytes)
}

/**
 * Allocates and reserves a field ID in the current document's ID set, including
 * tombstones in a future revision store. Use only for new or cloned fields,
 * never for rename or move operations.
 */
export function allocateFieldId(
  name: string,
  usedIds: Set<FieldWeftId>,
  fillRandomValues: FillFieldIdRandomValues = fillSecureRandomValues,
): FieldWeftId {
  const prefix = fieldIdSlug(name)
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(FIELD_ID_SUFFIX_LENGTH)

  for (let attempt = 0; attempt < FIELD_ID_ALLOCATION_ATTEMPTS; attempt++) {
    fillRandomValues(bytes)
    let suffix = ''
    for (const byte of bytes) {
      // A 64-character alphabet lets the low six bits avoid modulo bias.
      suffix += FIELD_ID_SUFFIX_ALPHABET[byte & 63]
    }
    const id = `${prefix}_${suffix}`
    if (usedIds.has(id)) continue
    usedIds.add(id)
    return id
  }

  throw new Error(
    `Failed to allocate a field ID within ${FIELD_ID_ALLOCATION_ATTEMPTS} attempts.`,
  )
}
