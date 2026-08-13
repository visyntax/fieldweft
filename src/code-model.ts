import {
  FIELD_WEFT_FORMAT,
  FIELD_WEFT_VERSION_V1,
  type FieldWeftBoundaryV1,
  type FieldWeftDocV1,
  type FieldWeftEntityV1,
  type FieldWeftMappingV1,
  type FieldWeftMetadataV1,
  type FieldWeftNodeRelationV1,
  type FieldWeftPositionV1,
  type FieldWeftProcessV1,
  type FieldWeftSizeV1,
} from './fieldweft-v1.generated.js'

/** Structural and coordinate resource limits applied by FieldWeft v1 validation. */
export const FIELD_WEFT_MAX_NODES_V1 = 5_000
export const FIELD_WEFT_MAX_RELATIONS_V1 = 20_000
export const FIELD_WEFT_MAX_FIELDS_V1 = 100_000
export const FIELD_WEFT_MAX_FIELD_DEPTH_V1 = 64
export const FIELD_WEFT_MAX_COORD_V1 = 10_000_000

/**
 * Shared defensive budgets for FieldWeft v1 document processing.
 *
 * Source JSON may contain editing whitespace. Acceptance is determined from
 * the compact canonical UTF-8 representation.
 */
export const FIELD_WEFT_MAX_CANONICAL_BYTES_V1 = 8 * 1024 * 1024
export const FIELD_WEFT_MAX_SOURCE_BYTES_V1 = 16 * 1024 * 1024
export const FIELD_WEFT_MAX_TOTAL_TAGS_V1 = 100_000
export const FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1 = 100_000
export const FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1 = 4_000_000

const RESERVED_ID_VALUES = [
  '__proto__',
  'prototype',
  'constructor',
] as const

const RESERVED_META_KEY_VALUES = [
  '__proto__',
  'prototype',
  'constructor',
] as const

const reservedIdLookup = new Set<string>(RESERVED_ID_VALUES)
const reservedMetaKeyLookup = new Set<string>(RESERVED_META_KEY_VALUES)

class ImmutableStringSet implements ReadonlySet<string> {
  readonly #values: Set<string>

  constructor(values: Iterable<string>) {
    this.#values = new Set(values)
    Object.freeze(this)
  }

  get size(): number {
    return this.#values.size
  }

  has(value: string): boolean {
    return this.#values.has(value)
  }

  entries(): SetIterator<[string, string]> {
    return this.#values.entries()
  }

  keys(): SetIterator<string> {
    return this.#values.keys()
  }

  values(): SetIterator<string> {
    return this.#values.values()
  }

  forEach(
    callback: (value: string, value2: string, set: ReadonlySet<string>) => void,
    thisArg?: unknown,
  ): void {
    for (const value of this.#values) {
      callback.call(thisArg, value, value, this)
    }
  }

  [Symbol.iterator](): SetIterator<string> {
    return this.#values[Symbol.iterator]()
  }

  get [Symbol.toStringTag](): string {
    return 'Set'
  }
}

Object.freeze(ImmutableStringSet.prototype)

/** Persistent IDs reserve keys that collide with ordinary object prototypes. */
export const FIELD_WEFT_RESERVED_IDS: ReadonlySet<string> =
  new ImmutableStringSet(RESERVED_ID_VALUES)

export const FIELD_WEFT_RESERVED_META_KEYS: ReadonlySet<string> =
  new ImmutableStringSet(RESERVED_META_KEY_VALUES)

/** @internal Stable validator lookup independent from the exported set facade. */
export function isReservedFieldWeftId(value: string): boolean {
  return reservedIdLookup.has(value)
}

/** @internal Stable validator lookup independent from the exported set facade. */
export function isReservedFieldWeftMetaKey(value: string): boolean {
  return reservedMetaKeyLookup.has(value)
}

export const FIELD_WEFT_RESERVED_META_PREFIX = 'fieldweft.'

export type FieldWeftAnnotationsV1 = {
  description?: string
  tags?: string[]
  meta?: FieldWeftMetadataV1
}

declare const validFieldWeftDocBrand: unique symbol
declare const canonicalFieldWeftDocBrand: unique symbol

/** A FieldWeft v1 document that passed the v1 validator. */
export type ValidFieldWeftDocV1 = FieldWeftDocV1 & {
  readonly [validFieldWeftDocBrand]: true
}

/** A canonical entity has its optional input position materialized. */
export type CanonicalFieldWeftEntityV1 = Omit<FieldWeftEntityV1, 'position'> & {
  position: FieldWeftPositionV1
}

/** A canonical process has its optional input position materialized. */
export type CanonicalFieldWeftProcessV1 = Omit<FieldWeftProcessV1, 'position'> & {
  position: FieldWeftPositionV1
}

/** A canonical boundary has its optional input layout materialized. */
export type CanonicalFieldWeftBoundaryV1 = Omit<
  FieldWeftBoundaryV1,
  'position' | 'size'
> & {
  position: FieldWeftPositionV1
  size: FieldWeftSizeV1
}

/** The deterministic, idempotent output of the FieldWeft canonicalizer. */
export type CanonicalFieldWeftDocV1 = Omit<
  ValidFieldWeftDocV1,
  'entities' | 'processes' | 'boundaries'
> & {
  entities: CanonicalFieldWeftEntityV1[]
  processes: CanonicalFieldWeftProcessV1[]
  boundaries: CanonicalFieldWeftBoundaryV1[]
  readonly [canonicalFieldWeftDocBrand]: true
}

type SemanticFieldWeftEntityV1 = Omit<
  CanonicalFieldWeftEntityV1,
  'position' | 'collapsed'
>
type SemanticFieldWeftProcessV1 = Omit<
  CanonicalFieldWeftProcessV1,
  'position'
>
type SemanticFieldWeftBoundaryV1 = Omit<
  CanonicalFieldWeftBoundaryV1,
  'position' | 'size' | 'color'
>

/** FieldWeft v1 semantic hash and diff input with layout noise removed. */
export type FieldWeftSemanticProjectionV1 = {
  format: typeof FIELD_WEFT_FORMAT
  version: typeof FIELD_WEFT_VERSION_V1
  entities: SemanticFieldWeftEntityV1[]
  processes: SemanticFieldWeftProcessV1[]
  boundaries: SemanticFieldWeftBoundaryV1[]
  nodeRelations: FieldWeftNodeRelationV1[]
  mappings: FieldWeftMappingV1[]
}

export type FieldWeftLayoutEntityV1 = Pick<
  CanonicalFieldWeftEntityV1,
  'id' | 'position' | 'collapsed'
>
export type FieldWeftLayoutProcessV1 = Pick<
  CanonicalFieldWeftProcessV1,
  'id' | 'position'
>
export type FieldWeftLayoutBoundaryV1 = Pick<
  CanonicalFieldWeftBoundaryV1,
  'id' | 'position' | 'size' | 'color'
>

/** FieldWeft v1 layout hash and diff input, excluded from semantic revisions. */
export type FieldWeftLayoutProjectionV1 = {
  format: typeof FIELD_WEFT_FORMAT
  version: typeof FIELD_WEFT_VERSION_V1
  entities: FieldWeftLayoutEntityV1[]
  processes: FieldWeftLayoutProcessV1[]
  boundaries: FieldWeftLayoutBoundaryV1[]
}
