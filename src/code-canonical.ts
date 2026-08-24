import {
  FIELD_WEFT_FORMAT,
  FIELD_WEFT_VERSION_V1,
  type FieldWeftFieldV1,
  type FieldWeftMappingV1,
  type FieldWeftMetadataV1,
  type FieldWeftNodeRelationV1,
  type FieldWeftWhenV1,
} from './fieldweft-v1.generated.js'
import {
  type CanonicalFieldWeftBoundaryV1,
  type CanonicalFieldWeftDocV1,
  type CanonicalFieldWeftEntityV1,
  type CanonicalFieldWeftProcessV1,
  type FieldWeftAnnotationsV1,
  type FieldWeftLayoutProjectionV1,
  type FieldWeftSemanticProjectionV1,
  type ValidFieldWeftDocV1,
} from './code-model.js'
import {
  DEFAULT_BOUNDARY_SIZE,
  defaultBoundaryPosition,
  defaultEntityPosition,
  defaultProcessPosition,
} from './code-layout.js'
import { getOwnEnumerableProperty } from './code-property.js'

function mapArray<Input, Output>(
  values: readonly Input[],
  map: (value: Input, index: number) => Output,
): Output[] {
  const out = new Array<Output>(values.length)
  for (let index = 0; index < values.length; index++) {
    out[index] = map(values[index], index)
  }
  return out
}

function copyArray<Value>(values: readonly Value[]): Value[] {
  return mapArray(values, (value) => value)
}

function sorted(values: readonly string[]): string[] {
  return copyArray(values).sort()
}

function canonicalMeta(meta: FieldWeftMetadataV1): FieldWeftMetadataV1 | undefined {
  const keys = Object.keys(meta).sort()
  if (!keys.length) return undefined
  const out = Object.create(null) as FieldWeftMetadataV1
  for (const key of keys) {
    const value = meta[key]
    out[key] =
      typeof value === 'number' && Object.is(value, -0) ? 0 : value
  }
  return out
}

function canonicalAnnotationProps(
  value: FieldWeftAnnotationsV1,
): FieldWeftAnnotationsV1 {
  const out: FieldWeftAnnotationsV1 = {}
  const description = getOwnEnumerableProperty(value, 'description')
  const tags = getOwnEnumerableProperty(value, 'tags')
  const inputMeta = getOwnEnumerableProperty(value, 'meta')
  if (description) out.description = description
  if (tags?.length) out.tags = sorted(tags)
  if (inputMeta) {
    const meta = canonicalMeta(inputMeta)
    if (meta) out.meta = meta
  }
  return out
}

function canonicalWhen(when: FieldWeftWhenV1): FieldWeftWhenV1 | undefined {
  const keys = Object.keys(when).sort()
  if (!keys.length) return undefined
  const out = Object.create(null) as FieldWeftWhenV1
  for (const key of keys) out[key] = sorted(when[key])
  return out
}

function canonicalField(field: FieldWeftFieldV1): FieldWeftFieldV1 {
  const out: FieldWeftFieldV1 = {
    id: field.id,
    name: field.name,
    type: field.type,
    ...canonicalAnnotationProps(field),
  }
  const children = getOwnEnumerableProperty(field, 'children')
  const discriminator = getOwnEnumerableProperty(field, 'discriminator')
  const inputWhen = getOwnEnumerableProperty(field, 'when')
  if (getOwnEnumerableProperty(field, 'array') === true) out.array = true
  if (getOwnEnumerableProperty(field, 'nullable') === true) out.nullable = true
  if (getOwnEnumerableProperty(field, 'pk') === true) out.pk = true
  if (children?.length) out.children = mapArray(children, canonicalField)
  if (discriminator) {
    out.discriminator = { values: copyArray(discriminator.values) }
  }
  if (inputWhen) {
    const when = canonicalWhen(inputWhen)
    if (when) out.when = when
  }
  return out
}

function canonicalEntity(
  entity: ValidFieldWeftDocV1['entities'][number],
  index: number,
): CanonicalFieldWeftEntityV1 {
  const position =
    getOwnEnumerableProperty(entity, 'position') ?? defaultEntityPosition(index)
  const collapsed = getOwnEnumerableProperty(entity, 'collapsed')
  const out: CanonicalFieldWeftEntityV1 = {
    id: entity.id,
    name: entity.name,
    kind: entity.kind,
    ...canonicalAnnotationProps(entity),
    position: { x: position.x, y: position.y },
    fields: mapArray(entity.fields, canonicalField),
  }
  if (collapsed?.length) out.collapsed = sorted(collapsed)
  return out
}

function canonicalProcess(
  process: ValidFieldWeftDocV1['processes'][number],
  index: number,
): CanonicalFieldWeftProcessV1 {
  const position =
    getOwnEnumerableProperty(process, 'position') ?? defaultProcessPosition(index)
  const out: CanonicalFieldWeftProcessV1 = {
    id: process.id,
    name: process.name,
    kind: process.kind,
    ...canonicalAnnotationProps(process),
    position: { x: position.x, y: position.y },
    inputs: mapArray(process.inputs, canonicalField),
    outputs: mapArray(process.outputs, canonicalField),
  }
  return out
}

function canonicalBoundary(
  boundary: ValidFieldWeftDocV1['boundaries'][number],
  index: number,
): CanonicalFieldWeftBoundaryV1 {
  const position =
    getOwnEnumerableProperty(boundary, 'position') ??
    defaultBoundaryPosition(index)
  const size =
    getOwnEnumerableProperty(boundary, 'size') ?? DEFAULT_BOUNDARY_SIZE
  const color = getOwnEnumerableProperty(boundary, 'color')
  const kind = getOwnEnumerableProperty(boundary, 'kind')
  const members = getOwnEnumerableProperty(boundary, 'members')
  const out: CanonicalFieldWeftBoundaryV1 = {
    id: boundary.id,
    name: boundary.name,
    ...canonicalAnnotationProps(boundary),
    position: { x: position.x, y: position.y },
    size: { width: size.width, height: size.height },
  }
  if (color) out.color = color
  if (kind) out.kind = kind
  if (members?.length) out.members = sorted(members)
  return out
}

function canonicalMapping(mapping: FieldWeftMappingV1): FieldWeftMappingV1 {
  const kind = getOwnEnumerableProperty(mapping, 'kind')
  const label = getOwnEnumerableProperty(mapping, 'label')
  const out: FieldWeftMappingV1 = {
    id: mapping.id,
    sourceFieldId: mapping.sourceFieldId,
    targetFieldId: mapping.targetFieldId,
  }
  if (kind && kind !== 'keep') out.kind = kind
  if (label) out.label = label
  Object.assign(out, canonicalAnnotationProps(mapping))
  return out
}

function canonicalNodeRelation(relation: FieldWeftNodeRelationV1): FieldWeftNodeRelationV1 {
  const label = getOwnEnumerableProperty(relation, 'label')
  const out: FieldWeftNodeRelationV1 = {
    id: relation.id,
    sourceNodeId: relation.sourceNodeId,
    targetNodeId: relation.targetNodeId,
  }
  if (label) out.label = label
  Object.assign(out, canonicalAnnotationProps(relation))
  return out
}

export function canonicalizeFieldWeftDoc(doc: ValidFieldWeftDocV1): CanonicalFieldWeftDocV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: mapArray(doc.entities, canonicalEntity),
    processes: mapArray(doc.processes, canonicalProcess),
    boundaries: mapArray(doc.boundaries, canonicalBoundary),
    nodeRelations: mapArray(doc.nodeRelations, canonicalNodeRelation),
    mappings: mapArray(doc.mappings, canonicalMapping),
  } as CanonicalFieldWeftDocV1
}

export function projectSemanticFieldWeftDoc(
  doc: CanonicalFieldWeftDocV1,
): FieldWeftSemanticProjectionV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: mapArray(doc.entities, (entity) => ({
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      ...canonicalAnnotationProps(entity),
      fields: mapArray(entity.fields, canonicalField),
    })),
    processes: mapArray(doc.processes, (process) => ({
      id: process.id,
      name: process.name,
      kind: process.kind,
      ...canonicalAnnotationProps(process),
      inputs: mapArray(process.inputs, canonicalField),
      outputs: mapArray(process.outputs, canonicalField),
    })),
    boundaries: mapArray(doc.boundaries, (boundary) => {
      const out: FieldWeftSemanticProjectionV1['boundaries'][number] = {
        id: boundary.id,
        name: boundary.name,
        ...canonicalAnnotationProps(boundary),
      }
      if (boundary.kind) out.kind = boundary.kind
      if (boundary.members?.length) out.members = copyArray(boundary.members)
      return out
    }),
    nodeRelations: mapArray(doc.nodeRelations, canonicalNodeRelation),
    mappings: mapArray(doc.mappings, canonicalMapping),
  }
}

export function projectLayoutFieldWeftDoc(doc: CanonicalFieldWeftDocV1): FieldWeftLayoutProjectionV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: mapArray(doc.entities, (entity) => ({
      id: entity.id,
      position: { x: entity.position.x, y: entity.position.y },
      ...(entity.collapsed?.length ? { collapsed: copyArray(entity.collapsed) } : {}),
    })),
    processes: mapArray(doc.processes, (process) => ({
      id: process.id,
      position: { x: process.position.x, y: process.position.y },
    })),
    boundaries: mapArray(doc.boundaries, (boundary) => ({
      id: boundary.id,
      position: { x: boundary.position.x, y: boundary.position.y },
      size: { width: boundary.size.width, height: boundary.size.height },
      ...(boundary.color ? { color: boundary.color } : {}),
    })),
  }
}
