import {
  FIELD_WEFT_BOUNDARY_COLORS_V1,
  FIELD_WEFT_BOUNDARY_KINDS_V1,
  FIELD_WEFT_ENTITY_KINDS_V1,
  FIELD_WEFT_FIELD_TYPES_V1,
  FIELD_WEFT_FORMAT,
  FIELD_WEFT_MAPPING_KINDS_V1,
  FIELD_WEFT_VERSION_V1,
  type FieldWeftBoundaryKindV1,
  type FieldWeftBoundaryV1,
  type FieldWeftDocV1,
  type FieldWeftEntityV1,
  type FieldWeftFieldV1,
  type FieldWeftMappingV1,
  type FieldWeftMetadataV1,
  type FieldWeftMetadataValueV1,
  type FieldWeftNodeRelationV1,
  type FieldWeftWhenV1,
} from './fieldweft-v1.generated.js'
import {
  FIELD_WEFT_MAX_FIELD_DEPTH_V1,
  FIELD_WEFT_MAX_FIELDS_V1,
  FIELD_WEFT_MAX_NODES_V1,
  FIELD_WEFT_MAX_RELATIONS_V1,
  FIELD_WEFT_MAX_COORD_V1,
  type CanonicalFieldWeftDocV1,
  type FieldWeftAnnotationsV1,
} from './code-model.js'
import { readCanonicalFieldWeftDoc } from './code-input.js'
import type { FieldWeftDiagnostic } from './code-validate.js'

type BoundaryColor = NonNullable<FieldWeftBoundaryV1['color']>
type DiagnosticParams = NonNullable<FieldWeftDiagnostic['params']>

export const FIELD_WEFT_SHARE_PACK_VERSION = 1 as const
export const FIELD_WEFT_SHARE_FORMAT = 'd1' as const
export const FIELD_WEFT_MAX_SHARE_TOKEN_CHARS = 256 * 1024
export const FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES = 8 * 1024 * 1024

const SHARE_TOKEN_PREFIX = `${FIELD_WEFT_SHARE_FORMAT}.`
const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/
const BOUNDARY_COLOR_VALUES = Object.freeze([
  ...FIELD_WEFT_BOUNDARY_COLORS_V1,
])
const BOUNDARY_KIND_VALUES = Object.freeze([
  ...FIELD_WEFT_BOUNDARY_KINDS_V1,
])
const ENTITY_KIND_VALUES = Object.freeze([...FIELD_WEFT_ENTITY_KINDS_V1])
const FIELD_TYPE_VALUES = Object.freeze([...FIELD_WEFT_FIELD_TYPES_V1])
const MAPPING_KIND_VALUES = Object.freeze([...FIELD_WEFT_MAPPING_KINDS_V1])

export type FieldWeftShareEncodeResult =
  | { kind: 'ok'; token: string; tokenChars: number; jsonBytes: number }
  | { kind: 'invalid'; diagnostics: FieldWeftDiagnostic[] }
  | { kind: 'unsupported'; feature: string }
  | { kind: 'too-large'; limit: string }

export type FieldWeftShareDecodeResult =
  | { kind: 'ok'; doc: CanonicalFieldWeftDocV1 }
  | { kind: 'invalid'; reason: string; diagnostics?: FieldWeftDiagnostic[] }
  | { kind: 'unsupported'; format: string }
  | { kind: 'too-large'; limit: string }

const F_ARRAY = 1
const F_NULLABLE = 2
const F_PK = 4
const FIELD_FLAGS = F_ARRAY | F_NULLABLE | F_PK

type PackedTuple = unknown[]

type PackContext = {
  fields: FieldWeftFieldV1[]
  fieldIndexes: Map<string, number>
  fieldById: Map<string, FieldWeftFieldV1>
}

type PendingWhen = {
  field: FieldWeftFieldV1
  path: string
  clauses: number[][]
}

type PendingCollapsed = {
  entity: FieldWeftEntityV1
  path: string
  refs: number[]
}

type UnpackState = {
  fields: FieldWeftFieldV1[]
  pendingWhen: PendingWhen[]
  pendingCollapsed: PendingCollapsed[]
  fieldAncestors: WeakSet<unknown[]>
}

type ParsedBoundary = FieldWeftAnnotationsV1 & {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  members?: number[]
  color?: BoundaryColor
  kind?: FieldWeftBoundaryKindV1
  description?: string
}

type ByteTransform = TransformStream<Uint8Array, Uint8Array>

type TransformBytesResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false }

export class FieldWeftShareTupleError extends Error {
  readonly code: string
  readonly path: string
  readonly params?: DiagnosticParams

  constructor(
    code: string,
    path: string,
    message: string,
    params?: DiagnosticParams,
  ) {
    super(message)
    this.name = 'FieldWeftShareTupleError'
    this.code = code
    this.path = path
    this.params = params
  }
}

function fail(
  code: string,
  path: string,
  message: string,
  params?: DiagnosticParams,
): never {
  throw new FieldWeftShareTupleError(code, path, message, params)
}

function childPath(path: string, child: string | number): string {
  return `${path}/${child}`
}

function trimTail(slots: unknown[]): unknown[] {
  const out = [...slots]
  while (out.length && out[out.length - 1] === 0) out.pop()
  return out
}

function expectTuple(
  value: unknown,
  path: string,
  minLength: number,
  maxLength = minLength,
): PackedTuple {
  if (!Array.isArray(value)) {
    return fail('tuple.type', path, 'Expected a tuple array.')
  }
  if (value.length < minLength || value.length > maxLength) {
    return fail(
      'tuple.length',
      path,
      `Tuple length must be ${minLength}${minLength === maxLength ? '' : `..${maxLength}`}.`,
      { min: minLength, max: maxLength },
    )
  }
  if (value.length > minLength && value[value.length - 1] === 0) {
    return fail(
      'tuple.trailing-sentinel',
      childPath(path, value.length - 1),
      'A trailing empty optional slot must be omitted.',
    )
  }
  return value
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    return fail('tuple.array', path, 'Expected an array.')
  }
  return value
}

function expectNonEmptyArray(value: unknown, path: string): unknown[] {
  const array = expectArray(value, path)
  if (array.length === 0) {
    return fail('tuple.empty', path, 'An empty optional array must be omitted.')
  }
  return array
}

function optionalArraySlot(tuple: PackedTuple, index: number, path: string): unknown[] | undefined {
  const value = tuple[index]
  if (value === undefined || value === 0) return undefined
  return expectNonEmptyArray(value, childPath(path, index))
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    return fail('tuple.string', path, 'Expected a string.')
  }
  return value
}

function optionalStringSlot(
  tuple: PackedTuple,
  index: number,
  path: string,
): string | undefined {
  const value = tuple[index]
  if (value === undefined || value === 0) return undefined
  const string = expectString(value, childPath(path, index))
  if (string.length === 0) {
    return fail(
      'tuple.empty-string',
      childPath(path, index),
      'An empty optional string must be omitted.',
    )
  }
  return string
}

function packAnnotations(value: FieldWeftAnnotationsV1): unknown[] | 0 {
  const metaKeys = Object.keys(value.meta ?? {}).sort()
  const tuple = trimTail([
    value.description ?? 0,
    value.tags?.length ? [...value.tags] : 0,
    metaKeys.length
      ? metaKeys.map((key) => [key, value.meta![key]])
      : 0,
  ])
  return tuple.length ? tuple : 0
}

function expectMetadataValue(value: unknown, path: string): FieldWeftMetadataValueV1 {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Object.is(value, -0) ? 0 : value
  }
  return fail(
    'tuple.meta-value',
    path,
    'A metadata value must be a string, finite number, boolean, or null.',
  )
}

function unpackAnnotations(
  tuple: PackedTuple,
  index: number,
  path: string,
): FieldWeftAnnotationsV1 {
  const value = tuple[index]
  if (value === undefined || value === 0) return {}
  const annotationPath = childPath(path, index)
  const annotation = expectTuple(value, annotationPath, 1, 3)
  const description = optionalStringSlot(annotation, 0, annotationPath)
  const tagSlot = optionalArraySlot(annotation, 1, annotationPath)
  const tags = tagSlot?.map((tag, tagIndex) =>
    expectString(tag, childPath(childPath(annotationPath, 1), tagIndex)),
  )
  const metaSlot = optionalArraySlot(annotation, 2, annotationPath)
  let meta: FieldWeftMetadataV1 | undefined
  if (metaSlot) {
    meta = Object.create(null) as FieldWeftMetadataV1
    metaSlot.forEach((entry, entryIndex) => {
      const entryPath = childPath(childPath(annotationPath, 2), entryIndex)
      const pair = expectTuple(entry, entryPath, 2)
      const key = expectString(pair[0], childPath(entryPath, 0))
      if (Object.prototype.hasOwnProperty.call(meta, key)) {
        fail(
          'tuple.meta-duplicate-key',
          childPath(entryPath, 0),
          `Duplicate metadata key "${key}".`,
          { key },
        )
      }
      meta![key] = expectMetadataValue(pair[1], childPath(entryPath, 1))
    })
  }
  if (description === undefined && !tags?.length && !meta) {
    return fail(
      'tuple.empty-annotations',
      annotationPath,
      'An empty annotation tuple must be omitted.',
    )
  }
  return {
    ...(description !== undefined ? { description } : {}),
    ...(tags?.length ? { tags } : {}),
    ...(meta ? { meta } : {}),
  }
}

function expectSafeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) {
    return fail('tuple.integer', path, 'Expected a safe integer.')
  }
  return value as number
}

function expectNonNegativeInteger(value: unknown, path: string): number {
  const integer = expectSafeInteger(value, path)
  if (integer < 0) {
    return fail('tuple.index', path, 'An index must be a non-negative integer.')
  }
  return integer
}

function expectIndex(value: unknown, length: number, path: string): number {
  const index = expectNonNegativeInteger(value, path)
  if (index >= length) {
    const max = Math.max(length - 1, 0)
    return fail(
      'tuple.index-range',
      path,
      `An index must be in the range 0..${max}.`,
      { max },
    )
  }
  return index
}

function expectEnumIndex<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
): T {
  return values[expectIndex(value, values.length, path)]
}

function optionalEnumSlot<T extends string>(
  tuple: PackedTuple,
  index: number,
  values: readonly T[],
  path: string,
): T | undefined {
  const value = tuple[index]
  if (value === undefined || value === 0) return undefined
  const shifted = expectSafeInteger(value, childPath(path, index))
  if (shifted < 1 || shifted > values.length) {
    return fail(
      'tuple.enum-range',
      childPath(path, index),
      `An optional enum index must be in the range 1..${values.length}.`,
      { max: values.length },
    )
  }
  return values[shifted - 1]
}

function expectCoordinate(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || Math.abs(value) > FIELD_WEFT_MAX_COORD_V1) {
    return fail(
      'tuple.coordinate',
      path,
      `A restored coordinate must be a safe integer in the range ±${FIELD_WEFT_MAX_COORD_V1}.`,
      { limit: FIELD_WEFT_MAX_COORD_V1 },
    )
  }
  return value
}

function expectSize(value: unknown, path: string): number {
  const size = expectSafeInteger(value, path)
  if (size <= 0 || size > FIELD_WEFT_MAX_COORD_V1) {
    return fail(
      'tuple.size',
      path,
      `A size must be in the range 1..${FIELD_WEFT_MAX_COORD_V1}.`,
      { limit: FIELD_WEFT_MAX_COORD_V1 },
    )
  }
  return size
}

function safeDifference(value: number, origin: number, path: string): number {
  const result = value - origin
  if (!Number.isSafeInteger(result)) {
    return fail('tuple.arithmetic', path, 'Origin normalization produced an unsafe integer.')
  }
  return result
}

function safeRestore(value: number, origin: number, path: string): number {
  const result = value + origin
  if (!Number.isSafeInteger(result)) {
    return fail('tuple.arithmetic', path, 'Origin restoration produced an unsafe integer.')
  }
  return expectCoordinate(result, path)
}

function walkFields(fields: readonly FieldWeftFieldV1[], visit: (field: FieldWeftFieldV1) => void): void {
  for (const field of fields) {
    visit(field)
    if (field.children?.length) walkFields(field.children, visit)
  }
}

function makePackContext(doc: CanonicalFieldWeftDocV1): PackContext {
  const fields: FieldWeftFieldV1[] = []
  const fieldIndexes = new Map<string, number>()
  const fieldById = new Map<string, FieldWeftFieldV1>()
  const add = (field: FieldWeftFieldV1) => {
    if (fieldIndexes.has(field.id)) {
      fail(
        'pack.duplicate-field',
        `/fields/${field.id}`,
        `Duplicate field ID "${field.id}".`,
        { id: field.id },
      )
    }
    fieldIndexes.set(field.id, fields.length)
    fieldById.set(field.id, field)
    fields.push(field)
  }
  for (const entity of doc.entities) walkFields(entity.fields, add)
  for (const process of doc.processes) {
    walkFields(process.inputs, add)
    walkFields(process.outputs, add)
  }
  if (fields.length > FIELD_WEFT_MAX_FIELDS_V1) {
    fail(
      'pack.limit-fields',
      '/fields',
      `The document must not contain more than ${FIELD_WEFT_MAX_FIELDS_V1} fields.`,
      { limit: FIELD_WEFT_MAX_FIELDS_V1 },
    )
  }
  return { fields, fieldIndexes, fieldById }
}

function requiredReference(
  indexes: ReadonlyMap<string, number>,
  id: string,
  path: string,
): number {
  const index = indexes.get(id)
  if (index === undefined) {
    return fail(
      'pack.reference',
      path,
      `No index was found for referenced ID "${id}".`,
      { id },
    )
  }
  return index
}

function enumIndex<T extends string>(
  values: readonly T[],
  value: T,
  path: string,
): number {
  const index = values.indexOf(value)
  if (index < 0) {
    return fail('pack.enum', path, `Unknown enum value: ${value}.`, { value })
  }
  return index
}

function packWhen(when: FieldWeftWhenV1, context: PackContext, path: string): unknown[] {
  return Object.keys(when).sort().map((fieldId, clauseIndex) => {
    const values = when[fieldId]
    const clausePath = childPath(path, clauseIndex)
    const discriminator = context.fieldById.get(fieldId)
    if (!discriminator?.discriminator) {
      return fail(
        'pack.when-discriminator',
        clausePath,
        `Field ID "${fieldId}" is not a discriminator.`,
        { id: fieldId },
      )
    }
    return [
      requiredReference(context.fieldIndexes, fieldId, childPath(clausePath, 0)),
      ...values.map((value, valueIndex) => {
        const index = discriminator.discriminator!.values.indexOf(value)
        if (index < 0) {
          return fail(
            'pack.when-value',
            childPath(clausePath, valueIndex + 1),
            `Value "${value}" is not present in discriminator.values.`,
            { value },
          )
        }
        return index
      }),
    ]
  })
}

function packField(
  field: FieldWeftFieldV1,
  context: PackContext,
  path: string,
  depth: number,
): unknown[] {
  if (depth > FIELD_WEFT_MAX_FIELD_DEPTH_V1) {
    return fail(
      'pack.limit-field-depth',
      path,
      `Field depth must not exceed ${FIELD_WEFT_MAX_FIELD_DEPTH_V1}.`,
      { limit: FIELD_WEFT_MAX_FIELD_DEPTH_V1 },
    )
  }
  let flags = 0
  if (field.array) flags |= F_ARRAY
  if (field.nullable) flags |= F_NULLABLE
  if (field.pk) flags |= F_PK

  const tuple: unknown[] = [
    field.id,
    field.name,
    enumIndex(FIELD_TYPE_VALUES, field.type, childPath(path, 2)),
    flags,
  ]
  tuple.push(
    ...trimTail([
      field.children?.length
        ? field.children.map((child, index) =>
            packField(child, context, childPath(childPath(path, 4), index), depth + 1),
          )
        : 0,
      field.discriminator?.values.length ? [...field.discriminator.values] : 0,
      field.when ? packWhen(field.when, context, childPath(path, 6)) : 0,
      packAnnotations(field),
    ]),
  )
  return tuple
}

function exactOrigin(doc: CanonicalFieldWeftDocV1, memberIds: ReadonlySet<string>): { x: number; y: number } {
  const topLevel = [
    ...doc.boundaries,
    ...doc.entities.filter((entity) => !memberIds.has(entity.id)),
    ...doc.processes.filter((process) => !memberIds.has(process.id)),
  ]
  if (topLevel.length === 0) return { x: 0, y: 0 }
  return {
    x: Math.min(...topLevel.map((item) => item.position.x)),
    y: Math.min(...topLevel.map((item) => item.position.y)),
  }
}

/** Losslessly packs canonical FieldWeft v1 into the fixed internal d1 tuple. */
export function packFieldWeftShareDocV1(doc: CanonicalFieldWeftDocV1): unknown[] {
  const nodeCount = doc.entities.length + doc.processes.length + doc.boundaries.length
  if (nodeCount > FIELD_WEFT_MAX_NODES_V1) {
    return fail(
      'pack.limit-nodes',
      '',
      `The document must not contain more than ${FIELD_WEFT_MAX_NODES_V1} nodes.`,
      { limit: FIELD_WEFT_MAX_NODES_V1 },
    )
  }
  if (doc.nodeRelations.length + doc.mappings.length > FIELD_WEFT_MAX_RELATIONS_V1) {
    return fail(
      'pack.limit-relations',
      '',
      `The total number of node relations and mappings must not exceed ${FIELD_WEFT_MAX_RELATIONS_V1}.`,
      { limit: FIELD_WEFT_MAX_RELATIONS_V1 },
    )
  }

  const context = makePackContext(doc)
  const memberIds = new Set(
    doc.boundaries.flatMap((boundary) => boundary.members ?? []),
  )
  const nodes = [...doc.entities, ...doc.processes]
  const nodeIndexes = new Map<string, number>()
  nodes.forEach((node, index) => {
    if (nodeIndexes.has(node.id)) {
      fail(
        'pack.duplicate-node',
        `/nodes/${node.id}`,
        `Duplicate node ID "${node.id}".`,
        { id: node.id },
      )
    }
    nodeIndexes.set(node.id, index)
  })
  const origin = exactOrigin(doc, memberIds)
  expectCoordinate(origin.x, '/1')
  expectCoordinate(origin.y, '/2')

  const packPosition = (
    item: CanonicalFieldWeftDocV1['entities'][number] | CanonicalFieldWeftDocV1['processes'][number] | CanonicalFieldWeftDocV1['boundaries'][number],
    path: string,
    xSlot = 3,
    ySlot = 4,
  ) => {
    if (memberIds.has(item.id)) {
      return [
        expectCoordinate(item.position.x, childPath(path, xSlot)),
        expectCoordinate(item.position.y, childPath(path, ySlot)),
      ] as const
    }
    return [
      safeDifference(item.position.x, origin.x, childPath(path, xSlot)),
      safeDifference(item.position.y, origin.y, childPath(path, ySlot)),
    ] as const
  }

  const entities = doc.entities.map((entity, index) => {
    const path = childPath('/3', index)
    const [x, y] = packPosition(entity, path)
    const tuple: unknown[] = [
      entity.id,
      entity.name,
      enumIndex(ENTITY_KIND_VALUES, entity.kind, childPath(path, 2)),
      x,
      y,
      entity.fields.map((field, fieldIndex) =>
        packField(field, context, childPath(childPath(path, 5), fieldIndex), 1),
      ),
    ]
    tuple.push(
      ...trimTail([
        entity.collapsed?.length
          ? entity.collapsed.map((id, collapsedIndex) =>
              requiredReference(
                context.fieldIndexes,
                id,
                childPath(childPath(path, 6), collapsedIndex),
              ),
            )
          : 0,
        packAnnotations(entity),
      ]),
    )
    return tuple
  })

  const processes = doc.processes.map((process, index) => {
    const path = childPath('/4', index)
    const [x, y] = packPosition(process, path)
    const tuple: unknown[] = [
      process.id,
      process.name,
      enumIndex(ENTITY_KIND_VALUES, process.kind, childPath(path, 2)),
      x,
      y,
      process.inputs.map((field, fieldIndex) =>
        packField(field, context, childPath(childPath(path, 5), fieldIndex), 1),
      ),
      process.outputs.map((field, fieldIndex) =>
        packField(field, context, childPath(childPath(path, 6), fieldIndex), 1),
      ),
    ]
    tuple.push(...trimTail([packAnnotations(process)]))
    return tuple
  })

  const boundaries = doc.boundaries.map((boundary, index) => {
    const path = childPath('/5', index)
    const [x, y] = packPosition(boundary, path, 2, 3)
    const tuple: unknown[] = [
      boundary.id,
      boundary.name,
      x,
      y,
      expectSize(boundary.size.width, childPath(path, 4)),
      expectSize(boundary.size.height, childPath(path, 5)),
    ]
    tuple.push(
      ...trimTail([
        boundary.members?.length
          ? boundary.members.map((id, memberIndex) =>
              requiredReference(
                nodeIndexes,
                id,
                childPath(childPath(path, 6), memberIndex),
              ),
            )
          : 0,
        boundary.color
          ? enumIndex(BOUNDARY_COLOR_VALUES, boundary.color, childPath(path, 7)) + 1
          : 0,
        boundary.kind
          ? enumIndex(BOUNDARY_KIND_VALUES, boundary.kind, childPath(path, 8)) + 1
          : 0,
        packAnnotations(boundary),
      ]),
    )
    return tuple
  })

  const mappings = doc.mappings.map((mapping, index) => {
    const path = childPath('/6', index)
    const tuple: unknown[] = [
      mapping.id,
      requiredReference(context.fieldIndexes, mapping.sourceFieldId, childPath(path, 1)),
      requiredReference(context.fieldIndexes, mapping.targetFieldId, childPath(path, 2)),
    ]
    tuple.push(
      ...trimTail([
        mapping.kind && mapping.kind !== 'keep'
          ? enumIndex(MAPPING_KIND_VALUES, mapping.kind, childPath(path, 3)) + 1
          : 0,
        mapping.label ?? 0,
        packAnnotations(mapping),
      ]),
    )
    return tuple
  })

  const nodeRelations = doc.nodeRelations.map((relation, index) => {
    const path = childPath('/7', index)
    const tuple: unknown[] = [
      relation.id,
      requiredReference(
        nodeIndexes,
        relation.sourceNodeId,
        childPath(path, 1),
      ),
      requiredReference(
        nodeIndexes,
        relation.targetNodeId,
        childPath(path, 2),
      ),
    ]
    tuple.push(
      ...trimTail([
        relation.label ?? 0,
        packAnnotations(relation),
      ]),
    )
    return tuple
  })

  const packed: unknown[] = [
    FIELD_WEFT_SHARE_PACK_VERSION,
    origin.x,
    origin.y,
    entities,
    processes,
    boundaries,
    mappings,
  ]
  if (nodeRelations.length) packed.push(nodeRelations)
  return packed
}

function parseIndexArray(value: unknown[], path: string): number[] {
  return value.map((item, index) =>
    expectNonNegativeInteger(item, childPath(path, index)),
  )
}

function parseBoundaries(
  values: unknown[],
  nodeCount: number,
  memberNodeIndexes: Set<number>,
): ParsedBoundary[] {
  return values.map((value, index) => {
    const path = childPath('/5', index)
    const tuple = expectTuple(value, path, 6, 10)
    const memberSlot = optionalArraySlot(tuple, 6, path)
    const members = memberSlot
      ? memberSlot.map((member, memberIndex) => {
          const nodeIndex = expectIndex(
            member,
            nodeCount,
            childPath(childPath(path, 6), memberIndex),
          )
          memberNodeIndexes.add(nodeIndex)
          return nodeIndex
        })
      : undefined
    const color = optionalEnumSlot(tuple, 7, BOUNDARY_COLOR_VALUES, path)
    const kind = optionalEnumSlot(tuple, 8, BOUNDARY_KIND_VALUES, path)
    const annotation = unpackAnnotations(tuple, 9, path)
    return {
      id: expectString(tuple[0], childPath(path, 0)),
      name: expectString(tuple[1], childPath(path, 1)),
      x: expectSafeInteger(tuple[2], childPath(path, 2)),
      y: expectSafeInteger(tuple[3], childPath(path, 3)),
      width: expectSize(tuple[4], childPath(path, 4)),
      height: expectSize(tuple[5], childPath(path, 5)),
      ...(members ? { members } : {}),
      ...(color ? { color } : {}),
      ...(kind ? { kind } : {}),
      ...annotation,
    }
  })
}

function unpackFields(
  values: unknown[],
  path: string,
  allowEntityFeatures: boolean,
  depth: number,
  state: UnpackState,
): FieldWeftFieldV1[] {
  if (depth > FIELD_WEFT_MAX_FIELD_DEPTH_V1) {
    return fail(
      'tuple.limit-field-depth',
      path,
      `Field depth must not exceed ${FIELD_WEFT_MAX_FIELD_DEPTH_V1}.`,
      { limit: FIELD_WEFT_MAX_FIELD_DEPTH_V1 },
    )
  }
  if (state.fields.length + values.length > FIELD_WEFT_MAX_FIELDS_V1) {
    return fail(
      'tuple.limit-fields',
      path,
      `The document must not contain more than ${FIELD_WEFT_MAX_FIELDS_V1} fields.`,
      { limit: FIELD_WEFT_MAX_FIELDS_V1 },
    )
  }

  return values.map((value, index) => {
    const fieldPath = childPath(path, index)
    const tuple = expectTuple(value, fieldPath, 4, 8)
    if (state.fieldAncestors.has(tuple)) {
      return fail('tuple.cycle', fieldPath, 'The field tuple tree contains a cycle.')
    }
    state.fieldAncestors.add(tuple)
    const flags = expectNonNegativeInteger(tuple[3], childPath(fieldPath, 3))
    if ((flags & ~FIELD_FLAGS) !== 0) {
      return fail(
        'tuple.flags',
        childPath(fieldPath, 3),
        `Unknown field flag bits: ${flags}.`,
        { flags },
      )
    }
    const field: FieldWeftFieldV1 = {
      id: expectString(tuple[0], childPath(fieldPath, 0)),
      name: expectString(tuple[1], childPath(fieldPath, 1)),
      type: expectEnumIndex(tuple[2], FIELD_TYPE_VALUES, childPath(fieldPath, 2)),
    }
    state.fields.push(field)
    if (flags & F_ARRAY) field.array = true
    if (flags & F_NULLABLE) field.nullable = true
    if (flags & F_PK) field.pk = true

    const childSlot = optionalArraySlot(tuple, 4, fieldPath)
    if (childSlot) {
      if (!allowEntityFeatures) {
        return fail(
          'tuple.process-children',
          childPath(fieldPath, 4),
          'A process field must not have children.',
        )
      }
      field.children = unpackFields(
        childSlot,
        childPath(fieldPath, 4),
        allowEntityFeatures,
        depth + 1,
        state,
      )
    }

    const discriminatorSlot = optionalArraySlot(tuple, 5, fieldPath)
    if (discriminatorSlot) {
      if (!allowEntityFeatures) {
        return fail(
          'tuple.process-discriminator',
          childPath(fieldPath, 5),
          'A process field must not have a discriminator.',
        )
      }
      field.discriminator = {
        values: discriminatorSlot.map((item, valueIndex) =>
          expectString(item, childPath(childPath(fieldPath, 5), valueIndex)),
        ),
      }
    }

    const whenSlot = optionalArraySlot(tuple, 6, fieldPath)
    if (whenSlot) {
      if (!allowEntityFeatures) {
        return fail(
          'tuple.process-when',
          childPath(fieldPath, 6),
          'A process field must not have a when clause.',
        )
      }
      const seenDiscriminators = new Set<number>()
      const clauses = whenSlot.map((clause, clauseIndex) => {
        const clausePath = childPath(childPath(fieldPath, 6), clauseIndex)
        const tupleClause = expectArray(clause, clausePath)
        if (tupleClause.length < 2) {
          return fail(
            'tuple.when-empty',
            clausePath,
            'A when clause must contain a discriminator index and at least one value index.',
          )
        }
        const discriminatorIndex = expectNonNegativeInteger(
          tupleClause[0],
          childPath(clausePath, 0),
        )
        if (seenDiscriminators.has(discriminatorIndex)) {
          return fail(
            'tuple.when-duplicate-discriminator',
            childPath(clausePath, 0),
            `Duplicate discriminator field index ${discriminatorIndex}.`,
            { index: discriminatorIndex },
          )
        }
        seenDiscriminators.add(discriminatorIndex)
        const seenValues = new Set<number>()
        const valueIndexes = tupleClause.slice(1).map((item, valueIndex) => {
          const parsed = expectNonNegativeInteger(
            item,
            childPath(clausePath, valueIndex + 1),
          )
          if (seenValues.has(parsed)) {
            return fail(
              'tuple.when-duplicate-value',
              childPath(clausePath, valueIndex + 1),
              `Duplicate discriminator value index ${parsed}.`,
              { index: parsed },
            )
          }
          seenValues.add(parsed)
          return parsed
        })
        return [discriminatorIndex, ...valueIndexes]
      })
      state.pendingWhen.push({ field, path: childPath(fieldPath, 6), clauses })
    }
    Object.assign(field, unpackAnnotations(tuple, 7, fieldPath))
    state.fieldAncestors.delete(tuple)
    return field
  })
}

function restoreNodePosition(
  tuple: PackedTuple,
  path: string,
  nodeIndex: number,
  memberNodeIndexes: ReadonlySet<number>,
  originX: number,
  originY: number,
): { x: number; y: number } {
  const packedX = expectSafeInteger(tuple[3], childPath(path, 3))
  const packedY = expectSafeInteger(tuple[4], childPath(path, 4))
  if (memberNodeIndexes.has(nodeIndex)) {
    return {
      x: expectCoordinate(packedX, childPath(path, 3)),
      y: expectCoordinate(packedY, childPath(path, 4)),
    }
  }
  return {
    x: safeRestore(packedX, originX, childPath(path, 3)),
    y: safeRestore(packedY, originY, childPath(path, 4)),
  }
}

/** Strictly unpacks an unknown internal d1 tuple into FieldWeft v1 input. */
export function unpackFieldWeftShareDocV1(value: unknown): FieldWeftDocV1 {
  const root = expectTuple(value, '', 7, 8)
  if (root[0] !== FIELD_WEFT_SHARE_PACK_VERSION) {
    return fail(
      'tuple.version',
      '/0',
      `Internal pack version must be ${FIELD_WEFT_SHARE_PACK_VERSION}.`,
      { expected: FIELD_WEFT_SHARE_PACK_VERSION },
    )
  }
  const originX = expectCoordinate(expectSafeInteger(root[1], '/1'), '/1')
  const originY = expectCoordinate(expectSafeInteger(root[2], '/2'), '/2')
  const entityTuples = expectArray(root[3], '/3')
  const processTuples = expectArray(root[4], '/4')
  const boundaryTuples = expectArray(root[5], '/5')
  const mappingTuples = expectArray(root[6], '/6')
  const nodeRelationTuples = optionalArraySlot(root, 7, '') ?? []
  const nodeCount = entityTuples.length + processTuples.length + boundaryTuples.length
  if (nodeCount > FIELD_WEFT_MAX_NODES_V1) {
    return fail(
      'tuple.limit-nodes',
      '',
      `The document must not contain more than ${FIELD_WEFT_MAX_NODES_V1} nodes.`,
      { limit: FIELD_WEFT_MAX_NODES_V1 },
    )
  }
  if (nodeRelationTuples.length + mappingTuples.length > FIELD_WEFT_MAX_RELATIONS_V1) {
    return fail(
      'tuple.limit-relations',
      '',
      `The total number of node relations and mappings must not exceed ${FIELD_WEFT_MAX_RELATIONS_V1}.`,
      { limit: FIELD_WEFT_MAX_RELATIONS_V1 },
    )
  }

  const memberNodeIndexes = new Set<number>()
  const parsedBoundaries = parseBoundaries(
    boundaryTuples,
    entityTuples.length + processTuples.length,
    memberNodeIndexes,
  )
  const state: UnpackState = {
    fields: [],
    pendingWhen: [],
    pendingCollapsed: [],
    fieldAncestors: new WeakSet(),
  }

  const entities: FieldWeftEntityV1[] = entityTuples.map((value, index) => {
    const path = childPath('/3', index)
    const tuple = expectTuple(value, path, 6, 8)
    const entity: FieldWeftEntityV1 = {
      id: expectString(tuple[0], childPath(path, 0)),
      name: expectString(tuple[1], childPath(path, 1)),
      kind: expectEnumIndex(tuple[2], ENTITY_KIND_VALUES, childPath(path, 2)),
      position: restoreNodePosition(
        tuple,
        path,
        index,
        memberNodeIndexes,
        originX,
        originY,
      ),
      fields: unpackFields(
        expectArray(tuple[5], childPath(path, 5)),
        childPath(path, 5),
        true,
        1,
        state,
      ),
      ...unpackAnnotations(tuple, 7, path),
    }
    const collapsedSlot = optionalArraySlot(tuple, 6, path)
    if (collapsedSlot) {
      state.pendingCollapsed.push({
        entity,
        path: childPath(path, 6),
        refs: parseIndexArray(collapsedSlot, childPath(path, 6)),
      })
    }
    return entity
  })

  const processes = processTuples.map((value, processIndex) => {
    const path = childPath('/4', processIndex)
    const tuple = expectTuple(value, path, 7, 8)
    const nodeIndex = entityTuples.length + processIndex
    return {
      id: expectString(tuple[0], childPath(path, 0)),
      name: expectString(tuple[1], childPath(path, 1)),
      kind: expectEnumIndex(tuple[2], ENTITY_KIND_VALUES, childPath(path, 2)),
      position: restoreNodePosition(
        tuple,
        path,
        nodeIndex,
        memberNodeIndexes,
        originX,
        originY,
      ),
      inputs: unpackFields(
        expectArray(tuple[5], childPath(path, 5)),
        childPath(path, 5),
        false,
        1,
        state,
      ),
      outputs: unpackFields(
        expectArray(tuple[6], childPath(path, 6)),
        childPath(path, 6),
        false,
        1,
        state,
      ),
      ...unpackAnnotations(tuple, 7, path),
    }
  })

  for (const pending of state.pendingWhen) {
    const when = Object.create(null) as FieldWeftWhenV1
    for (const [clauseIndex, [discriminatorRef, ...valueRefs]] of pending.clauses.entries()) {
      const clausePath = childPath(pending.path, clauseIndex)
      const discriminator = state.fields[
        expectIndex(discriminatorRef, state.fields.length, childPath(clausePath, 0))
      ]
      if (!discriminator.discriminator) {
        return fail(
          'tuple.when-discriminator',
          childPath(clausePath, 0),
          `Field index ${discriminatorRef} is not a discriminator.`,
          { index: discriminatorRef },
        )
      }
      if (Object.prototype.hasOwnProperty.call(when, discriminator.id)) {
        return fail(
          'tuple.when-duplicate-id',
          childPath(clausePath, 0),
          `Duplicate restored discriminator ID "${discriminator.id}".`,
          { id: discriminator.id },
        )
      }
      when[discriminator.id] = valueRefs.map((valueRef, valueIndex) =>
        discriminator.discriminator!.values[
          expectIndex(
            valueRef,
            discriminator.discriminator!.values.length,
            childPath(clausePath, valueIndex + 1),
          )
        ],
      )
    }
    pending.field.when = when
  }

  for (const pending of state.pendingCollapsed) {
    pending.entity.collapsed = pending.refs.map((ref, index) =>
      state.fields[
        expectIndex(ref, state.fields.length, childPath(pending.path, index))
      ].id,
    )
  }

  const nodes = [...entities, ...processes]
  const boundaries: FieldWeftBoundaryV1[] = parsedBoundaries.map((parsed, index) => {
    const path = childPath('/5', index)
    return {
      id: parsed.id,
      name: parsed.name,
      position: {
        x: safeRestore(parsed.x, originX, childPath(path, 2)),
        y: safeRestore(parsed.y, originY, childPath(path, 3)),
      },
      size: { width: parsed.width, height: parsed.height },
      ...(parsed.color ? { color: parsed.color } : {}),
      ...(parsed.kind ? { kind: parsed.kind } : {}),
      ...('description' in parsed
        ? { description: parsed.description }
        : {}),
      ...(parsed.tags?.length ? { tags: parsed.tags } : {}),
      ...(parsed.meta ? { meta: parsed.meta } : {}),
      ...(parsed.members
        ? {
            members: parsed.members.map((nodeIndex) => nodes[nodeIndex].id),
          }
        : {}),
    }
  })

  const mappings: FieldWeftMappingV1[] = mappingTuples.map((value, index) => {
    const path = childPath('/6', index)
    const tuple = expectTuple(value, path, 3, 6)
    const mapping: FieldWeftMappingV1 = {
      id: expectString(tuple[0], childPath(path, 0)),
      sourceFieldId: state.fields[
        expectIndex(tuple[1], state.fields.length, childPath(path, 1))
      ].id,
      targetFieldId: state.fields[
        expectIndex(tuple[2], state.fields.length, childPath(path, 2))
      ].id,
    }
    const kind = optionalEnumSlot(tuple, 3, MAPPING_KIND_VALUES, path)
    if (kind === 'keep') {
      return fail(
        'tuple.mapping-default-kind',
        childPath(path, 3),
        'The default mapping kind "keep" must be omitted from the optional slot.',
      )
    }
    if (kind) mapping.kind = kind
    const label = optionalStringSlot(tuple, 4, path)
    if (label !== undefined) mapping.label = label
    Object.assign(mapping, unpackAnnotations(tuple, 5, path))
    return mapping
  })

  const nodeRelations: FieldWeftNodeRelationV1[] = nodeRelationTuples.map(
    (value, index) => {
      const path = childPath('/7', index)
      const tuple = expectTuple(value, path, 3, 5)
      const relation: FieldWeftNodeRelationV1 = {
        id: expectString(tuple[0], childPath(path, 0)),
        sourceNodeId:
          nodes[
            expectIndex(tuple[1], nodes.length, childPath(path, 1))
          ].id,
        targetNodeId:
          nodes[
            expectIndex(tuple[2], nodes.length, childPath(path, 2))
          ].id,
      }
      const label = optionalStringSlot(tuple, 3, path)
      if (label !== undefined) relation.label = label
      Object.assign(relation, unpackAnnotations(tuple, 4, path))
      return relation
    },
  )

  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities,
    processes,
    boundaries,
    nodeRelations,
    mappings,
  }
}

function base64UrlLength(byteLength: number): number {
  const remainder = byteLength % 3
  return (
    Math.floor(byteLength / 3) * 4 +
    (remainder === 0 ? 0 : remainder + 1)
  )
}

function encodeBase64Url(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const hasSecond = index + 1 < bytes.length
    const hasThird = index + 2 < bytes.length
    const second = hasSecond ? bytes[index + 1] : 0
    const third = hasThird ? bytes[index + 2] : 0
    parts.push(
      BASE64URL_ALPHABET[first >> 2],
      BASE64URL_ALPHABET[((first & 0x03) << 4) | (second >> 4)],
    )
    if (hasSecond) {
      parts.push(
        BASE64URL_ALPHABET[((second & 0x0f) << 2) | (third >> 6)],
      )
    }
    if (hasThird) parts.push(BASE64URL_ALPHABET[third & 0x3f])
  }
  return parts.join('')
}

function base64Value(char: string): number {
  const code = char.charCodeAt(0)
  if (code >= 65 && code <= 90) return code - 65
  if (code >= 97 && code <= 122) return code - 97 + 26
  if (code >= 48 && code <= 57) return code - 48 + 52
  if (char === '-') return 62
  if (char === '_') return 63
  return -1
}

function decodeBase64Url(payload: string): Uint8Array | null {
  if (
    payload.length === 0 ||
    payload.length % 4 === 1 ||
    !BASE64URL_RE.test(payload)
  ) {
    return null
  }
  const bytes = new Uint8Array(Math.floor((payload.length * 6) / 8))
  let outputIndex = 0
  for (let index = 0; index < payload.length; index += 4) {
    const remaining = Math.min(4, payload.length - index)
    const first = base64Value(payload[index])
    const second = base64Value(payload[index + 1])
    const third = remaining >= 3 ? base64Value(payload[index + 2]) : 0
    const fourth = remaining === 4 ? base64Value(payload[index + 3]) : 0
    if (first < 0 || second < 0 || third < 0 || fourth < 0) return null
    if (remaining === 2 && (second & 0x0f) !== 0) return null
    if (remaining === 3 && (third & 0x03) !== 0) return null
    bytes[outputIndex++] = (first << 2) | (second >> 4)
    if (remaining >= 3) {
      bytes[outputIndex++] = ((second & 0x0f) << 4) | (third >> 2)
    }
    if (remaining === 4) {
      bytes[outputIndex++] = ((third & 0x03) << 6) | fourth
    }
  }
  return bytes
}

function createCompressionStream(): ByteTransform | null {
  const Constructor = globalThis.CompressionStream
  if (typeof Constructor !== 'function') return null
  try {
    return new Constructor('deflate') as unknown as ByteTransform
  } catch {
    return null
  }
}

function createDecompressionStream(): ByteTransform | null {
  const Constructor = globalThis.DecompressionStream
  if (typeof Constructor !== 'function') return null
  try {
    return new Constructor('deflate') as unknown as ByteTransform
  } catch {
    return null
  }
}

async function transformBytes(
  bytes: Uint8Array,
  transform: ByteTransform,
  exceedsLimit: (outputBytes: number) => boolean,
): Promise<TransformBytesResult> {
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  const reader = input.pipeThrough(transform).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (exceedsLimit(total)) {
      try {
        await reader.cancel()
      } catch {
        // Preserve the limit result instead of masking it with the stream error.
      }
      return { ok: false }
    }
    chunks.push(value)
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { ok: true, bytes: output }
}

function tupleDiagnostic(error: FieldWeftShareTupleError): FieldWeftDiagnostic {
  return {
    code: `share.${error.code}`,
    path: error.path,
    severity: 'error',
    message: error.message,
    ...(error.params ? { params: error.params } : {}),
  }
}

function unexpectedDiagnostic(error: unknown): FieldWeftDiagnostic {
  const reason = error instanceof Error ? error.message : String(error)
  return {
    code: 'share.encode',
    path: '',
    severity: 'error',
    message: `Failed to encode the shared snapshot: ${reason}`,
    params: { reason },
  }
}

function validationLimit(diagnostics: readonly FieldWeftDiagnostic[]): string | undefined {
  const diagnostic = diagnostics.find((item) => item.code.startsWith('limit.'))
  if (!diagnostic) return undefined
  const names: Record<string, string> = {
    'limit.nodes': 'FIELD_WEFT_MAX_NODES_V1',
    'limit.relations': 'FIELD_WEFT_MAX_RELATIONS_V1',
    'limit.fields': 'FIELD_WEFT_MAX_FIELDS_V1',
    'limit.field-depth': 'FIELD_WEFT_MAX_FIELD_DEPTH_V1',
    'limit.string.id': 'FIELD_WEFT_MAX_ID_CHARS_V1',
    'limit.string.name': 'FIELD_WEFT_MAX_NAME_CHARS_V1',
    'limit.string.label': 'FIELD_WEFT_MAX_LABEL_CHARS_V1',
    'limit.string.description': 'FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1',
    'limit.string.tag': 'FIELD_WEFT_MAX_TAG_CHARS_V1',
    'limit.tags-per-object': 'FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1',
    'limit.tags': 'FIELD_WEFT_MAX_TOTAL_TAGS_V1',
    'limit.string.meta-key': 'FIELD_WEFT_MAX_META_KEY_CHARS_V1',
    'limit.string.meta-value': 'FIELD_WEFT_MAX_META_STRING_CHARS_V1',
    'limit.meta-per-object': 'FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1',
    'limit.meta-entries': 'FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1',
    'limit.annotation-codepoints': 'FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1',
    'limit.canonical-bytes': 'FIELD_WEFT_MAX_CANONICAL_BYTES_V1',
    'limit.string.variant-value': 'FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1',
    'limit.variant-values': 'FIELD_WEFT_MAX_VARIANT_VALUES_V1',
  }
  return names[diagnostic.code] ?? diagnostic.code
}

function tupleLimit(error: FieldWeftShareTupleError): string | undefined {
  const names: Record<string, string> = {
    'pack.limit-nodes': 'FIELD_WEFT_MAX_NODES_V1',
    'pack.limit-relations': 'FIELD_WEFT_MAX_RELATIONS_V1',
    'pack.limit-fields': 'FIELD_WEFT_MAX_FIELDS_V1',
    'pack.limit-field-depth': 'FIELD_WEFT_MAX_FIELD_DEPTH_V1',
    'tuple.limit-nodes': 'FIELD_WEFT_MAX_NODES_V1',
    'tuple.limit-relations': 'FIELD_WEFT_MAX_RELATIONS_V1',
    'tuple.limit-fields': 'FIELD_WEFT_MAX_FIELDS_V1',
    'tuple.limit-field-depth': 'FIELD_WEFT_MAX_FIELD_DEPTH_V1',
  }
  return names[error.code]
}

/** Validates and canonicalizes an unknown FieldWeft document, then encodes a `d1.<payload>` token. */
export async function encodeFieldWeftShare(doc: unknown): Promise<FieldWeftShareEncodeResult> {
  try {
    const result = readCanonicalFieldWeftDoc(doc)
    if (!result.ok) {
      const limit = validationLimit(result.errors)
      return limit
        ? { kind: 'too-large', limit }
        : { kind: 'invalid', diagnostics: result.errors }
    }

    let packed: unknown[]
    try {
      packed = packFieldWeftShareDocV1(result.doc)
    } catch (error) {
      if (error instanceof FieldWeftShareTupleError) {
        const limit = tupleLimit(error)
        return limit
          ? { kind: 'too-large', limit }
          : { kind: 'invalid', diagnostics: [tupleDiagnostic(error)] }
      }
      return { kind: 'invalid', diagnostics: [unexpectedDiagnostic(error)] }
    }

    const jsonBytes = new TextEncoder().encode(JSON.stringify(packed))
    if (jsonBytes.byteLength > FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES) {
      return { kind: 'too-large', limit: 'FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES' }
    }
    const compression = createCompressionStream()
    if (!compression) {
      return { kind: 'unsupported', feature: 'CompressionStream(deflate)' }
    }

    let compressed: TransformBytesResult
    try {
      compressed = await transformBytes(
        jsonBytes,
        compression,
        (outputBytes) =>
          SHARE_TOKEN_PREFIX.length + base64UrlLength(outputBytes) >
          FIELD_WEFT_MAX_SHARE_TOKEN_CHARS,
      )
    } catch {
      return { kind: 'unsupported', feature: 'CompressionStream(deflate)' }
    }
    if (!compressed.ok) {
      return { kind: 'too-large', limit: 'FIELD_WEFT_MAX_SHARE_TOKEN_CHARS' }
    }
    const token = SHARE_TOKEN_PREFIX + encodeBase64Url(compressed.bytes)
    if (token.length > FIELD_WEFT_MAX_SHARE_TOKEN_CHARS) {
      return { kind: 'too-large', limit: 'FIELD_WEFT_MAX_SHARE_TOKEN_CHARS' }
    }
    return {
      kind: 'ok',
      token,
      tokenChars: token.length,
      jsonBytes: jsonBytes.byteLength,
    }
  } catch (error) {
    return { kind: 'invalid', diagnostics: [unexpectedDiagnostic(error)] }
  }
}

/** Decodes an external d1 token within limits into validated canonical FieldWeft. */
export async function decodeFieldWeftShare(token: string): Promise<FieldWeftShareDecodeResult> {
  try {
    if (typeof token !== 'string') return { kind: 'invalid', reason: 'token-type' }
    if (token.length > FIELD_WEFT_MAX_SHARE_TOKEN_CHARS) {
      return { kind: 'too-large', limit: 'FIELD_WEFT_MAX_SHARE_TOKEN_CHARS' }
    }
    const separator = token.indexOf('.')
    if (separator <= 0) return { kind: 'invalid', reason: 'envelope' }
    const format = token.slice(0, separator)
    if (format !== FIELD_WEFT_SHARE_FORMAT) return { kind: 'unsupported', format }
    const compressed = decodeBase64Url(token.slice(separator + 1))
    if (!compressed) return { kind: 'invalid', reason: 'base64url' }

    const decompression = createDecompressionStream()
    if (!decompression) {
      return {
        kind: 'unsupported',
        format: 'DecompressionStream(deflate)',
      }
    }
    let inflated: TransformBytesResult
    try {
      inflated = await transformBytes(
        compressed,
        decompression,
        (outputBytes) => outputBytes > FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES,
      )
    } catch {
      return { kind: 'invalid', reason: 'deflate' }
    }
    if (!inflated.ok) {
      return {
        kind: 'too-large',
        limit: 'FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES',
      }
    }

    let json: string
    try {
      json = new TextDecoder('utf-8', { fatal: true }).decode(inflated.bytes)
    } catch {
      return { kind: 'invalid', reason: 'utf8' }
    }
    let packed: unknown
    try {
      packed = JSON.parse(json)
    } catch {
      return { kind: 'invalid', reason: 'json' }
    }
    let doc: FieldWeftDocV1
    try {
      doc = unpackFieldWeftShareDocV1(packed)
    } catch (error) {
      if (error instanceof FieldWeftShareTupleError) {
        const limit = tupleLimit(error)
        return limit
          ? { kind: 'too-large', limit }
          : { kind: 'invalid', reason: error.code }
      }
      return { kind: 'invalid', reason: 'tuple' }
    }
    const result = readCanonicalFieldWeftDoc(doc)
    if (!result.ok) {
      const limit = validationLimit(result.errors)
      return limit
        ? { kind: 'too-large', limit }
        : { kind: 'invalid', reason: 'fieldweft', diagnostics: result.errors }
    }
    return { kind: 'ok', doc: result.doc }
  } catch {
    return { kind: 'invalid', reason: 'unexpected' }
  }
}
