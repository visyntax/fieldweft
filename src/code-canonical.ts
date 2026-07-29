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

function sorted(values: readonly string[]): string[] {
  return [...values].sort()
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
  if (value.description) out.description = value.description
  if (value.tags?.length) out.tags = sorted(value.tags)
  if (value.meta) {
    const meta = canonicalMeta(value.meta)
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
  if (field.array === true) out.array = true
  if (field.nullable === true) out.nullable = true
  if (field.pk === true) out.pk = true
  if (field.children?.length) out.children = field.children.map(canonicalField)
  if (field.discriminator) {
    out.discriminator = { values: [...field.discriminator.values] }
  }
  if (field.when) {
    const when = canonicalWhen(field.when)
    if (when) out.when = when
  }
  return out
}

function canonicalEntity(
  entity: ValidFieldWeftDocV1['entities'][number],
  index: number,
): CanonicalFieldWeftEntityV1 {
  const position = entity.position ?? defaultEntityPosition(index)
  const out: CanonicalFieldWeftEntityV1 = {
    id: entity.id,
    name: entity.name,
    kind: entity.kind,
    ...canonicalAnnotationProps(entity),
    position: { x: position.x, y: position.y },
    fields: entity.fields.map(canonicalField),
  }
  if (entity.collapsed?.length) out.collapsed = sorted(entity.collapsed)
  return out
}

function canonicalProcess(
  process: ValidFieldWeftDocV1['processes'][number],
  index: number,
): CanonicalFieldWeftProcessV1 {
  const position = process.position ?? defaultProcessPosition(index)
  const out: CanonicalFieldWeftProcessV1 = {
    id: process.id,
    name: process.name,
    kind: process.kind,
    ...canonicalAnnotationProps(process),
    position: { x: position.x, y: position.y },
    inputs: process.inputs.map(canonicalField),
    outputs: process.outputs.map(canonicalField),
  }
  return out
}

function canonicalBoundary(
  boundary: ValidFieldWeftDocV1['boundaries'][number],
  index: number,
): CanonicalFieldWeftBoundaryV1 {
  const position = boundary.position ?? defaultBoundaryPosition(index)
  const size = boundary.size ?? DEFAULT_BOUNDARY_SIZE
  const out: CanonicalFieldWeftBoundaryV1 = {
    id: boundary.id,
    name: boundary.name,
    ...canonicalAnnotationProps(boundary),
    position: { x: position.x, y: position.y },
    size: { width: size.width, height: size.height },
  }
  if (boundary.color) out.color = boundary.color
  if (boundary.kind) out.kind = boundary.kind
  if (boundary.members?.length) out.members = sorted(boundary.members)
  return out
}

function canonicalMapping(mapping: FieldWeftMappingV1): FieldWeftMappingV1 {
  const out: FieldWeftMappingV1 = {
    id: mapping.id,
    sourceFieldId: mapping.sourceFieldId,
    targetFieldId: mapping.targetFieldId,
  }
  if (mapping.kind && mapping.kind !== 'keep') out.kind = mapping.kind
  if (mapping.label) out.label = mapping.label
  Object.assign(out, canonicalAnnotationProps(mapping))
  return out
}

function canonicalNodeRelation(relation: FieldWeftNodeRelationV1): FieldWeftNodeRelationV1 {
  const out: FieldWeftNodeRelationV1 = {
    id: relation.id,
    sourceNodeId: relation.sourceNodeId,
    targetNodeId: relation.targetNodeId,
  }
  if (relation.label) out.label = relation.label
  Object.assign(out, canonicalAnnotationProps(relation))
  return out
}

export function canonicalizeFieldWeftDoc(doc: ValidFieldWeftDocV1): CanonicalFieldWeftDocV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: doc.entities.map(canonicalEntity),
    processes: doc.processes.map(canonicalProcess),
    boundaries: doc.boundaries.map(canonicalBoundary),
    nodeRelations: doc.nodeRelations.map(canonicalNodeRelation),
    mappings: doc.mappings.map(canonicalMapping),
  } as CanonicalFieldWeftDocV1
}

export function projectSemanticFieldWeftDoc(
  doc: CanonicalFieldWeftDocV1,
): FieldWeftSemanticProjectionV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: doc.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      kind: entity.kind,
      ...canonicalAnnotationProps(entity),
      fields: entity.fields.map(canonicalField),
    })),
    processes: doc.processes.map((process) => ({
      id: process.id,
      name: process.name,
      kind: process.kind,
      ...canonicalAnnotationProps(process),
      inputs: process.inputs.map(canonicalField),
      outputs: process.outputs.map(canonicalField),
    })),
    boundaries: doc.boundaries.map((boundary) => {
      const out: FieldWeftSemanticProjectionV1['boundaries'][number] = {
        id: boundary.id,
        name: boundary.name,
        ...canonicalAnnotationProps(boundary),
      }
      if (boundary.kind) out.kind = boundary.kind
      if (boundary.members?.length) out.members = [...boundary.members]
      return out
    }),
    nodeRelations: doc.nodeRelations.map(canonicalNodeRelation),
    mappings: doc.mappings.map(canonicalMapping),
  }
}

export function projectLayoutFieldWeftDoc(doc: CanonicalFieldWeftDocV1): FieldWeftLayoutProjectionV1 {
  return {
    format: FIELD_WEFT_FORMAT,
    version: FIELD_WEFT_VERSION_V1,
    entities: doc.entities.map((entity) => ({
      id: entity.id,
      position: { x: entity.position.x, y: entity.position.y },
      ...(entity.collapsed?.length ? { collapsed: [...entity.collapsed] } : {}),
    })),
    processes: doc.processes.map((process) => ({
      id: process.id,
      position: { x: process.position.x, y: process.position.y },
    })),
    boundaries: doc.boundaries.map((boundary) => ({
      id: boundary.id,
      position: { x: boundary.position.x, y: boundary.position.y },
      size: { width: boundary.size.width, height: boundary.size.height },
      ...(boundary.color ? { color: boundary.color } : {}),
    })),
  }
}
