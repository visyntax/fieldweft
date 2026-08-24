import {
  FIELD_WEFT_BOUNDARY_COLORS_V1,
  FIELD_WEFT_BOUNDARY_KINDS_V1,
  FIELD_WEFT_ENTITY_KINDS_V1,
  FIELD_WEFT_FIELD_TYPES_V1,
  FIELD_WEFT_FORMAT,
  FIELD_WEFT_MAPPING_KINDS_V1,
  FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
  FIELD_WEFT_MAX_ID_CHARS_V1,
  FIELD_WEFT_MAX_LABEL_CHARS_V1,
  FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1,
  FIELD_WEFT_MAX_META_KEY_CHARS_V1,
  FIELD_WEFT_MAX_META_STRING_CHARS_V1,
  FIELD_WEFT_MAX_NAME_CHARS_V1,
  FIELD_WEFT_MAX_TAG_CHARS_V1,
  FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1,
  FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1,
  FIELD_WEFT_MAX_VARIANT_VALUES_V1,
  FIELD_WEFT_VERSION_V1,
  type FieldWeftId,
} from './fieldweft-v1.generated.js'
import {
  FIELD_WEFT_MAX_FIELD_DEPTH_V1,
  FIELD_WEFT_MAX_FIELDS_V1,
  FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1,
  FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1,
  FIELD_WEFT_MAX_NODES_V1,
  FIELD_WEFT_MAX_RELATIONS_V1,
  FIELD_WEFT_MAX_TOTAL_TAGS_V1,
  FIELD_WEFT_MAX_COORD_V1,
  FIELD_WEFT_RESERVED_META_PREFIX,
  isReservedFieldWeftId,
  isReservedFieldWeftMetaKey,
  type ValidFieldWeftDocV1,
} from './code-model.js'
import {
  getOwnEnumerableProperty,
  hasOwnEnumerableProperty,
} from './code-property.js'

export type FieldWeftDiagnosticRelated = {
  path: string
  message?: string
}

export type FieldWeftDiagnostic = {
  code: string
  path: string
  severity: 'error' | 'warning' | 'info'
  message: string
  params?: Record<string, string | number>
  related?: FieldWeftDiagnosticRelated[]
}

export type ValidateFieldWeftDocResultV1 =
  | { ok: true; doc: ValidFieldWeftDocV1 }
  | { ok: false; errors: FieldWeftDiagnostic[] }

export type ReadFieldWeftDocResult =
  | { kind: 'ok'; doc: ValidFieldWeftDocV1 }
  | { kind: 'invalid'; errors: FieldWeftDiagnostic[] }
  | { kind: 'unsupported'; version: unknown }

type RecordValue = Record<string, unknown>
type NodeKind = 'entity' | 'process' | 'boundary'
type FieldWeftFieldOwnerKindV1 = 'entity' | 'process-input' | 'process-output'

type NodeMeta = {
  kind: NodeKind
  path: string
}

type FieldMeta = {
  ownerId: string
  ownerKind: FieldWeftFieldOwnerKindV1
  path: string
  type?: string
  discriminatorValues?: string[]
}

type WhenRef = {
  ownerId: string
  fieldId?: string
  path: string
  when: RecordValue
}

type MappingRef = {
  path: string
  sourceFieldId?: string
  targetFieldId?: string
}

type NodeRelationRef = {
  path: string
  sourceNodeId?: string
  targetNodeId?: string
}

type CollapsedRef = {
  ownerId: string
  fieldId: string
  path: string
}

type MemberRef = {
  memberId: string
  path: string
}

type ValidationState = {
  errors: FieldWeftDiagnostic[]
  nodeIds: Map<string, string>
  nodes: Map<string, NodeMeta>
  relationIds: Map<string, string>
  fieldIds: Map<string, string>
  fields: Map<FieldWeftId, FieldMeta>
  whenRefs: WhenRef[]
  mappingRefs: MappingRef[]
  nodeRelationRefs: NodeRelationRef[]
  collapsedRefs: CollapsedRef[]
  memberRefs: MemberRef[]
  fieldCount: number
  fieldLimitReported: boolean
  depthLimitReported: boolean
  nodeVisits: number
  tagCount: number
  metaEntryCount: number
  annotationCodePoints: number
  tagLimitReported: boolean
  metaLimitReported: boolean
  annotationLimitReported: boolean
}

const ID_RE = /^[A-Za-z0-9_-]+$/
const BOUNDARY_COLOR_VALUES = Object.freeze([
  ...FIELD_WEFT_BOUNDARY_COLORS_V1,
])
const BOUNDARY_KIND_VALUES = Object.freeze([
  ...FIELD_WEFT_BOUNDARY_KINDS_V1,
])
const ENTITY_KIND_VALUES = Object.freeze([...FIELD_WEFT_ENTITY_KINDS_V1])
const FIELD_TYPE_VALUES = Object.freeze([...FIELD_WEFT_FIELD_TYPES_V1])
const MAPPING_KIND_VALUES = Object.freeze([...FIELD_WEFT_MAPPING_KINDS_V1])

function exceedsCodePointLimit(value: string, limit: number): boolean {
  let length = 0
  for (const unused of value) {
    void unused
    length++
    if (length > limit) return true
  }
  return false
}

function codePointLength(value: string): number {
  let length = 0
  for (const unused of value) {
    void unused
    length++
  }
  return length
}

function checkStringLimit(
  value: string,
  path: string,
  state: ValidationState,
  limit: number,
  code: string,
): boolean {
  if (!exceedsCodePointLimit(value, limit)) return true
  addError(
    state,
    code,
    path,
    `Value must not exceed ${limit} Unicode code points.`,
    { limit },
  )
  return false
}

const TOP_LEVEL_KEYS = [
  'format',
  'version',
  'entities',
  'processes',
  'boundaries',
  'nodeRelations',
  'mappings',
] as const
const ANNOTATION_KEYS = ['description', 'tags', 'meta'] as const
const ENTITY_KEYS = [
  'id',
  'name',
  'kind',
  ...ANNOTATION_KEYS,
  'position',
  'fields',
  'collapsed',
] as const
const PROCESS_KEYS = [
  'id',
  'name',
  'kind',
  ...ANNOTATION_KEYS,
  'position',
  'inputs',
  'outputs',
] as const
const BOUNDARY_KEYS = [
  'id',
  'name',
  'color',
  'kind',
  ...ANNOTATION_KEYS,
  'position',
  'size',
  'members',
] as const
const FIELD_KEYS = [
  'id',
  'name',
  'type',
  ...ANNOTATION_KEYS,
  'array',
  'nullable',
  'pk',
  'children',
  'discriminator',
  'when',
] as const
const MAPPING_KEYS = [
  'id',
  'sourceFieldId',
  'targetFieldId',
  'kind',
  'label',
  ...ANNOTATION_KEYS,
] as const
const NODE_RELATION_KEYS = [
  'id',
  'sourceNodeId',
  'targetNodeId',
  'label',
  ...ANNOTATION_KEYS,
] as const
const COORDINATE_KEYS = ['x', 'y'] as const
const SIZE_KEYS = ['width', 'height'] as const
const DISCRIMINATOR_KEYS = ['values'] as const

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPlainRecord(value: unknown): value is RecordValue {
  if (!isRecord(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOwn(value: RecordValue, key: string): boolean {
  return hasOwnEnumerableProperty(value, key)
}

function ownValue(value: RecordValue, key: string): unknown {
  return getOwnEnumerableProperty(value, key)
}

function pointerToken(value: string): string {
  return value.replaceAll('~', '~0').replaceAll('/', '~1')
}

function childPath(path: string, key: string | number): string {
  return `${path}/${pointerToken(String(key))}`
}

class UnstableStructuredInputError extends Error {
  readonly path: string

  constructor(path: string) {
    super('Structured input contains an unstable property.')
    this.path = path
  }
}

type StructuredMarker =
  | { kind: 'absent' }
  | { kind: 'data'; value: unknown }
  | { kind: 'unstable' }

function inspectOwnEnumerableDataProperty(
  value: RecordValue,
  key: string,
): StructuredMarker {
  const descriptor = Reflect.getOwnPropertyDescriptor(value, key)
  if (!descriptor?.enumerable) return { kind: 'absent' }
  if (!Object.hasOwn(descriptor, 'value')) return { kind: 'unstable' }
  return { kind: 'data', value: descriptor.value }
}

function ownDataValue(
  value: object,
  key: PropertyKey,
  path: string,
): unknown {
  const descriptor = Reflect.getOwnPropertyDescriptor(value, key)
  if (!descriptor?.enumerable) return undefined
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new UnstableStructuredInputError(path)
  }
  return descriptor.value
}

function arrayValue(value: unknown[], index: number, path: string): unknown {
  const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index))
  if (!descriptor) throw new UnstableStructuredInputError(path)
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new UnstableStructuredInputError(childPath(path, index))
  }
  return descriptor.value
}

function ownDataEntries(
  value: RecordValue,
  path: string,
): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = []
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') continue
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key)
    const keyPath = childPath(path, key)
    if (!descriptor) throw new UnstableStructuredInputError(keyPath)
    if (!descriptor.enumerable) continue
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new UnstableStructuredInputError(keyPath)
    }
    entries.push([key, descriptor.value])
  }
  return entries
}

function unstableStructuredInputDiagnostic(
  path: string,
): FieldWeftDiagnostic {
  return {
    code: 'input.unstable',
    path,
    severity: 'error',
    message:
      'Structured input must use stable own data properties and dense arrays.',
  }
}

function addError(
  state: ValidationState,
  code: string,
  path: string,
  message: string,
  params?: FieldWeftDiagnostic['params'],
  related?: FieldWeftDiagnosticRelated[],
): void {
  state.errors.push({
    code,
    path,
    severity: 'error',
    message,
    ...(params ? { params } : {}),
    ...(related?.length ? { related } : {}),
  })
}

function checkKnownKeys(
  value: RecordValue,
  allowed: readonly string[],
  path: string,
  state: ValidationState,
): void {
  const allowedSet = new Set(allowed)
  for (const [key] of ownDataEntries(value, path)) {
    if (!allowedSet.has(key)) {
      addError(
        state,
        'property.unknown',
        childPath(path, key),
        `Unknown property "${key}".`,
        { key },
      )
    }
  }
}

function requiredArray(
  value: RecordValue,
  key: string,
  path: string,
  state: ValidationState,
): unknown[] | undefined {
  const keyPath = childPath(path, key)
  if (!hasOwn(value, key)) {
    addError(state, 'property.required', keyPath, 'Required property is missing.')
    return undefined
  }
  const raw = ownDataValue(value, key, keyPath)
  if (!Array.isArray(raw)) {
    addError(state, 'type.array', keyPath, 'Expected an array.')
    return undefined
  }
  return raw
}

function requiredName(
  value: RecordValue,
  path: string,
  state: ValidationState,
): string | undefined {
  const key = 'name'
  const keyPath = childPath(path, key)
  const raw = ownValue(value, key)
  if (typeof raw !== 'string') {
    addError(state, 'type.string', keyPath, 'Expected a string.')
    return undefined
  }
  if (raw.trim().length === 0) {
    addError(state, 'value.empty', keyPath, 'Value must not be empty.')
    return undefined
  }
  if (
    !checkStringLimit(
      raw,
      keyPath,
      state,
      FIELD_WEFT_MAX_NAME_CHARS_V1,
      'limit.string.name',
    )
  ) {
    return undefined
  }
  return raw
}

function optionalString(
  value: RecordValue,
  key: string,
  path: string,
  state: ValidationState,
  limit: number,
  limitCode: string,
): string | undefined {
  if (!hasOwn(value, key)) return undefined
  const raw = value[key]
  if (typeof raw !== 'string') {
    addError(state, 'type.string', childPath(path, key), 'Expected a string.')
    return undefined
  }
  if (
    !checkStringLimit(
      raw,
      childPath(path, key),
      state,
      limit,
      limitCode,
    )
  ) {
    return undefined
  }
  return raw
}

function consumeAnnotationCodePoints(
  value: string,
  path: string,
  state: ValidationState,
): boolean {
  if (state.annotationLimitReported) return false
  const next = state.annotationCodePoints + codePointLength(value)
  if (next > FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1) {
    state.annotationLimitReported = true
    addError(
      state,
      'limit.annotation-codepoints',
      path,
      `The total annotation text must not exceed ${FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1} Unicode code points.`,
      { limit: FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1 },
    )
    return false
  }
  state.annotationCodePoints = next
  return true
}

function validateAnnotations(
  value: RecordValue,
  path: string,
  state: ValidationState,
): void {
  if (state.annotationLimitReported) return
  const description = optionalString(
    value,
    'description',
    path,
    state,
    FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
    'limit.string.description',
  )
  if (description !== undefined) {
    consumeAnnotationCodePoints(
      description,
      childPath(path, 'description'),
      state,
    )
  }

  if (hasOwn(value, 'tags')) {
    const tagsPath = childPath(path, 'tags')
    if (!Array.isArray(value.tags)) {
      addError(state, 'type.array', tagsPath, 'Expected an array of strings.')
    } else {
      if (value.tags.length > FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1) {
        addError(
          state,
          'limit.tags-per-object',
          childPath(tagsPath, FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1),
          `An object must not contain more than ${FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1} tags.`,
          { limit: FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1 },
        )
      }
      const seen = new Map<string, string>()
      const count = Math.min(value.tags.length, FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1)
      for (let index = 0; index < count; index++) {
        const itemPath = childPath(tagsPath, index)
        if (state.tagCount >= FIELD_WEFT_MAX_TOTAL_TAGS_V1) {
          if (!state.tagLimitReported) {
            state.tagLimitReported = true
            addError(
              state,
              'limit.tags',
              itemPath,
              `The document must not contain more than ${FIELD_WEFT_MAX_TOTAL_TAGS_V1} tags.`,
              { limit: FIELD_WEFT_MAX_TOTAL_TAGS_V1 },
            )
          }
          break
        }
        state.tagCount++
        const tag = arrayValue(value.tags, index, tagsPath)
        if (typeof tag !== 'string' || tag.length === 0) {
          addError(
            state,
            'tag.type',
            itemPath,
            'A tag must be a non-empty string.',
          )
          continue
        }
        if (
          !checkStringLimit(
            tag,
            itemPath,
            state,
            FIELD_WEFT_MAX_TAG_CHARS_V1,
            'limit.string.tag',
          )
        ) {
          continue
        }
        const firstPath = seen.get(tag)
        if (firstPath) {
          addError(
            state,
            'tag.duplicate',
            firstPath,
            `Duplicate tag "${tag}".`,
            { tag },
            [{ path: itemPath, message: 'Duplicate location.' }],
          )
          continue
        }
        seen.set(tag, itemPath)
        consumeAnnotationCodePoints(tag, itemPath, state)
      }
    }
  }

  if (!hasOwn(value, 'meta')) return
  const metaPath = childPath(path, 'meta')
  if (!isPlainRecord(value.meta)) {
    addError(
      state,
      'type.object',
      metaPath,
      'Expected an object with scalar metadata values.',
    )
    return
  }
  const keys = Object.keys(value.meta)
  if (keys.length > FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1) {
    addError(
      state,
      'limit.meta-per-object',
      childPath(metaPath, keys[FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1]),
      `An object must not contain more than ${FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1} metadata entries.`,
      { limit: FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1 },
    )
  }
  const count = Math.min(keys.length, FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1)
  for (let index = 0; index < count; index++) {
    const key = keys[index]
    const keyPath = childPath(metaPath, key)
    if (state.metaEntryCount >= FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1) {
      if (!state.metaLimitReported) {
        state.metaLimitReported = true
        addError(
          state,
          'limit.meta-entries',
          keyPath,
          `The document must not contain more than ${FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1} metadata entries.`,
          { limit: FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1 },
        )
      }
      break
    }
    state.metaEntryCount++
    if (key.length === 0) {
      addError(state, 'meta.key-empty', keyPath, 'A metadata key must not be empty.')
    } else {
      checkStringLimit(
        key,
        keyPath,
        state,
        FIELD_WEFT_MAX_META_KEY_CHARS_V1,
        'limit.string.meta-key',
      )
      if (isReservedFieldWeftMetaKey(key)) {
        addError(
          state,
          'meta.key-reserved',
          keyPath,
          `Metadata key "${key}" is reserved.`,
          { key },
        )
      } else if (key.startsWith(FIELD_WEFT_RESERVED_META_PREFIX)) {
        addError(
          state,
          'meta.key-reserved-namespace',
          keyPath,
          `The "${FIELD_WEFT_RESERVED_META_PREFIX}" prefix is reserved for official metadata.`,
          { prefix: FIELD_WEFT_RESERVED_META_PREFIX },
        )
      }
      consumeAnnotationCodePoints(key, keyPath, state)
    }

    const metaValue = ownDataValue(value.meta, key, keyPath)
    if (typeof metaValue === 'string') {
      if (
        checkStringLimit(
          metaValue,
          keyPath,
          state,
          FIELD_WEFT_MAX_META_STRING_CHARS_V1,
          'limit.string.meta-value',
        )
      ) {
        consumeAnnotationCodePoints(metaValue, keyPath, state)
      }
    } else if (typeof metaValue === 'number') {
      if (!Number.isFinite(metaValue)) {
        addError(
          state,
          'meta.number-finite',
          keyPath,
          'A metadata number must be a finite IEEE-754 value.',
        )
      }
    } else if (typeof metaValue !== 'boolean' && metaValue !== null) {
      addError(
        state,
        'meta.value-type',
        keyPath,
        'A metadata value must be a string, number, boolean, or null.',
      )
    }
  }
}

function checkEnum(
  value: unknown,
  allowed: readonly string[],
  path: string,
  state: ValidationState,
): string | undefined {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    addError(
      state,
      'value.enum',
      path,
      `Expected one of: ${allowed.join(' | ')}.`,
      { allowed: allowed.join(' | ') },
    )
    return undefined
  }
  return value
}

function checkId(
  value: unknown,
  path: string,
  state: ValidationState,
  rejectReserved = false,
): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    addError(state, 'id.type', path, 'An ID must be a non-empty string.')
    return undefined
  }
  if (exceedsCodePointLimit(value, FIELD_WEFT_MAX_ID_CHARS_V1)) {
    addError(
      state,
      'limit.string.id',
      path,
      `An ID must not exceed ${FIELD_WEFT_MAX_ID_CHARS_V1} Unicode code points.`,
      { limit: FIELD_WEFT_MAX_ID_CHARS_V1 },
    )
    return undefined
  }
  if (!ID_RE.test(value)) {
    addError(
      state,
      'id.format',
      path,
      "An ID may contain only ASCII letters, digits, '_', and '-'.",
    )
    return undefined
  }
  if (rejectReserved && isReservedFieldWeftId(value)) {
    addError(state, 'id.reserved', path, `ID "${value}" is reserved.`, {
      id: value,
    })
    return undefined
  }
  return value
}

function registerUnique(
  ids: Map<string, string>,
  id: string,
  path: string,
  state: ValidationState,
  code: string,
): boolean {
  const firstPath = ids.get(id)
  if (!firstPath) {
    ids.set(id, path)
    return true
  }
  addError(
    state,
    code,
    firstPath,
    `Duplicate ID "${id}".`,
    { id },
    [{ path, message: 'Duplicate location.' }],
  )
  return false
}

function checkBooleanProperties(
  value: RecordValue,
  keys: readonly string[],
  path: string,
  state: ValidationState,
): void {
  for (const key of keys) {
    if (hasOwn(value, key) && typeof value[key] !== 'boolean') {
      addError(
        state,
        'type.boolean',
        childPath(path, key),
        'Expected a boolean.',
      )
    }
  }
}

function checkCoordinate(
  value: unknown,
  path: string,
  state: ValidationState,
): void {
  if (!isRecord(value)) {
    addError(state, 'type.object', path, 'Expected a position object.')
    return
  }
  checkKnownKeys(value, COORDINATE_KEYS, path, state)
  for (const key of COORDINATE_KEYS) {
    const itemPath = childPath(path, key)
    if (!hasOwn(value, key)) {
      addError(state, 'property.required', itemPath, 'Required coordinate is missing.')
      continue
    }
    const number = value[key]
    if (!Number.isSafeInteger(number) || Math.abs(number as number) > FIELD_WEFT_MAX_COORD_V1) {
      addError(
        state,
        'value.coordinate',
        itemPath,
        `A coordinate must be a safe integer in the range ±${FIELD_WEFT_MAX_COORD_V1}.`,
        { limit: FIELD_WEFT_MAX_COORD_V1 },
      )
    }
  }
}

function checkSize(value: unknown, path: string, state: ValidationState): void {
  if (!isRecord(value)) {
    addError(state, 'type.object', path, 'Expected a size object.')
    return
  }
  checkKnownKeys(value, SIZE_KEYS, path, state)
  for (const key of SIZE_KEYS) {
    const itemPath = childPath(path, key)
    if (!hasOwn(value, key)) {
      addError(state, 'property.required', itemPath, 'Required size component is missing.')
      continue
    }
    const number = value[key]
    if (
      !Number.isSafeInteger(number) ||
      (number as number) <= 0 ||
      (number as number) > FIELD_WEFT_MAX_COORD_V1
    ) {
      addError(
        state,
        'value.size',
        itemPath,
        `A size must be a safe integer in the range 1..${FIELD_WEFT_MAX_COORD_V1}.`,
        { limit: FIELD_WEFT_MAX_COORD_V1 },
      )
    }
  }
}

function validateStringSet(
  value: unknown,
  path: string,
  state: ValidationState,
  maxChars?: number,
  maxItems?: number,
): string[] | undefined {
  if (!Array.isArray(value)) {
    addError(state, 'type.array', path, 'Expected an array.')
    return undefined
  }
  if (maxItems != null && value.length > maxItems) {
    addError(
      state,
      'limit.variant-values',
      childPath(path, maxItems),
      `The array must not contain more than ${maxItems} items.`,
      { limit: maxItems },
    )
    return undefined
  }
  const strings: string[] = []
  const seen = new Map<string, string>()
  for (let index = 0; index < value.length; index++) {
    const item = arrayValue(value, index, path)
    const itemPath = childPath(path, index)
    if (typeof item !== 'string' || item.length === 0) {
      addError(
        state,
        'type.string',
        itemPath,
        'Expected a non-empty string.',
      )
      continue
    }
    if (
      maxChars != null &&
      !checkStringLimit(
        item,
        itemPath,
        state,
        maxChars,
        'limit.string.variant-value',
      )
    ) {
      continue
    }
    const firstPath = seen.get(item)
    if (firstPath) {
      addError(
        state,
        'value.duplicate',
        firstPath,
        `Duplicate value "${item}".`,
        { value: item },
        [{ path: itemPath, message: 'Duplicate location.' }],
      )
      continue
    }
    seen.set(item, itemPath)
    strings.push(item)
  }
  return strings
}

function validateDiscriminator(
  value: unknown,
  fieldType: string | undefined,
  path: string,
  state: ValidationState,
): string[] | undefined {
  if (!isRecord(value)) {
    addError(state, 'type.object', path, 'Expected a discriminator object with a values property.')
    return undefined
  }
  checkKnownKeys(value, DISCRIMINATOR_KEYS, path, state)
  if (fieldType !== 'string') {
    addError(
      state,
      'discriminator.type',
      path,
      'A discriminator may be used only on a string field.',
    )
  }
  if (!hasOwn(value, 'values')) {
    addError(
      state,
      'property.required',
      childPath(path, 'values'),
      'Required property is missing.',
    )
    return undefined
  }
  const values = validateStringSet(
    value.values,
    childPath(path, 'values'),
    state,
    FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1,
    FIELD_WEFT_MAX_VARIANT_VALUES_V1,
  )
  if (values?.length === 0) {
    addError(
      state,
      'value.empty',
      childPath(path, 'values'),
      'discriminator.values must contain at least one value.',
    )
  }
  return values?.length ? values : undefined
}

function validateWhen(
  value: unknown,
  path: string,
  state: ValidationState,
): RecordValue | undefined {
  if (!isRecord(value)) {
    addError(state, 'type.object', path, 'Expected an object keyed by discriminator field IDs.')
    return undefined
  }
  for (const [fieldId, rawValues] of ownDataEntries(value, path)) {
    const valuesPath = childPath(path, fieldId)
    checkId(fieldId, valuesPath, state, true)
    const values = validateStringSet(
      rawValues,
      valuesPath,
      state,
      FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1,
      FIELD_WEFT_MAX_VARIANT_VALUES_V1,
    )
    if (values?.length === 0) {
      addError(state, 'value.empty', valuesPath, 'A when value array must contain at least one value.')
    }
  }
  return value
}

function validateFields(
  fields: unknown[],
  path: string,
  ownerId: string,
  ownerKind: FieldWeftFieldOwnerKindV1,
  depth: number,
  state: ValidationState,
  ancestors: WeakSet<object>,
): void {
  if (depth > FIELD_WEFT_MAX_FIELD_DEPTH_V1) {
    if (!state.depthLimitReported) {
      state.depthLimitReported = true
      addError(
        state,
        'limit.field-depth',
        path,
        `Field depth must not exceed ${FIELD_WEFT_MAX_FIELD_DEPTH_V1}.`,
        { limit: FIELD_WEFT_MAX_FIELD_DEPTH_V1 },
      )
    }
    return
  }

  const remaining = FIELD_WEFT_MAX_FIELDS_V1 - state.fieldCount
  if (fields.length > remaining) {
    if (!state.fieldLimitReported) {
      state.fieldLimitReported = true
      addError(
        state,
        'limit.fields',
        childPath(path, Math.max(remaining, 0)),
        `The document must not contain more than ${FIELD_WEFT_MAX_FIELDS_V1} fields.`,
        { limit: FIELD_WEFT_MAX_FIELDS_V1 },
      )
    }
    return
  }

  const siblingNames = new Map<string, string>()
  for (let index = 0; index < fields.length; index++) {
    const fieldPath = childPath(path, index)
    if (state.fieldCount >= FIELD_WEFT_MAX_FIELDS_V1) {
      if (!state.fieldLimitReported) {
        state.fieldLimitReported = true
        addError(
          state,
          'limit.fields',
          fieldPath,
          `The document must not contain more than ${FIELD_WEFT_MAX_FIELDS_V1} fields.`,
          { limit: FIELD_WEFT_MAX_FIELDS_V1 },
        )
      }
      return
    }
    state.fieldCount++

    const raw = arrayValue(fields, index, path)
    if (!isRecord(raw)) {
      addError(state, 'type.object', fieldPath, 'Expected a field object.')
      continue
    }
    if (ancestors.has(raw)) {
      addError(state, 'structure.cycle', fieldPath, 'The field tree contains a cycle.')
      continue
    }
    ancestors.add(raw)
    checkKnownKeys(raw, FIELD_KEYS, fieldPath, state)

    const idPath = childPath(fieldPath, 'id')
    const id = checkId(ownValue(raw, 'id'), idPath, state, true)
    const isUniqueId = id
      ? registerUnique(state.fieldIds, id, idPath, state, 'id.duplicate-field')
      : false

    const name = requiredName(raw, fieldPath, state)
    if (name) {
      const namePath = childPath(fieldPath, 'name')
      if (name !== name.trim()) {
        addError(
          state,
          'field.name-whitespace',
          namePath,
          'A field name must not have leading or trailing whitespace.',
        )
      }
      const firstPath = siblingNames.get(name)
      if (firstPath) {
        addError(
          state,
          'field.duplicate-name',
          firstPath,
          `Duplicate sibling field name "${name}".`,
          { name },
          [{ path: namePath, message: 'Duplicate location.' }],
        )
      } else {
        siblingNames.set(name, namePath)
      }
    }

    const fieldType = checkEnum(
      ownValue(raw, 'type'),
      FIELD_TYPE_VALUES,
      childPath(fieldPath, 'type'),
      state,
    )
    validateAnnotations(raw, fieldPath, state)
    checkBooleanProperties(raw, ['array', 'nullable', 'pk'], fieldPath, state)

    let discriminatorValues: string[] | undefined
    if (ownerKind === 'entity') {
      if (hasOwn(raw, 'discriminator')) {
        discriminatorValues = validateDiscriminator(
          raw.discriminator,
          fieldType,
          childPath(fieldPath, 'discriminator'),
          state,
        )
      }
      if (hasOwn(raw, 'when')) {
        const when = validateWhen(raw.when, childPath(fieldPath, 'when'), state)
        if (when) {
          state.whenRefs.push({
            ownerId,
            ...(id ? { fieldId: id } : {}),
            path: childPath(fieldPath, 'when'),
            when,
          })
        }
      }
    } else {
      for (const key of ['discriminator', 'when'] as const) {
        if (hasOwn(raw, key)) {
          addError(
            state,
            'field.process-variant',
            childPath(fieldPath, key),
            `${key} is not allowed on a process field.`,
            { property: key },
          )
        }
      }
    }

    if (id && isUniqueId) {
      state.fields.set(id, {
        ownerId,
        ownerKind,
        path: idPath,
        ...(fieldType ? { type: fieldType } : {}),
        ...(discriminatorValues ? { discriminatorValues } : {}),
      })
    }

    if (hasOwn(raw, 'children')) {
      const childrenPath = childPath(fieldPath, 'children')
      if (ownerKind !== 'entity') {
        addError(
          state,
          'field.process-children',
          childrenPath,
          'A process input or output field must not have children.',
        )
      }
      if (!Array.isArray(raw.children)) {
        addError(state, 'type.array', childrenPath, 'Expected an array.')
      } else {
        if (fieldType !== 'object') {
          addError(
            state,
            'field.children-type',
            childrenPath,
            'Only an object field may have children.',
          )
        }
        validateFields(
          raw.children,
          childrenPath,
          ownerId,
          ownerKind,
          depth + 1,
          state,
          ancestors,
        )
      }
    }
    ancestors.delete(raw)
  }
}

function validateNodeIdentity(
  raw: RecordValue,
  path: string,
  kind: NodeKind,
  state: ValidationState,
): string {
  const idPath = childPath(path, 'id')
  const id = checkId(ownValue(raw, 'id'), idPath, state, true)
  if (id && registerUnique(state.nodeIds, id, idPath, state, 'id.duplicate-node')) {
    state.nodes.set(id, { kind, path: idPath })
    return id
  }
  return `@invalid:${path}`
}

function validateEntity(raw: unknown, path: string, state: ValidationState): void {
  if (!isRecord(raw)) {
    addError(state, 'type.object', path, 'Expected an entity object.')
    return
  }
  checkKnownKeys(raw, ENTITY_KEYS, path, state)
  const ownerId = validateNodeIdentity(raw, path, 'entity', state)
  requiredName(raw, path, state)
  checkEnum(ownValue(raw, 'kind'), ENTITY_KIND_VALUES, childPath(path, 'kind'), state)
  validateAnnotations(raw, path, state)
  if (hasOwn(raw, 'position')) checkCoordinate(raw.position, childPath(path, 'position'), state)

  const fields = requiredArray(raw, 'fields', path, state)
  if (fields) {
    validateFields(fields, childPath(path, 'fields'), ownerId, 'entity', 1, state, new WeakSet())
  }

  if (hasOwn(raw, 'collapsed')) {
    const collapsedPath = childPath(path, 'collapsed')
    const ids = validateStringSet(raw.collapsed, collapsedPath, state)
    if (ids && Array.isArray(raw.collapsed)) {
      const seen = new Set<string>()
      for (let index = 0; index < raw.collapsed.length; index++) {
        const fieldId = arrayValue(raw.collapsed, index, collapsedPath)
        if (typeof fieldId !== 'string' || fieldId.length === 0 || seen.has(fieldId)) continue
        seen.add(fieldId)
        const itemPath = childPath(collapsedPath, index)
        if (checkId(fieldId, itemPath, state, true)) {
          state.collapsedRefs.push({ ownerId, fieldId, path: itemPath })
        }
      }
    }
  }
}

function validateProcess(raw: unknown, path: string, state: ValidationState): void {
  if (!isRecord(raw)) {
    addError(state, 'type.object', path, 'Expected a process object.')
    return
  }
  checkKnownKeys(raw, PROCESS_KEYS, path, state)
  const ownerId = validateNodeIdentity(raw, path, 'process', state)
  requiredName(raw, path, state)
  checkEnum(ownValue(raw, 'kind'), ENTITY_KIND_VALUES, childPath(path, 'kind'), state)
  validateAnnotations(raw, path, state)
  if (hasOwn(raw, 'position')) checkCoordinate(raw.position, childPath(path, 'position'), state)

  const inputs = requiredArray(raw, 'inputs', path, state)
  if (inputs) {
    validateFields(
      inputs,
      childPath(path, 'inputs'),
      ownerId,
      'process-input',
      1,
      state,
      new WeakSet(),
    )
  }
  const outputs = requiredArray(raw, 'outputs', path, state)
  if (outputs) {
    validateFields(
      outputs,
      childPath(path, 'outputs'),
      ownerId,
      'process-output',
      1,
      state,
      new WeakSet(),
    )
  }
}

function validateBoundary(raw: unknown, path: string, state: ValidationState): void {
  if (!isRecord(raw)) {
    addError(state, 'type.object', path, 'Expected a boundary object.')
    return
  }
  checkKnownKeys(raw, BOUNDARY_KEYS, path, state)
  validateNodeIdentity(raw, path, 'boundary', state)
  requiredName(raw, path, state)
  if (hasOwn(raw, 'color')) {
    checkEnum(raw.color, BOUNDARY_COLOR_VALUES, childPath(path, 'color'), state)
  }
  if (hasOwn(raw, 'kind')) {
    checkEnum(raw.kind, BOUNDARY_KIND_VALUES, childPath(path, 'kind'), state)
  }
  validateAnnotations(raw, path, state)
  if (hasOwn(raw, 'position')) checkCoordinate(raw.position, childPath(path, 'position'), state)
  if (hasOwn(raw, 'size')) checkSize(raw.size, childPath(path, 'size'), state)
  if (hasOwn(raw, 'members')) {
    const membersPath = childPath(path, 'members')
    const members = validateStringSet(raw.members, membersPath, state)
    if (members && Array.isArray(raw.members)) {
      const seen = new Set<string>()
      for (let index = 0; index < raw.members.length; index++) {
        const memberId = arrayValue(raw.members, index, membersPath)
        if (typeof memberId !== 'string' || memberId.length === 0 || seen.has(memberId)) continue
        seen.add(memberId)
        const itemPath = childPath(membersPath, index)
        if (checkId(memberId, itemPath, state, true)) {
          state.memberRefs.push({ memberId, path: itemPath })
        }
      }
    }
  }
}

function validateMapping(raw: unknown, path: string, state: ValidationState): void {
  if (!isRecord(raw)) {
    addError(state, 'type.object', path, 'Expected a mapping object.')
    return
  }
  checkKnownKeys(raw, MAPPING_KEYS, path, state)
  const idPath = childPath(path, 'id')
  const id = checkId(ownValue(raw, 'id'), idPath, state, true)
  if (id) {
    registerUnique(
      state.relationIds,
      id,
      idPath,
      state,
      'id.duplicate-relation',
    )
  }

  const sourceFieldId = checkId(
    ownValue(raw, 'sourceFieldId'),
    childPath(path, 'sourceFieldId'),
    state,
    true,
  )
  const targetFieldId = checkId(
    ownValue(raw, 'targetFieldId'),
    childPath(path, 'targetFieldId'),
    state,
    true,
  )
  if (hasOwn(raw, 'kind')) {
    checkEnum(raw.kind, MAPPING_KIND_VALUES, childPath(path, 'kind'), state)
  }
  optionalString(
    raw,
    'label',
    path,
    state,
    FIELD_WEFT_MAX_LABEL_CHARS_V1,
    'limit.string.label',
  )
  validateAnnotations(raw, path, state)
  state.mappingRefs.push({
    path,
    ...(sourceFieldId ? { sourceFieldId } : {}),
    ...(targetFieldId ? { targetFieldId } : {}),
  })
}

function validateNodeRelation(
  raw: unknown,
  path: string,
  state: ValidationState,
): void {
  if (!isRecord(raw)) {
    addError(state, 'type.object', path, 'Expected a node relation object.')
    return
  }
  checkKnownKeys(raw, NODE_RELATION_KEYS, path, state)
  const idPath = childPath(path, 'id')
  const id = checkId(ownValue(raw, 'id'), idPath, state, true)
  if (id) {
    registerUnique(
      state.relationIds,
      id,
      idPath,
      state,
      'id.duplicate-relation',
    )
  }
  const sourceNodeId = checkId(
    ownValue(raw, 'sourceNodeId'),
    childPath(path, 'sourceNodeId'),
    state,
    true,
  )
  const targetNodeId = checkId(
    ownValue(raw, 'targetNodeId'),
    childPath(path, 'targetNodeId'),
    state,
    true,
  )
  optionalString(
    raw,
    'label',
    path,
    state,
    FIELD_WEFT_MAX_LABEL_CHARS_V1,
    'limit.string.label',
  )
  validateAnnotations(raw, path, state)
  if (sourceNodeId && targetNodeId && sourceNodeId === targetNodeId) {
    addError(
      state,
      'node-relation.self',
      childPath(path, 'targetNodeId'),
      'A node relation must have different source and target nodes.',
    )
  }
  state.nodeRelationRefs.push({
    path,
    ...(sourceNodeId ? { sourceNodeId } : {}),
    ...(targetNodeId ? { targetNodeId } : {}),
  })
}

function validateWhenReferences(state: ValidationState): void {
  for (const ref of state.whenRefs) {
    for (const [discriminatorId, rawValues] of ownDataEntries(
      ref.when,
      ref.path,
    )) {
      if (!ID_RE.test(discriminatorId) || isReservedFieldWeftId(discriminatorId)) continue
      const path = childPath(ref.path, discriminatorId)
      if (ref.fieldId === discriminatorId) {
        addError(
          state,
          'when.self-reference',
          path,
          'A field must not reference itself as a discriminator.',
        )
        continue
      }
      const target = state.fields.get(discriminatorId)
      if (!target) {
        addError(
          state,
          'reference.when',
          path,
          `Discriminator field ID "${discriminatorId}" was not found.`,
          { id: discriminatorId },
        )
        continue
      }
      if (target.ownerKind !== 'entity' || target.ownerId !== ref.ownerId) {
        addError(
          state,
          'when.owner',
          path,
          'A when clause may reference only a discriminator in the same entity.',
        )
        continue
      }
      if (!target.discriminatorValues) {
        addError(
          state,
          'when.discriminator',
          path,
          `Field ID "${discriminatorId}" is not a discriminator.`,
          { id: discriminatorId },
        )
        continue
      }
      if (!Array.isArray(rawValues)) continue
      for (let index = 0; index < rawValues.length; index++) {
        const value = arrayValue(rawValues, index, path)
        if (typeof value === 'string' && !target.discriminatorValues?.includes(value)) {
          addError(
            state,
            'when.value',
            childPath(path, index),
            `Value "${value}" is not present in the referenced discriminator.values.`,
            { value },
          )
        }
      }
    }
  }
}

function validateCollapsedReferences(state: ValidationState): void {
  for (const ref of state.collapsedRefs) {
    const field = state.fields.get(ref.fieldId)
    if (!field) {
      addError(
        state,
        'reference.collapsed',
        ref.path,
        `Collapsed field ID "${ref.fieldId}" was not found.`,
        { id: ref.fieldId },
      )
      continue
    }
    if (field.ownerKind !== 'entity' || field.ownerId !== ref.ownerId) {
      addError(
        state,
        'collapsed.owner',
        ref.path,
        'A collapsed reference may target only a field in the same entity.',
      )
      continue
    }
    if (field.type !== 'object') {
      addError(state, 'collapsed.type', ref.path, 'A collapsed reference may target only an object field.')
    }
  }
}

function validateMappingEndpoint(
  state: ValidationState,
  ref: MappingRef,
  side: 'source' | 'target',
): void {
  const fieldId = side === 'source' ? ref.sourceFieldId : ref.targetFieldId
  if (!fieldId) return
  const path = childPath(ref.path, `${side}FieldId`)
  const field = state.fields.get(fieldId)
  if (!field) {
    addError(
      state,
      `reference.mapping-${side}`,
      path,
      `Field ID "${fieldId}" was not found.`,
      { id: fieldId },
    )
    return
  }
  if (field.type === 'object') {
    addError(state, 'mapping.leaf', path, 'A mapping may reference only leaf fields.')
  }
  const allowed =
    side === 'source'
      ? field.ownerKind === 'entity' || field.ownerKind === 'process-output'
      : field.ownerKind === 'entity' || field.ownerKind === 'process-input'
  if (!allowed) {
    addError(
      state,
      'mapping.direction',
      path,
      side === 'source'
        ? 'A mapping source must be an entity field or process output field.'
        : 'A mapping target must be an entity field or process input field.',
    )
  }
}

function validateMappingReferences(state: ValidationState): void {
  for (const ref of state.mappingRefs) {
    validateMappingEndpoint(state, ref, 'source')
    validateMappingEndpoint(state, ref, 'target')
  }
}

function validateNodeRelationEndpoint(
  state: ValidationState,
  ref: NodeRelationRef,
  side: 'source' | 'target',
): void {
  const nodeId = side === 'source' ? ref.sourceNodeId : ref.targetNodeId
  if (!nodeId) return
  const path = childPath(ref.path, `${side}NodeId`)
  const node = state.nodes.get(nodeId)
  if (!node) {
    addError(
      state,
      `reference.node-relation-${side}`,
      path,
      `Node ID "${nodeId}" was not found.`,
      { id: nodeId },
    )
    return
  }
  if (node.kind === 'boundary') {
    addError(
      state,
      'node-relation.endpoint',
      path,
      'A node relation may reference only entities or processes.',
    )
  }
}

function validateNodeRelationReferences(state: ValidationState): void {
  for (const ref of state.nodeRelationRefs) {
    validateNodeRelationEndpoint(state, ref, 'source')
    validateNodeRelationEndpoint(state, ref, 'target')
  }
}

function validateBoundaryReferences(state: ValidationState): void {
  const membership = new Map<string, string>()
  for (const ref of state.memberRefs) {
    const node = state.nodes.get(ref.memberId)
    if (!node) {
      addError(
        state,
        'reference.boundary-member',
        ref.path,
        `Member node ID "${ref.memberId}" was not found.`,
        { id: ref.memberId },
      )
      continue
    }
    if (node.kind === 'boundary') {
      addError(state, 'boundary.nested', ref.path, 'A boundary must not contain another boundary.')
      continue
    }
    const firstPath = membership.get(ref.memberId)
    if (firstPath) {
      addError(
        state,
        'boundary.duplicate-member',
        firstPath,
        `Node ID "${ref.memberId}" belongs to more than one boundary.`,
        { id: ref.memberId },
        [{ path: ref.path, message: 'Duplicate membership location.' }],
      )
    } else {
      membership.set(ref.memberId, ref.path)
    }
  }
}

function createState(): ValidationState {
  return {
    errors: [],
    nodeIds: new Map(),
    nodes: new Map(),
    relationIds: new Map(),
    fieldIds: new Map(),
    fields: new Map(),
    whenRefs: [],
    mappingRefs: [],
    nodeRelationRefs: [],
    collapsedRefs: [],
    memberRefs: [],
    fieldCount: 0,
    fieldLimitReported: false,
    depthLimitReported: false,
    nodeVisits: 0,
    tagCount: 0,
    metaEntryCount: 0,
    annotationCodePoints: 0,
    tagLimitReported: false,
    metaLimitReported: false,
    annotationLimitReported: false,
  }
}

function validateNodes(
  values: unknown[] | undefined,
  basePath: string,
  validate: (raw: unknown, path: string, state: ValidationState) => void,
  state: ValidationState,
): void {
  if (!values) return
  for (let index = 0; index < values.length; index++) {
    if (state.nodeVisits >= FIELD_WEFT_MAX_NODES_V1) return
    state.nodeVisits++
    validate(arrayValue(values, index, basePath), childPath(basePath, index), state)
  }
}

function validateStableFieldWeftDocV1(
  input: unknown,
): ValidateFieldWeftDocResultV1 {
  const state = createState()
  if (!isRecord(input)) {
    addError(state, 'type.object', '', 'The top-level FieldWeft value must be an object.')
    return { ok: false, errors: state.errors }
  }

  checkKnownKeys(input, TOP_LEVEL_KEYS, '', state)
  if (!hasOwn(input, 'format')) {
    addError(state, 'property.required', '/format', 'Required property is missing.')
  } else if (input.format !== FIELD_WEFT_FORMAT) {
    addError(
      state,
      'format.value',
      '/format',
      `format must be "${FIELD_WEFT_FORMAT}".`,
      { expected: FIELD_WEFT_FORMAT },
    )
  }
  if (!hasOwn(input, 'version')) {
    addError(state, 'property.required', '/version', 'Required property is missing.')
  } else if (input.version !== FIELD_WEFT_VERSION_V1) {
    addError(
      state,
      'version.value',
      '/version',
      `version must be ${FIELD_WEFT_VERSION_V1}.`,
      { expected: FIELD_WEFT_VERSION_V1 },
    )
  }

  const entities = requiredArray(input, 'entities', '', state)
  const processes = requiredArray(input, 'processes', '', state)
  const boundaries = requiredArray(input, 'boundaries', '', state)
  const nodeRelations = requiredArray(input, 'nodeRelations', '', state)
  const mappings = requiredArray(input, 'mappings', '', state)

  const nodeCount =
    (entities?.length ?? 0) + (processes?.length ?? 0) + (boundaries?.length ?? 0)
  if (nodeCount > FIELD_WEFT_MAX_NODES_V1) {
    addError(
      state,
      'limit.nodes',
      '',
      `The document must not contain more than ${FIELD_WEFT_MAX_NODES_V1} nodes.`,
      { limit: FIELD_WEFT_MAX_NODES_V1 },
    )
  }
  const relationCount =
    (nodeRelations?.length ?? 0) + (mappings?.length ?? 0)
  if (relationCount > FIELD_WEFT_MAX_RELATIONS_V1) {
    addError(
      state,
      'limit.relations',
      '',
      `The total number of node relations and mappings must not exceed ${FIELD_WEFT_MAX_RELATIONS_V1}.`,
      { limit: FIELD_WEFT_MAX_RELATIONS_V1 },
    )
  }

  validateNodes(entities, '/entities', validateEntity, state)
  validateNodes(processes, '/processes', validateProcess, state)
  validateNodes(boundaries, '/boundaries', validateBoundary, state)
  let remainingRelations = FIELD_WEFT_MAX_RELATIONS_V1
  if (nodeRelations) {
    const count = Math.min(nodeRelations.length, remainingRelations)
    for (let index = 0; index < count; index++) {
      validateNodeRelation(
        arrayValue(nodeRelations, index, '/nodeRelations'),
        childPath('/nodeRelations', index),
        state,
      )
    }
    remainingRelations -= count
  }
  if (mappings) {
    const count = Math.min(mappings.length, remainingRelations)
    for (let index = 0; index < count; index++) {
      validateMapping(
        arrayValue(mappings, index, '/mappings'),
        childPath('/mappings', index),
        state,
      )
    }
  }

  validateWhenReferences(state)
  validateCollapsedReferences(state)
  validateNodeRelationReferences(state)
  validateMappingReferences(state)
  validateBoundaryReferences(state)

  if (state.errors.length) return { ok: false, errors: state.errors }
  return { ok: true, doc: input as ValidFieldWeftDocV1 }
}

export function validateFieldWeftDocV1(
  input: unknown,
): ValidateFieldWeftDocResultV1 {
  try {
    return validateStableFieldWeftDocV1(input)
  } catch (error) {
    return {
      ok: false,
      errors: [
        unstableStructuredInputDiagnostic(
          error instanceof UnstableStructuredInputError ? error.path : '',
        ),
      ],
    }
  }
}

export function readFieldWeftDoc(input: unknown): ReadFieldWeftDocResult {
  try {
    if (isRecord(input)) {
      const formatMarker = inspectOwnEnumerableDataProperty(input, 'format')
      if (formatMarker.kind === 'unstable') {
        return {
          kind: 'invalid',
          errors: [unstableStructuredInputDiagnostic('/format')],
        }
      }
      const versionMarker = inspectOwnEnumerableDataProperty(input, 'version')
      if (versionMarker.kind === 'unstable') {
        return {
          kind: 'invalid',
          errors: [unstableStructuredInputDiagnostic('/version')],
        }
      }
      if (
        formatMarker.kind === 'data' &&
        formatMarker.value === FIELD_WEFT_FORMAT &&
        versionMarker.kind === 'data' &&
        Number.isInteger(versionMarker.value) &&
        versionMarker.value !== FIELD_WEFT_VERSION_V1
      ) {
        return { kind: 'unsupported', version: versionMarker.value }
      }
    }
    const result = validateStableFieldWeftDocV1(input)
    return result.ok
      ? { kind: 'ok', doc: result.doc }
      : { kind: 'invalid', errors: result.errors }
  } catch (error) {
    return {
      kind: 'invalid',
      errors: [
        unstableStructuredInputDiagnostic(
          error instanceof UnstableStructuredInputError ? error.path : '',
        ),
      ],
    }
  }
}
