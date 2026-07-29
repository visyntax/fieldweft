import type {
  FieldWeftFieldV1,
  FieldWeftMappingV1,
  FieldWeftMetadataV1,
  FieldWeftNodeRelationV1,
  FieldWeftWhenV1,
} from './fieldweft-v1.generated.js'
import type {
  CanonicalFieldWeftBoundaryV1,
  CanonicalFieldWeftDocV1,
  CanonicalFieldWeftEntityV1,
  CanonicalFieldWeftProcessV1,
  FieldWeftAnnotationsV1,
} from './code-model.js'

type JsonScalar = string | number | boolean | null
type JsonNode =
  | { kind: 'scalar'; value: JsonScalar }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'object'; entries: Array<readonly [string, JsonNode]> }

export type SerializeCanonicalFieldWeftDocOptions = {
  /** Indentation from 0 to 10 spaces, matching `JSON.stringify`; 0 or omission is compact. */
  space?: number | string
}

function scalar(value: JsonScalar): JsonNode {
  return { kind: 'scalar', value }
}

function array(items: JsonNode[]): JsonNode {
  return { kind: 'array', items }
}

function object(entries: Array<readonly [string, JsonNode]>): JsonNode {
  return { kind: 'object', entries }
}

function strings(values: readonly string[]): JsonNode {
  return array(values.map(scalar))
}

function annotations(
  value: FieldWeftAnnotationsV1,
): Array<readonly [string, JsonNode]> {
  const entries: Array<readonly [string, JsonNode]> = []
  if (value.description) entries.push(['description', scalar(value.description)])
  if (value.tags?.length) entries.push(['tags', strings(value.tags)])
  if (value.meta && Object.keys(value.meta).length) {
    entries.push(['meta', metadata(value.meta)])
  }
  return entries
}

function metadata(meta: FieldWeftMetadataV1): JsonNode {
  return object(
    Object.keys(meta)
      .sort()
      .map((key) => [key, scalar(meta[key])] as const),
  )
}

function when(value: FieldWeftWhenV1): JsonNode {
  return object(
    Object.keys(value)
      .sort()
      .map((key) => [key, strings(value[key])] as const),
  )
}

function field(value: FieldWeftFieldV1): JsonNode {
  const entries: Array<readonly [string, JsonNode]> = [
    ['id', scalar(value.id)],
    ['name', scalar(value.name)],
    ['type', scalar(value.type)],
    ...annotations(value),
  ]
  if (value.array) entries.push(['array', scalar(true)])
  if (value.nullable) entries.push(['nullable', scalar(true)])
  if (value.pk) entries.push(['pk', scalar(true)])
  if (value.children?.length) {
    entries.push(['children', array(value.children.map(field))])
  }
  if (value.discriminator) {
    entries.push([
      'discriminator',
      object([['values', strings(value.discriminator.values)]]),
    ])
  }
  if (value.when && Object.keys(value.when).length) {
    entries.push(['when', when(value.when)])
  }
  return object(entries)
}

function position(value: { x: number; y: number }): JsonNode {
  return object([
    ['x', scalar(value.x)],
    ['y', scalar(value.y)],
  ])
}

function size(value: { width: number; height: number }): JsonNode {
  return object([
    ['width', scalar(value.width)],
    ['height', scalar(value.height)],
  ])
}

function entity(value: CanonicalFieldWeftEntityV1): JsonNode {
  const entries: Array<readonly [string, JsonNode]> = [
    ['id', scalar(value.id)],
    ['name', scalar(value.name)],
    ['kind', scalar(value.kind)],
    ...annotations(value),
    ['position', position(value.position)],
    ['fields', array(value.fields.map(field))],
  ]
  if (value.collapsed?.length) {
    entries.push(['collapsed', strings(value.collapsed)])
  }
  return object(entries)
}

function process(value: CanonicalFieldWeftProcessV1): JsonNode {
  return object([
    ['id', scalar(value.id)],
    ['name', scalar(value.name)],
    ['kind', scalar(value.kind)],
    ...annotations(value),
    ['position', position(value.position)],
    ['inputs', array(value.inputs.map(field))],
    ['outputs', array(value.outputs.map(field))],
  ])
}

function boundary(value: CanonicalFieldWeftBoundaryV1): JsonNode {
  const entries: Array<readonly [string, JsonNode]> = [
    ['id', scalar(value.id)],
    ['name', scalar(value.name)],
  ]
  if (value.color) entries.push(['color', scalar(value.color)])
  if (value.kind) entries.push(['kind', scalar(value.kind)])
  entries.push(...annotations(value))
  entries.push(['position', position(value.position)])
  entries.push(['size', size(value.size)])
  if (value.members?.length) entries.push(['members', strings(value.members)])
  return object(entries)
}

function nodeRelation(value: FieldWeftNodeRelationV1): JsonNode {
  const entries: Array<readonly [string, JsonNode]> = [
    ['id', scalar(value.id)],
    ['sourceNodeId', scalar(value.sourceNodeId)],
    ['targetNodeId', scalar(value.targetNodeId)],
  ]
  if (value.label) entries.push(['label', scalar(value.label)])
  entries.push(...annotations(value))
  return object(entries)
}

function mapping(value: FieldWeftMappingV1): JsonNode {
  const entries: Array<readonly [string, JsonNode]> = [
    ['id', scalar(value.id)],
    ['sourceFieldId', scalar(value.sourceFieldId)],
    ['targetFieldId', scalar(value.targetFieldId)],
  ]
  if (value.kind) entries.push(['kind', scalar(value.kind)])
  if (value.label) entries.push(['label', scalar(value.label)])
  entries.push(...annotations(value))
  return object(entries)
}

function documentNode(doc: CanonicalFieldWeftDocV1): JsonNode {
  return object([
    ['format', scalar(doc.format)],
    ['version', scalar(doc.version)],
    ['entities', array(doc.entities.map(entity))],
    ['processes', array(doc.processes.map(process))],
    ['boundaries', array(doc.boundaries.map(boundary))],
    ['nodeRelations', array(doc.nodeRelations.map(nodeRelation))],
    ['mappings', array(doc.mappings.map(mapping))],
  ])
}

function indentation(space: number | string | undefined): string {
  if (typeof space === 'number') return ' '.repeat(Math.min(10, Math.max(0, Math.trunc(space))))
  return typeof space === 'string' ? space.slice(0, 10) : ''
}

function render(node: JsonNode, indent: string, depth: number): string {
  if (node.kind === 'scalar') {
    const text = JSON.stringify(node.value)
    if (text === undefined) {
      throw new TypeError('JSON scalar cannot be serialized.')
    }
    return text
  }
  if (node.kind === 'array') {
    if (!node.items.length) return '[]'
    if (!indent) return `[${node.items.map((item) => render(item, indent, depth + 1)).join(',')}]`
    const childIndent = indent.repeat(depth + 1)
    const currentIndent = indent.repeat(depth)
    return `[\n${node.items
      .map((item) => `${childIndent}${render(item, indent, depth + 1)}`)
      .join(',\n')}\n${currentIndent}]`
  }
  if (!node.entries.length) return '{}'
  if (!indent) {
    return `{${node.entries
      .map(([key, value]) => `${JSON.stringify(key)}:${render(value, indent, depth + 1)}`)
      .join(',')}}`
  }
  const childIndent = indent.repeat(depth + 1)
  const currentIndent = indent.repeat(depth)
  return `{\n${node.entries
    .map(
      ([key, value]) =>
        `${childIndent}${JSON.stringify(key)}: ${render(value, indent, depth + 1)}`,
    )
    .join(',\n')}\n${currentIndent}}`
}

/**
 * FieldWeft canonical JSON serializer with fixed schema-property order and
 * UTF-16 ordinal ordering for user-keyed maps.
 */
export function serializeCanonicalFieldWeftDoc(
  doc: CanonicalFieldWeftDocV1,
  options: SerializeCanonicalFieldWeftDocOptions = {},
): string {
  return render(documentNode(doc), indentation(options.space), 0)
}

export function canonicalFieldWeftDocUtf8Bytes(doc: CanonicalFieldWeftDocV1): number {
  return new TextEncoder().encode(serializeCanonicalFieldWeftDoc(doc)).byteLength
}
