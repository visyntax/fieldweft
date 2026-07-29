import { projectSemanticFieldWeftDoc } from './code-canonical.js'
import type {
  FieldWeftFieldV1,
  FieldWeftId,
  FieldWeftMetadataV1,
  FieldWeftMetadataValueV1,
} from './fieldweft-v1.generated.js'
import type {
  CanonicalFieldWeftDocV1,
  FieldWeftAnnotationsV1,
  FieldWeftSemanticProjectionV1,
} from './code-model.js'

export type FieldWeftSemanticObjectKindV1 =
  | 'entity'
  | 'process'
  | 'boundary'
  | 'field'
  | 'nodeRelation'
  | 'mapping'

export type FieldWeftFieldOwnerKindV1 = 'entity' | 'process-input' | 'process-output'

export type FieldWeftFieldLocationV1 = {
  ownerKind: FieldWeftFieldOwnerKindV1
  ownerId: string
  parentFieldId?: FieldWeftId
  index: number
}

export type FieldWeftSemanticStructuralChangeV1 =
  | {
      kind: 'add' | 'remove'
      object: FieldWeftSemanticObjectKindV1
      id: string
      location?: FieldWeftFieldLocationV1
    }
  | {
      kind: 'rename'
      object: 'entity' | 'process' | 'boundary' | 'field'
      id: string
      before: string
      after: string
    }
  | {
      kind: 'move'
      object: 'field'
      id: FieldWeftId
      before: FieldWeftFieldLocationV1
      after: FieldWeftFieldLocationV1
    }
  | {
      kind: 'reorder'
      object: FieldWeftSemanticObjectKindV1
      scope: string
      beforeIds: string[]
      afterIds: string[]
    }
  | {
      kind: 'property'
      object: FieldWeftSemanticObjectKindV1
      id: string
      property: string
      before: unknown
      after: unknown
    }
  | {
      kind: 'tag'
      object: FieldWeftSemanticObjectKindV1
      id: string
      action: 'add' | 'remove'
      tag: string
    }
  | {
      kind: 'meta'
      object: FieldWeftSemanticObjectKindV1
      id: string
      action: 'add' | 'remove' | 'update'
      key: string
      before?: FieldWeftMetadataValueV1
      after?: FieldWeftMetadataValueV1
    }

type Identified = { id: string }
type Named = Identified & { name: string }

type FieldEntry = {
  field: FieldWeftFieldV1
  location: FieldWeftFieldLocationV1
}

type FieldStructure = {
  entries: Map<FieldWeftId, FieldEntry>
  groups: Map<string, FieldWeftId[]>
}

function sameValue(before: unknown, after: unknown): boolean {
  if (before === after) return true
  if (Array.isArray(before) || Array.isArray(after)) {
    return (
      Array.isArray(before) &&
      Array.isArray(after) &&
      before.length === after.length &&
      before.every((value, index) => sameValue(value, after[index]))
    )
  }
  if (
    typeof before === 'object' &&
    before !== null &&
    typeof after === 'object' &&
    after !== null
  ) {
    const beforeRecord = before as Record<string, unknown>
    const afterRecord = after as Record<string, unknown>
    const beforeKeys = Object.keys(beforeRecord).sort()
    const afterKeys = Object.keys(afterRecord).sort()
    return (
      sameIds(beforeKeys, afterKeys) &&
      beforeKeys.every((key) => sameValue(beforeRecord[key], afterRecord[key]))
    )
  }
  return false
}

function sameIds(before: readonly string[], after: readonly string[]): boolean {
  return (
    before.length === after.length &&
    before.every((id, index) => id === after[index])
  )
}

function byId<T extends Identified>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

function fieldScope(location: Omit<FieldWeftFieldLocationV1, 'index'>): string {
  return `${location.ownerKind}:${location.ownerId}:${location.parentFieldId ?? '$root'}`
}

function sameFieldParent(before: FieldWeftFieldLocationV1, after: FieldWeftFieldLocationV1): boolean {
  return (
    before.ownerKind === after.ownerKind &&
    before.ownerId === after.ownerId &&
    before.parentFieldId === after.parentFieldId
  )
}

function indexFields(doc: FieldWeftSemanticProjectionV1): FieldStructure {
  const entries = new Map<FieldWeftId, FieldEntry>()
  const groups = new Map<string, FieldWeftId[]>()
  const walk = (
    fields: readonly FieldWeftFieldV1[],
    ownerKind: FieldWeftFieldOwnerKindV1,
    ownerId: string,
    parentFieldId?: FieldWeftId,
  ) => {
    const scope = fieldScope({ ownerKind, ownerId, parentFieldId })
    groups.set(
      scope,
      fields.map((field) => field.id),
    )
    fields.forEach((field, index) => {
      entries.set(field.id, {
        field,
        location: { ownerKind, ownerId, parentFieldId, index },
      })
      if (field.children?.length) {
        walk(field.children, ownerKind, ownerId, field.id)
      }
    })
  }

  for (const entity of doc.entities) {
    walk(entity.fields, 'entity', entity.id)
  }
  for (const process of doc.processes) {
    walk(process.inputs, 'process-input', process.id)
    walk(process.outputs, 'process-output', process.id)
  }
  return { entries, groups }
}

function addPropertyChanges<T extends Identified>(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: FieldWeftSemanticObjectKindV1,
  before: T,
  after: T,
  properties: readonly (keyof T & string)[],
): void {
  for (const property of properties) {
    if (sameValue(before[property], after[property])) continue
    changes.push({
      kind: 'property',
      object,
      id: before.id,
      property,
      before: before[property],
      after: after[property],
    })
  }
}

function addTagChanges(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: FieldWeftSemanticObjectKindV1,
  id: string,
  before: readonly string[] | undefined,
  after: readonly string[] | undefined,
): void {
  const beforeSet = new Set(before ?? [])
  const afterSet = new Set(after ?? [])
  for (const tag of before ?? []) {
    if (!afterSet.has(tag)) {
      changes.push({ kind: 'tag', object, id, action: 'remove', tag })
    }
  }
  for (const tag of after ?? []) {
    if (!beforeSet.has(tag)) {
      changes.push({ kind: 'tag', object, id, action: 'add', tag })
    }
  }
}

function addMetaChanges(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: FieldWeftSemanticObjectKindV1,
  id: string,
  before: FieldWeftMetadataV1 | undefined,
  after: FieldWeftMetadataV1 | undefined,
): void {
  const beforeMeta = before ?? {}
  const afterMeta = after ?? {}
  const keys = new Set([
    ...Object.keys(beforeMeta),
    ...Object.keys(afterMeta),
  ])
  for (const key of [...keys].sort()) {
    const hadBefore = Object.prototype.hasOwnProperty.call(beforeMeta, key)
    const hasAfter = Object.prototype.hasOwnProperty.call(afterMeta, key)
    if (!hadBefore && hasAfter) {
      changes.push({
        kind: 'meta',
        object,
        id,
        action: 'add',
        key,
        after: afterMeta[key],
      })
    } else if (hadBefore && !hasAfter) {
      changes.push({
        kind: 'meta',
        object,
        id,
        action: 'remove',
        key,
        before: beforeMeta[key],
      })
    } else if (!sameValue(beforeMeta[key], afterMeta[key])) {
      changes.push({
        kind: 'meta',
        object,
        id,
        action: 'update',
        key,
        before: beforeMeta[key],
        after: afterMeta[key],
      })
    }
  }
}

function addAnnotationChanges(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: FieldWeftSemanticObjectKindV1,
  before: Identified & FieldWeftAnnotationsV1,
  after: Identified & FieldWeftAnnotationsV1,
): void {
  if (before.description !== after.description) {
    changes.push({
      kind: 'property',
      object,
      id: before.id,
      property: 'description',
      before: before.description,
      after: after.description,
    })
  }
  addTagChanges(changes, object, before.id, before.tags, after.tags)
  addMetaChanges(changes, object, before.id, before.meta, after.meta)
}

function addCollectionReorder(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: FieldWeftSemanticObjectKindV1,
  scope: string,
  before: readonly Identified[],
  after: readonly Identified[],
): void {
  const beforeSet = new Set(before.map((item) => item.id))
  const afterSet = new Set(after.map((item) => item.id))
  const beforeIds = before.map((item) => item.id).filter((id) => afterSet.has(id))
  const afterIds = after.map((item) => item.id).filter((id) => beforeSet.has(id))
  if (!sameIds(beforeIds, afterIds)) {
    changes.push({ kind: 'reorder', object, scope, beforeIds, afterIds })
  }
}

function diffNamedCollection<T extends Named & FieldWeftAnnotationsV1>(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: 'entity' | 'process' | 'boundary',
  scope: string,
  before: readonly T[],
  after: readonly T[],
  properties: readonly (keyof T & string)[],
): void {
  const beforeById = byId(before)
  const afterById = byId(after)
  for (const item of before) {
    if (!afterById.has(item.id)) {
      changes.push({ kind: 'remove', object, id: item.id })
    }
  }
  for (const item of after) {
    if (!beforeById.has(item.id)) {
      changes.push({ kind: 'add', object, id: item.id })
    }
  }
  for (const item of before) {
    const next = afterById.get(item.id)
    if (!next) continue
    if (item.name !== next.name) {
      changes.push({
        kind: 'rename',
        object,
        id: item.id,
        before: item.name,
        after: next.name,
      })
    }
    addPropertyChanges(changes, object, item, next, properties)
    addAnnotationChanges(changes, object, item, next)
  }
  addCollectionReorder(changes, object, scope, before, after)
}

function diffRelations<T extends { id: string } & FieldWeftAnnotationsV1>(
  changes: FieldWeftSemanticStructuralChangeV1[],
  object: 'nodeRelation' | 'mapping',
  scope: 'nodeRelations' | 'mappings',
  before: readonly T[],
  after: readonly T[],
  properties: readonly (keyof T & string)[],
): void {
  const beforeById = byId(before)
  const afterById = byId(after)
  for (const relation of before) {
    if (!afterById.has(relation.id)) {
      changes.push({ kind: 'remove', object, id: relation.id })
    }
  }
  for (const relation of after) {
    if (!beforeById.has(relation.id)) {
      changes.push({ kind: 'add', object, id: relation.id })
    }
  }
  for (const relation of before) {
    const next = afterById.get(relation.id)
    if (!next) continue
    addPropertyChanges(changes, object, relation, next, properties)
    addAnnotationChanges(changes, object, relation, next)
  }
  addCollectionReorder(changes, object, scope, before, after)
}

function diffFields(
  changes: FieldWeftSemanticStructuralChangeV1[],
  before: FieldWeftSemanticProjectionV1,
  after: FieldWeftSemanticProjectionV1,
): void {
  const beforeStructure = indexFields(before)
  const afterStructure = indexFields(after)
  for (const [id, entry] of beforeStructure.entries) {
    if (!afterStructure.entries.has(id)) {
      changes.push({
        kind: 'remove',
        object: 'field',
        id,
        location: entry.location,
      })
    }
  }
  for (const [id, entry] of afterStructure.entries) {
    if (!beforeStructure.entries.has(id)) {
      changes.push({
        kind: 'add',
        object: 'field',
        id,
        location: entry.location,
      })
    }
  }
  for (const [id, entry] of beforeStructure.entries) {
    const next = afterStructure.entries.get(id)
    if (!next) continue
    if (!sameFieldParent(entry.location, next.location)) {
      changes.push({
        kind: 'move',
        object: 'field',
        id,
        before: entry.location,
        after: next.location,
      })
    }
    if (entry.field.name !== next.field.name) {
      changes.push({
        kind: 'rename',
        object: 'field',
        id,
        before: entry.field.name,
        after: next.field.name,
      })
    }
    addPropertyChanges(changes, 'field', entry.field, next.field, [
      'type',
      'array',
      'nullable',
      'pk',
      'discriminator',
      'when',
    ])
    addAnnotationChanges(changes, 'field', entry.field, next.field)
  }

  const scopes = new Set([
    ...beforeStructure.groups.keys(),
    ...afterStructure.groups.keys(),
  ])
  for (const scope of scopes) {
    const beforeIds = beforeStructure.groups.get(scope) ?? []
    const afterIds = afterStructure.groups.get(scope) ?? []
    const beforeCommon = beforeIds.filter((id) => {
      const next = afterStructure.entries.get(id)
      return next && fieldScope(next.location) === scope
    })
    const afterCommon = afterIds.filter((id) => {
      const previous = beforeStructure.entries.get(id)
      return previous && fieldScope(previous.location) === scope
    })
    if (!sameIds(beforeCommon, afterCommon)) {
      changes.push({
        kind: 'reorder',
        object: 'field',
        scope,
        beforeIds: beforeCommon,
        afterIds: afterCommon,
      })
    }
  }
}

/** Compares two semantic v1 projections by stable ID after layout noise is removed. */
export function diffFieldWeftSemanticProjections(
  before: FieldWeftSemanticProjectionV1,
  after: FieldWeftSemanticProjectionV1,
): FieldWeftSemanticStructuralChangeV1[] {
  const changes: FieldWeftSemanticStructuralChangeV1[] = []
  diffNamedCollection(
    changes,
    'entity',
    'entities',
    before.entities,
    after.entities,
    ['kind'],
  )
  diffNamedCollection(
    changes,
    'process',
    'processes',
    before.processes,
    after.processes,
    ['kind'],
  )
  diffNamedCollection(
    changes,
    'boundary',
    'boundaries',
    before.boundaries,
    after.boundaries,
    ['kind', 'members'],
  )
  diffFields(changes, before, after)
  diffRelations(
    changes,
    'nodeRelation',
    'nodeRelations',
    before.nodeRelations,
    after.nodeRelations,
    ['sourceNodeId', 'targetNodeId', 'label'],
  )
  diffRelations(
    changes,
    'mapping',
    'mappings',
    before.mappings,
    after.mappings,
    ['sourceFieldId', 'targetFieldId', 'kind', 'label'],
  )
  return changes
}

/** Diffs canonical snapshots structurally while intentionally ignoring layout projection. */
export function diffCanonicalFieldWeftDocs(
  before: CanonicalFieldWeftDocV1,
  after: CanonicalFieldWeftDocV1,
): FieldWeftSemanticStructuralChangeV1[] {
  return diffFieldWeftSemanticProjections(
    projectSemanticFieldWeftDoc(before),
    projectSemanticFieldWeftDoc(after),
  )
}
