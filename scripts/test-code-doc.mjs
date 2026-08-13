import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { validateJsonSchema } from './json-schema-subset.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const node = process.execPath
const schemaCheck = spawnSync(
  node,
  [join(root, 'scripts', 'generate-fieldweft-types.mjs'), '--check'],
  { cwd: root, encoding: 'utf8' },
)
if (schemaCheck.status !== 0) {
  process.stderr.write(schemaCheck.stdout)
  process.stderr.write(schemaCheck.stderr)
  process.exit(schemaCheck.status ?? 1)
}

const {
  FIELD_WEFT_BOUNDARY_COLORS_V1,
  FIELD_WEFT_BOUNDARY_KINDS_V1,
  FIELD_WEFT_ENTITY_KINDS_V1,
  FIELD_WEFT_FIELD_TYPES_V1,
  FIELD_WEFT_MAPPING_KINDS_V1,
  FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
  FIELD_WEFT_MAX_FIELD_DEPTH_V1,
  FIELD_WEFT_MAX_FIELDS_V1,
  FIELD_WEFT_MAX_ID_CHARS_V1,
  FIELD_WEFT_MAX_LABEL_CHARS_V1,
  FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1,
  FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1,
  FIELD_WEFT_MAX_META_KEY_CHARS_V1,
  FIELD_WEFT_MAX_META_STRING_CHARS_V1,
  FIELD_WEFT_MAX_NAME_CHARS_V1,
  FIELD_WEFT_MAX_TAG_CHARS_V1,
  FIELD_WEFT_MAX_TOTAL_TAGS_V1,
  FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1,
  FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1,
  FIELD_WEFT_MAX_VARIANT_VALUES_V1,
  FIELD_WEFT_MAX_COORD_V1,
  FIELD_WEFT_RESERVED_IDS,
  FIELD_WEFT_RESERVED_META_KEYS,
} = await import('../dist/index.js')
const { readFieldWeftDoc, validateFieldWeftDocV1 } = await import('../dist/index.js')
const {
  canonicalizeFieldWeftDoc,
  projectLayoutFieldWeftDoc,
  projectSemanticFieldWeftDoc,
} = await import('../dist/index.js')
const { diffCanonicalFieldWeftDocs } = await import('../dist/index.js')
const {
  allocateFieldId,
  FIELD_ID_SLUG_MAX_CHARS,
  FIELD_ID_SUFFIX_ALPHABET,
  FIELD_ID_SUFFIX_LENGTH,
  fieldIdSlug,
} = await import('../dist/index.js')
const { readCanonicalFieldWeftDoc } = await import('../dist/index.js')
const { serializeCanonicalFieldWeftDoc } = await import('../dist/index.js')
const { deterministicAdapterId } = await import('../dist/adapter-reference.js')
const fieldWeftSchema = JSON.parse(
  readFileSync(join(root, 'schema', 'fieldweft-v1.schema.json'), 'utf8'),
)

function makeValidDoc() {
  return {
    format: 'fieldweft',
    version: 1,
    entities: [
      {
        id: 'order',
        name: 'Order',
        kind: 'event',
        position: { x: 120, y: 80 },
        fields: [
          {
            id: 'status_f',
            name: 'status',
            type: 'string',
            array: false,
            nullable: false,
            pk: false,
            discriminator: { values: ['CLOSED', 'OPEN'] },
          },
          {
            id: 'channel_f',
            name: 'channel',
            type: 'string',
            discriminator: { values: ['WEB', 'APP'] },
          },
          {
            id: 'metadata_f',
            name: 'metadata',
            type: 'object',
            children: [],
          },
          {
            id: 'details_f',
            name: 'details',
            type: 'object',
            children: [
              { id: 'amount_f', name: 'amount', type: 'number', nullable: false },
            ],
          },
          {
            id: 'note_f',
            name: 'note',
            type: 'string',
            when: {
              status_f: ['OPEN', 'CLOSED'],
              channel_f: ['WEB', 'APP'],
            },
          },
        ],
        collapsed: ['metadata_f', 'details_f'],
      },
    ],
    processes: [
      {
        id: 'normalize',
        name: 'Normalize',
        kind: 'api',
        position: { x: 420, y: 80 },
        inputs: [{ id: 'process_in_f', name: 'input', type: 'number' }],
        outputs: [{ id: 'process_out_f', name: 'output', type: 'string' }],
      },
    ],
    boundaries: [
      {
        id: 'domain',
        name: 'Domain',
        color: 'blue',
        kind: 'domain',
        description: '',
        position: { x: 20, y: 20 },
        size: { width: 720, height: 420 },
        members: ['order', 'normalize'],
      },
    ],
    nodeRelations: [],
    mappings: [
      {
        id: 'map_in',
        sourceFieldId: 'amount_f',
        targetFieldId: 'process_in_f',
        kind: 'keep',
        label: '',
      },
      {
        id: 'map_out',
        sourceFieldId: 'process_out_f',
        targetFieldId: 'note_f',
        kind: 'transform',
      },
    ],
  }
}

function errorWithCode(result, code) {
  assert.equal(result.ok, false, `expected invalid result containing ${code}`)
  const diagnostic = result.errors.find((error) => error.code === code)
  assert.ok(diagnostic, `missing diagnostic ${code}`)
  assert.equal(diagnostic.severity, 'error')
  return diagnostic
}

function validDoc(doc) {
  const result = validateFieldWeftDocV1(doc)
  if (!result.ok) {
    assert.fail(`expected valid FieldWeft:\n${JSON.stringify(result.errors, null, 2)}`)
  }
  return result.doc
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value
  seen.add(value)
  for (const child of Object.values(value)) deepFreeze(child, seen)
  return Object.freeze(value)
}

function movePropertyOutsideJson(value, key, mode) {
  assert.equal(Object.prototype.propertyIsEnumerable.call(value, key), true)
  const propertyValue = value[key]
  delete value[key]
  if (mode === 'inherited') {
    const prototype = Object.create(Object.getPrototypeOf(value))
    Object.defineProperty(prototype, key, {
      value: propertyValue,
      enumerable: true,
      configurable: true,
      writable: true,
    })
    Object.setPrototypeOf(value, prototype)
    return
  }
  Object.defineProperty(value, key, {
    value: propertyValue,
    enumerable: false,
    configurable: true,
    writable: true,
  })
}

function addValidNodeRelation(doc, label) {
  const relation = {
    id: 'relation',
    sourceNodeId: 'order',
    targetNodeId: 'normalize',
    ...(label ? { label } : {}),
  }
  doc.nodeRelations.push(relation)
  return relation
}

// production field ID allocation uses a readable slug, 54-bit suffix and collision retry.
{
  assert.equal(FIELD_ID_SUFFIX_ALPHABET.length, 64)
  assert.equal(FIELD_ID_SUFFIX_LENGTH, 9)
  assert.equal(fieldIdSlug('Order Event Status'), 'order_event_status')
  assert.equal(fieldIdSlug('Crème brûlée'), 'creme_brulee')
  assert.equal(fieldIdSlug('주문 상태'), 'field')
  assert.ok(fieldIdSlug('a'.repeat(100)).length <= FIELD_ID_SLUG_MAX_CHARS)

  const first = `status_${'A'.repeat(FIELD_ID_SUFFIX_LENGTH)}`
  const used = new Set([first])
  let fill = 0
  const allocated = allocateFieldId('Status', used, (bytes) => bytes.fill(fill++))
  assert.equal(allocated, `status_${'B'.repeat(FIELD_ID_SUFFIX_LENGTH)}`)
  assert.ok(used.has(allocated))
  assert.match(allocated, /^[A-Za-z0-9_-]+$/)

  const reservedNameField = allocateFieldId(
    'constructor',
    used,
    (bytes) => bytes.fill(2),
  )
  assert.notEqual(reservedNameField, 'constructor')
}

// success contract: validator returns the original reference and no warning channel.
{
  const doc = makeValidDoc()
  const result = validateFieldWeftDocV1(doc)
  assert.deepEqual(validateJsonSchema(fieldWeftSchema, doc), [])
  assert.equal(result.ok, true)
  assert.equal(result.doc, doc)
  assert.deepEqual(Object.keys(result).sort(), ['doc', 'ok'])
  assert.equal(readFieldWeftDoc(doc).kind, 'ok')
}

// marker/version dispatcher와 다섯 필수 배열은 FieldWeft v1 진입 경계를 고정한다.
{
  assert.equal(readFieldWeftDoc({ ...makeValidDoc(), version: 2 }).kind, 'unsupported')
  assert.equal(readFieldWeftDoc({ ...makeValidDoc(), version: '1' }).kind, 'invalid')
  assert.equal(readFieldWeftDoc({ ...makeValidDoc(), format: 'codedoc' }).kind, 'invalid')
  assert.equal(readFieldWeftDoc({ ...makeValidDoc(), format: 'unknown' }).kind, 'invalid')

  const missingFormat = makeValidDoc()
  delete missingFormat.format
  const formatResult = readFieldWeftDoc(missingFormat)
  assert.equal(formatResult.kind, 'invalid')
  assert.ok(formatResult.errors.some((error) => error.path === '/format'))

  const missing = makeValidDoc()
  delete missing.version
  const result = readFieldWeftDoc(missing)
  assert.equal(result.kind, 'invalid')
  assert.ok(result.errors.some((error) => error.path === '/version'))

  for (const key of [
    'entities',
    'processes',
    'boundaries',
    'nodeRelations',
    'mappings',
  ]) {
    const missingArray = makeValidDoc()
    delete missingArray[key]
    const arrayResult = readFieldWeftDoc(missingArray)
    assert.equal(arrayResult.kind, 'invalid')
    assert.ok(arrayResult.errors.some((error) => error.path === `/${key}`))
  }
}

// Schema properties must be own and enumerable to exist at the JSON boundary.
{
  for (const mode of ['inherited', 'non-enumerable']) {
    for (const key of ['format', 'version']) {
      const doc = makeValidDoc()
      doc.version = 2
      movePropertyOutsideJson(doc, key, mode)
      const result = readFieldWeftDoc(doc)
      assert.equal(result.kind, 'invalid')
      assert.ok(
        result.errors.some((error) => error.path === `/${key}`),
        `${mode} ${key} must not select unsupported-version dispatch`,
      )
    }
  }

  const requiredProperties = [
    ['entities', (doc) => [doc, 'entities', '/entities']],
    ['processes', (doc) => [doc, 'processes', '/processes']],
    ['boundaries', (doc) => [doc, 'boundaries', '/boundaries']],
    ['nodeRelations', (doc) => [doc, 'nodeRelations', '/nodeRelations']],
    ['mappings', (doc) => [doc, 'mappings', '/mappings']],
    ['entity id', (doc) => [doc.entities[0], 'id', '/entities/0/id']],
    ['entity name', (doc) => [doc.entities[0], 'name', '/entities/0/name']],
    ['entity kind', (doc) => [doc.entities[0], 'kind', '/entities/0/kind']],
    ['entity fields', (doc) => [doc.entities[0], 'fields', '/entities/0/fields']],
    ['process id', (doc) => [doc.processes[0], 'id', '/processes/0/id']],
    ['process name', (doc) => [doc.processes[0], 'name', '/processes/0/name']],
    ['process kind', (doc) => [doc.processes[0], 'kind', '/processes/0/kind']],
    ['process inputs', (doc) => [doc.processes[0], 'inputs', '/processes/0/inputs']],
    ['process outputs', (doc) => [doc.processes[0], 'outputs', '/processes/0/outputs']],
    ['boundary id', (doc) => [doc.boundaries[0], 'id', '/boundaries/0/id']],
    ['boundary name', (doc) => [doc.boundaries[0], 'name', '/boundaries/0/name']],
    [
      'field id',
      (doc) => [doc.entities[0].fields[0], 'id', '/entities/0/fields/0/id'],
    ],
    [
      'field name',
      (doc) => [doc.entities[0].fields[0], 'name', '/entities/0/fields/0/name'],
    ],
    [
      'field type',
      (doc) => [doc.entities[0].fields[0], 'type', '/entities/0/fields/0/type'],
    ],
    ['mapping id', (doc) => [doc.mappings[0], 'id', '/mappings/0/id']],
    [
      'mapping source',
      (doc) => [doc.mappings[0], 'sourceFieldId', '/mappings/0/sourceFieldId'],
    ],
    [
      'mapping target',
      (doc) => [doc.mappings[0], 'targetFieldId', '/mappings/0/targetFieldId'],
    ],
    [
      'node relation id',
      (doc) => [addValidNodeRelation(doc), 'id', '/nodeRelations/0/id'],
    ],
    [
      'node relation source',
      (doc) => [
        addValidNodeRelation(doc),
        'sourceNodeId',
        '/nodeRelations/0/sourceNodeId',
      ],
    ],
    [
      'node relation target',
      (doc) => [
        addValidNodeRelation(doc),
        'targetNodeId',
        '/nodeRelations/0/targetNodeId',
      ],
    ],
    [
      'position x',
      (doc) => [doc.entities[0].position, 'x', '/entities/0/position/x'],
    ],
    [
      'position y',
      (doc) => [doc.entities[0].position, 'y', '/entities/0/position/y'],
    ],
    [
      'size width',
      (doc) => [doc.boundaries[0].size, 'width', '/boundaries/0/size/width'],
    ],
    [
      'size height',
      (doc) => [doc.boundaries[0].size, 'height', '/boundaries/0/size/height'],
    ],
    [
      'discriminator values',
      (doc) => [
        doc.entities[0].fields[0].discriminator,
        'values',
        '/entities/0/fields/0/discriminator/values',
      ],
    ],
  ]

  for (const mode of ['inherited', 'non-enumerable']) {
    for (const [name, locate] of requiredProperties) {
      const doc = makeValidDoc()
      const [owner, key, path] = locate(doc)
      movePropertyOutsideJson(owner, key, mode)
      const result = validateFieldWeftDocV1(doc)
      assert.equal(result.ok, false, `${mode} required ${name} must fail`)
      assert.ok(
        result.errors.some((error) => error.path === path),
        `${mode} required ${name} must report ${path}`,
      )
    }
  }
}

// Optional schema properties outside JSON are absent during canonicalization.
{
  const optionalProperties = [
    ['description', (doc) => {
      doc.entities[0].description = 'Inherited description'
      return [doc.entities[0], 'description']
    }],
    ['tags', (doc) => {
      doc.entities[0].tags = ['inherited']
      return [doc.entities[0], 'tags']
    }],
    ['meta', (doc) => {
      doc.entities[0].meta = { owner: 'inherited' }
      return [doc.entities[0], 'meta']
    }],
    ['entity position', (doc) => [doc.entities[0], 'position']],
    ['process position', (doc) => [doc.processes[0], 'position']],
    ['boundary position', (doc) => [doc.boundaries[0], 'position']],
    ['boundary size', (doc) => [doc.boundaries[0], 'size']],
    ['field array', (doc) => {
      doc.entities[0].fields[0].array = true
      return [doc.entities[0].fields[0], 'array']
    }],
    ['field nullable', (doc) => {
      doc.entities[0].fields[0].nullable = true
      return [doc.entities[0].fields[0], 'nullable']
    }],
    ['field pk', (doc) => {
      doc.entities[0].fields[0].pk = true
      return [doc.entities[0].fields[0], 'pk']
    }],
    ['field children', (doc) => {
      doc.entities[0].fields[2].children = [
        { id: 'hidden_child', name: 'hidden', type: 'string' },
      ]
      return [doc.entities[0].fields[2], 'children']
    }],
    ['field discriminator', (doc) => {
      doc.entities[0].fields[4].when = { status_f: ['OPEN', 'CLOSED'] }
      return [doc.entities[0].fields[1], 'discriminator']
    }],
    ['field when', (doc) => [doc.entities[0].fields[4], 'when']],
    ['entity collapsed', (doc) => [doc.entities[0], 'collapsed']],
    ['boundary color', (doc) => [doc.boundaries[0], 'color']],
    ['boundary kind', (doc) => [doc.boundaries[0], 'kind']],
    ['boundary members', (doc) => [doc.boundaries[0], 'members']],
    ['mapping kind', (doc) => {
      doc.mappings[0].kind = 'transform'
      return [doc.mappings[0], 'kind']
    }],
    ['mapping label', (doc) => {
      doc.mappings[0].label = 'Inherited mapping label'
      return [doc.mappings[0], 'label']
    }],
    ['node relation label', (doc) => [
      addValidNodeRelation(doc, 'Inherited relation label'),
      'label',
    ]],
  ]

  for (const mode of ['inherited', 'non-enumerable']) {
    for (const [name, locate] of optionalProperties) {
      const expectedInput = makeValidDoc()
      const [expectedOwner, expectedKey] = locate(expectedInput)
      delete expectedOwner[expectedKey]
      const expected = readCanonicalFieldWeftDoc(expectedInput)
      assert.equal(expected.ok, true, `baseline for ${name} must be valid`)

      const input = makeValidDoc()
      const [owner, key] = locate(input)
      movePropertyOutsideJson(owner, key, mode)
      const actual = readCanonicalFieldWeftDoc(input)
      assert.equal(actual.ok, true, `${mode} optional ${name} must be absent`)
      assert.deepEqual(actual.doc, expected.doc)
    }
  }
}

// Custom prototypes remain valid when schema properties are own and enumerable.
{
  const customPrototype = makeValidDoc()
  customPrototype.entities[0] = Object.assign(
    Object.create({ inheritedUnknown: true }),
    customPrototype.entities[0],
  )
  assert.equal(validateFieldWeftDocV1(customPrototype).ok, true)

  const nullPrototypeMeta = makeValidDoc()
  nullPrototypeMeta.entities[0].meta = Object.assign(Object.create(null), {
    owner: 'payments',
  })
  const canonical = readCanonicalFieldWeftDoc(nullPrototypeMeta)
  assert.equal(canonical.ok, true)
  assert.equal(canonical.doc.entities[0].meta.owner, 'payments')
  assert.equal(Object.getPrototypeOf(canonical.doc.entities[0].meta), null)

  const parsed = JSON.parse(JSON.stringify(makeValidDoc()))
  assert.equal(validateFieldWeftDocV1(parsed).ok, true)
}

// schema와 TypeScript validator는 공통 구조 fixture에서 같은 판정을 낸다.
{
  const fixtures = [
    makeValidDoc(),
    { ...makeValidDoc(), format: 'codedoc' },
    { ...makeValidDoc(), version: 2 },
    { ...makeValidDoc(), unknown: true },
    {
      ...makeValidDoc(),
      entities: [{ ...makeValidDoc().entities[0], kind: 'etc' }],
    },
  ]
  for (const fixture of fixtures) {
    const schemaOk = validateJsonSchema(fieldWeftSchema, fixture).length === 0
    assert.equal(validateFieldWeftDocV1(fixture).ok, schemaOk)
  }
}

// 공개 enum은 other만 허용하고 목록 밖의 etc는 조용히 변환하지 않는다.
{
  const other = makeValidDoc()
  other.entities[0].kind = 'other'
  other.boundaries[0].kind = 'other'
  assert.equal(validateFieldWeftDocV1(other).ok, true)

  const invalidEnumDoc = makeValidDoc()
  invalidEnumDoc.entities[0].kind = 'etc'
  errorWithCode(validateFieldWeftDocV1(invalidEnumDoc), 'value.enum')
}

// Public vocabulary and reserved-key views cannot mutate validator rules.
{
  const vocabularies = [
    FIELD_WEFT_BOUNDARY_COLORS_V1,
    FIELD_WEFT_BOUNDARY_KINDS_V1,
    FIELD_WEFT_ENTITY_KINDS_V1,
    FIELD_WEFT_FIELD_TYPES_V1,
    FIELD_WEFT_MAPPING_KINDS_V1,
  ]
  const invalidEnumDoc = makeValidDoc()
  invalidEnumDoc.entities[0].kind = 'mutated'
  assert.equal(validateFieldWeftDocV1(invalidEnumDoc).ok, false)

  for (const vocabulary of vocabularies) {
    const before = [...vocabulary]
    assert.equal(Object.isFrozen(vocabulary), true)
    assert.throws(() => vocabulary.push('mutated'), TypeError)
    assert.throws(() => vocabulary.reverse(), TypeError)
    assert.deepEqual(vocabulary, before)
  }
  assert.equal(validateFieldWeftDocV1(invalidEnumDoc).ok, false)

  for (const reserved of [
    FIELD_WEFT_RESERVED_IDS,
    FIELD_WEFT_RESERVED_META_KEYS,
  ]) {
    assert.equal(Object.isFrozen(reserved), true)
    assert.equal(Object.prototype.toString.call(reserved), '[object Set]')
    assert.deepEqual([...reserved], ['__proto__', 'prototype', 'constructor'])
    assert.throws(() => reserved.delete('__proto__'), TypeError)
    assert.throws(() => reserved.add('ordinary'), TypeError)
    assert.throws(() => reserved.clear(), TypeError)
    assert.equal(reserved.has('__proto__'), true)
    assert.equal(reserved.has('ordinary'), false)
  }

  const reservedId = makeValidDoc()
  reservedId.entities[0].id = '__proto__'
  errorWithCode(validateFieldWeftDocV1(reservedId), 'id.reserved')

  const reservedMeta = makeValidDoc()
  reservedMeta.entities[0].meta = Object.create(null)
  reservedMeta.entities[0].meta.__proto__ = 'blocked'
  errorWithCode(validateFieldWeftDocV1(reservedMeta), 'meta.key-reserved')

  assert.equal(validateFieldWeftDocV1(makeValidDoc()).ok, true)
}

// validation never repairs or mutates invalid input, including frozen objects.
{
  const doc = makeValidDoc()
  doc.entities[0].fields[4].when.status_f.push('MISSING')
  const before = JSON.stringify(doc)
  deepFreeze(doc)
  const result = validateFieldWeftDocV1(doc)
  errorWithCode(result, 'when.value')
  assert.equal(JSON.stringify(doc), before)
}

// duplicate diagnostics retain both JSON Pointer locations.
{
  const doc = makeValidDoc()
  doc.entities[0].fields[1].id = 'status_f'
  const diagnostic = errorWithCode(validateFieldWeftDocV1(doc), 'id.duplicate-field')
  assert.equal(diagnostic.path, '/entities/0/fields/0/id')
  assert.deepEqual(diagnostic.params, { id: 'status_f' })
  assert.equal(diagnostic.related[0].path, '/entities/0/fields/1/id')
}

// unknown properties, process variants, coordinates and all cross-reference families.
{
  const doc = makeValidDoc()
  doc.entities[0].unknown = true
  doc.entities[0].position.x = FIELD_WEFT_MAX_COORD_V1 + 1
  doc.processes[0].inputs[0].when = {}
  doc.entities[0].fields[4].when = { missing_disc: ['X'] }
  doc.entities[0].collapsed = ['note_f']
  doc.mappings[0].sourceFieldId = 'details_f'
  doc.mappings[0].targetFieldId = 'process_out_f'
  doc.boundaries[0].members.push('domain')
  doc.boundaries.push({
    id: 'other_domain',
    name: 'Other Domain',
    members: ['order'],
  })
  const result = validateFieldWeftDocV1(doc)
  for (const code of [
    'property.unknown',
    'value.coordinate',
    'field.process-variant',
    'reference.when',
    'collapsed.type',
    'mapping.leaf',
    'mapping.direction',
    'boundary.nested',
    'boundary.duplicate-member',
  ]) {
    errorWithCode(result, code)
  }
  assert.deepEqual(errorWithCode(result, 'property.unknown').params, {
    key: 'unknown',
  })
  assert.deepEqual(errorWithCode(result, 'value.coordinate').params, {
    limit: FIELD_WEFT_MAX_COORD_V1,
  })
  assert.deepEqual(errorWithCode(result, 'field.process-variant').params, {
    property: 'when',
  })
  assert.deepEqual(errorWithCode(result, 'reference.when').params, {
    id: 'missing_disc',
  })
}

// process IO는 캔버스 핸들과 일대일 대응하는 flat field만 허용한다.
{
  const doc = makeValidDoc()
  doc.processes[0].inputs[0] = {
    id: 'process_in_f',
    name: 'input',
    type: 'object',
    children: [{ id: 'nested_process_f', name: 'nested', type: 'number' }],
  }
  errorWithCode(validateFieldWeftDocV1(doc), 'field.process-children')
}

// field 이름은 구분자를 허용하지만 앞뒤 공백은 문서 계약에서 거부한다.
{
  const delimiter = makeValidDoc()
  delimiter.entities[0].fields[0].name = 'status.current:value'
  assert.equal(validateFieldWeftDocV1(delimiter).ok, true)

  const whitespace = makeValidDoc()
  whitespace.entities[0].fields[0].name = ' status'
  errorWithCode(validateFieldWeftDocV1(whitespace), 'field.name-whitespace')
}

// 공개 문자열 상한은 Unicode code point 기준이며 schema와 validator가 일치한다.
{
  const atLimits = makeValidDoc()
  atLimits.boundaries[0].id = 'b'.repeat(FIELD_WEFT_MAX_ID_CHARS_V1)
  atLimits.entities[0].name = '😀'.repeat(FIELD_WEFT_MAX_NAME_CHARS_V1)
  atLimits.mappings[0].label = 'l'.repeat(FIELD_WEFT_MAX_LABEL_CHARS_V1)
  atLimits.boundaries[0].description = '설'.repeat(
    FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
  )
  const variant = 'v'.repeat(FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1)
  atLimits.entities[0].fields[0].discriminator.values = [variant]
  atLimits.entities[0].fields[4].when.status_f = [variant]
  assert.deepEqual(validateJsonSchema(fieldWeftSchema, atLimits), [])
  assert.equal(validateFieldWeftDocV1(atLimits).ok, true)

  const invalidAstralId = makeValidDoc()
  invalidAstralId.boundaries[0].id = '😀'.repeat(
    Math.floor(FIELD_WEFT_MAX_ID_CHARS_V1 / 2) + 1,
  )
  const schemaErrors = validateJsonSchema(fieldWeftSchema, invalidAstralId)
  assert.ok(schemaErrors.some((error) => error.keyword === 'pattern'))
  assert.equal(
    schemaErrors.some((error) => error.keyword === 'maxLength'),
    false,
  )
  const astralResult = validateFieldWeftDocV1(invalidAstralId)
  errorWithCode(astralResult, 'id.format')
  assert.equal(
    astralResult.errors.some((error) => error.code === 'limit.string.id'),
    false,
  )

  const cases = [
    {
      code: 'limit.string.id',
      params: { limit: FIELD_WEFT_MAX_ID_CHARS_V1 },
      mutate: (doc) => {
        doc.boundaries[0].id = 'b'.repeat(FIELD_WEFT_MAX_ID_CHARS_V1 + 1)
      },
    },
    {
      code: 'limit.string.name',
      params: { limit: FIELD_WEFT_MAX_NAME_CHARS_V1 },
      mutate: (doc) => {
        doc.entities[0].name = '😀'.repeat(FIELD_WEFT_MAX_NAME_CHARS_V1 + 1)
      },
    },
    {
      code: 'limit.string.label',
      params: { limit: FIELD_WEFT_MAX_LABEL_CHARS_V1 },
      mutate: (doc) => {
        doc.mappings[0].label = 'l'.repeat(FIELD_WEFT_MAX_LABEL_CHARS_V1 + 1)
      },
    },
    {
      code: 'limit.string.description',
      params: { limit: FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1 },
      mutate: (doc) => {
        doc.boundaries[0].description = '설'.repeat(
          FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1 + 1,
        )
      },
    },
    {
      code: 'limit.string.variant-value',
      params: { limit: FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1 },
      mutate: (doc) => {
        doc.entities[0].fields[0].discriminator.values = [
          'v'.repeat(FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1 + 1),
        ]
      },
    },
  ]
  for (const { code, params, mutate } of cases) {
    const doc = makeValidDoc()
    mutate(doc)
    assert.ok(
      validateJsonSchema(fieldWeftSchema, doc).some(
        (error) => error.keyword === 'maxLength',
      ),
      `schema가 ${code} 상한을 거부해야 합니다.`,
    )
    assert.deepEqual(errorWithCode(validateFieldWeftDocV1(doc), code).params, params)
  }
}

// discriminator.values와 when 값 배열은 각각 256개까지만 허용한다.
{
  const variants = Array.from(
    { length: FIELD_WEFT_MAX_VARIANT_VALUES_V1 },
    (_, index) => `variant_${index}`,
  )
  const atLimit = makeValidDoc()
  atLimit.entities[0].fields[0].discriminator.values = variants
  atLimit.entities[0].fields[4].when.status_f = [...variants]
  assert.deepEqual(validateJsonSchema(fieldWeftSchema, atLimit), [])
  assert.equal(validateFieldWeftDocV1(atLimit).ok, true)

  for (const target of ['discriminator', 'when']) {
    const overLimit = makeValidDoc()
    const values = Array.from(
      { length: FIELD_WEFT_MAX_VARIANT_VALUES_V1 + 1 },
      (_, index) => `variant_${index}`,
    )
    if (target === 'discriminator') {
      overLimit.entities[0].fields[0].discriminator.values = values
    } else {
      overLimit.entities[0].fields[4].when.status_f = values
    }
    assert.ok(
      validateJsonSchema(fieldWeftSchema, overLimit).some(
        (error) => error.keyword === 'maxItems',
      ),
      `schema가 ${target} 값 개수 상한을 거부해야 합니다.`,
    )
    const diagnostic = errorWithCode(
      validateFieldWeftDocV1(overLimit),
      'limit.variant-values',
    )
    assert.equal(diagnostic.params.limit, FIELD_WEFT_MAX_VARIANT_VALUES_V1)
  }
}

// reserved IDs and depth/field resource limits fail without traversing beyond the gate.
{
  const reserved = makeValidDoc()
  reserved.entities[0].fields[0].id = 'constructor'
  errorWithCode(validateFieldWeftDocV1(reserved), 'id.reserved')

  const reservedNode = makeValidDoc()
  reservedNode.entities[0].id = 'prototype'
  errorWithCode(validateFieldWeftDocV1(reservedNode), 'id.reserved')

  const reservedMapping = makeValidDoc()
  reservedMapping.mappings[0].id = '__proto__'
  errorWithCode(validateFieldWeftDocV1(reservedMapping), 'id.reserved')

  const deep = makeValidDoc()
  let field = {
    id: `deep_${FIELD_WEFT_MAX_FIELD_DEPTH_V1 + 1}`,
    name: `deep_${FIELD_WEFT_MAX_FIELD_DEPTH_V1 + 1}`,
    type: 'object',
  }
  for (let depth = FIELD_WEFT_MAX_FIELD_DEPTH_V1; depth >= 1; depth--) {
    field = {
      id: `deep_${depth}`,
      name: `deep_${depth}`,
      type: 'object',
      children: [field],
    }
  }
  deep.entities[0].fields = [field]
  deep.entities[0].collapsed = []
  deep.mappings = []
  errorWithCode(validateFieldWeftDocV1(deep), 'limit.field-depth')

  const tooMany = makeValidDoc()
  tooMany.entities[0].fields = new Array(FIELD_WEFT_MAX_FIELDS_V1 + 1)
  tooMany.entities[0].collapsed = []
  tooMany.mappings = []
  errorWithCode(validateFieldWeftDocV1(tooMany), 'limit.fields')
}

// node relation은 구조·endpoint·self 관계와 mapping을 합친 ID 공간을 검증한다.
{
  const doc = makeValidDoc()
  doc.nodeRelations = [
    {
      id: 'node_link',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
      label: 'calls',
    },
  ]
  assert.equal(validateFieldWeftDocV1(doc).ok, true)

  const duplicateId = makeValidDoc()
  duplicateId.nodeRelations = [
    {
      id: duplicateId.mappings[0].id,
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
    },
  ]
  errorWithCode(validateFieldWeftDocV1(duplicateId), 'id.duplicate-relation')

  const self = makeValidDoc()
  self.nodeRelations = [
    { id: 'self', sourceNodeId: 'order', targetNodeId: 'order' },
  ]
  errorWithCode(validateFieldWeftDocV1(self), 'node-relation.self')

  const boundaryEndpoint = makeValidDoc()
  boundaryEndpoint.nodeRelations = [
    { id: 'nested', sourceNodeId: 'domain', targetNodeId: 'order' },
  ]
  errorWithCode(validateFieldWeftDocV1(boundaryEndpoint), 'node-relation.endpoint')

  const dangling = makeValidDoc()
  dangling.nodeRelations = [
    { id: 'dangling', sourceNodeId: 'missing', targetNodeId: 'order' },
  ]
  errorWithCode(
    validateFieldWeftDocV1(dangling),
    'reference.node-relation-source',
  )

  const reserved = makeValidDoc()
  reserved.nodeRelations = [
    {
      id: 'constructor',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
    },
  ]
  errorWithCode(validateFieldWeftDocV1(reserved), 'id.reserved')
}

// arbitrary cyclic JS input is diagnosed instead of overflowing the validator.
{
  const doc = makeValidDoc()
  const field = doc.entities[0].fields[0]
  field.children = [field]
  errorWithCode(validateFieldWeftDocV1(doc), 'structure.cycle')
}

// canonicalization is immutable, deterministic, idempotent and preserves authored order.
let canonical
{
  const doc = makeValidDoc()
  const before = JSON.stringify(doc)
  canonical = canonicalizeFieldWeftDoc(validDoc(doc))
  const recanonical = canonicalizeFieldWeftDoc(canonical)

  assert.equal(JSON.stringify(doc), before)
  assert.deepEqual(recanonical, canonical)
  assert.equal(JSON.stringify(recanonical), JSON.stringify(canonical))
  assert.deepEqual(Object.keys(canonical), [
    'format',
    'version',
    'entities',
    'processes',
    'boundaries',
    'nodeRelations',
    'mappings',
  ])
  assert.deepEqual(
    canonical.entities[0].fields.map((field) => field.id),
    ['status_f', 'channel_f', 'metadata_f', 'details_f', 'note_f'],
  )
  assert.deepEqual(canonical.entities[0].collapsed, ['details_f', 'metadata_f'])
  assert.deepEqual(canonical.boundaries[0].members, ['normalize', 'order'])
  assert.equal('description' in canonical.boundaries[0], false)
  assert.equal('kind' in canonical.mappings[0], false)
  assert.equal('label' in canonical.mappings[0], false)

  const status = canonical.entities[0].fields.find((field) => field.id === 'status_f')
  assert.deepEqual(status.discriminator.values, ['CLOSED', 'OPEN'])
  assert.equal('array' in status, false)
  const note = canonical.entities[0].fields.find((field) => field.id === 'note_f')
  assert.deepEqual(Object.keys(note.when), ['channel_f', 'status_f'])
  assert.deepEqual(note.when.channel_f, ['APP', 'WEB'])
  assert.equal(Object.getPrototypeOf(note.when), null)
  assert.equal(validateFieldWeftDocV1(canonical).ok, true)
}

// annotation은 모든 object에서 flat하게 검증·canonicalize되고 전용 serializer 순서를 따른다.
let annotatedCanonical
{
  const doc = makeValidDoc()
  doc.entities[0].description = '주문 데이터'
  doc.entities[0].tags = [
    'pii',
    'PII',
    'é',
    'e\u0301',
    '\uE000',
    'critical',
    '😀',
    'Alpha',
  ]
  doc.entities[0].meta = {
    2: 'two',
    10: 'ten',
    codeWithLeadingZero: '00123',
    exactDecimal: '1234567890.1234567890',
    longId: '9223372036854775807',
    '\uE000': 'bmp',
    '😀': 'supplementary',
    nullableOwner: null,
    removedOwner: null,
    negativeZero: -0,
    threshold: 1e-6,
  }
  doc.entities[0].fields[0].description = '상태 코드'
  doc.entities[0].fields[0].tags = ['dimension']
  doc.entities[0].fields[0].meta = { owner: 'payments' }
  doc.processes[0].description = '주문 정규화'
  doc.processes[0].tags = ['batch']
  doc.processes[0].meta = { enabled: true }
  doc.processes[0].inputs[0].description = '정규화 입력'
  doc.processes[0].outputs[0].tags = []
  doc.processes[0].outputs[0].meta = {}
  doc.boundaries[0].tags = ['domain']
  doc.boundaries[0].meta = { tier: 1 }
  doc.nodeRelations = [
    {
      id: 'relation_annotations',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
      label: 'input',
      description: '호출 이유',
      tags: ['scheduled'],
      meta: { schedule: 'daily' },
    },
  ]
  doc.mappings[0].description = '값 전달'
  doc.mappings[0].tags = ['lineage']
  doc.mappings[0].meta = { reviewed: false }

  const result = readCanonicalFieldWeftDoc(doc)
  assert.equal(result.ok, true)
  annotatedCanonical = result.doc
  assert.deepEqual(annotatedCanonical.entities[0].tags, [
    'Alpha',
    'PII',
    'critical',
    'e\u0301',
    'pii',
    'é',
    '😀',
    '\uE000',
  ])
  assert.equal(annotatedCanonical.entities[0].meta.negativeZero, 0)
  assert.equal(annotatedCanonical.entities[0].meta.nullableOwner, null)
  assert.equal(
    annotatedCanonical.entities[0].meta.exactDecimal,
    '1234567890.1234567890',
  )
  assert.equal(
    annotatedCanonical.entities[0].meta.longId,
    '9223372036854775807',
  )
  assert.equal(
    annotatedCanonical.entities[0].meta.codeWithLeadingZero,
    '00123',
  )
  assert.equal(annotatedCanonical.entities[0].meta.threshold, 1e-6)
  assert.equal('tags' in annotatedCanonical.processes[0].outputs[0], false)
  assert.equal('meta' in annotatedCanonical.processes[0].outputs[0], false)
  assert.equal(
    Object.is(annotatedCanonical.entities[0].meta.negativeZero, -0),
    false,
  )

  const compact = serializeCanonicalFieldWeftDoc(annotatedCanonical)
  const pretty = serializeCanonicalFieldWeftDoc(annotatedCanonical, { space: 2 })
  assert.deepEqual(readCanonicalFieldWeftDoc(JSON.parse(compact)).doc, annotatedCanonical)
  assert.deepEqual(readCanonicalFieldWeftDoc(JSON.parse(pretty)).doc, annotatedCanonical)
  const metaStart = compact.indexOf('"meta":{')
  const metaEnd = compact.indexOf('}', metaStart)
  const metaText = compact.slice(metaStart, metaEnd)
  assert.ok(metaText.indexOf('"10"') < metaText.indexOf('"2"'))
  assert.ok(metaText.indexOf('"😀"') < metaText.indexOf('""'))

}

// 언어 중립 expected-text fixture가 compact/pretty member 순서를 byte 단위로 고정한다.
{
  const fixture = JSON.parse(
    readFileSync(
      join(root, 'fixtures', 'fieldweft-canonical-v1-input.json'),
      'utf8',
    ),
  )
  const result = readCanonicalFieldWeftDoc(fixture)
  assert.equal(result.ok, true)
  assert.equal(
    `${serializeCanonicalFieldWeftDoc(result.doc)}\n`,
    readFileSync(
      join(root, 'fixtures', 'fieldweft-canonical-v1-compact.json'),
      'utf8',
    ),
  )
  assert.equal(
    `${serializeCanonicalFieldWeftDoc(result.doc, { space: 2 })}\n`,
    readFileSync(
      join(root, 'fixtures', 'fieldweft-canonical-v1-pretty.json'),
      'utf8',
    ),
  )
}

// annotation validator는 wrapper·중복 tag·중첩/비유한 meta·예약 key와 개별 한도를 거부한다.
{
  const cases = [
    {
      mutate: (doc) => {
        doc.entities[0].annotations = { description: '중첩 금지' }
      },
      code: 'property.unknown',
      path: '/entities/0/annotations',
    },
    {
      mutate: (doc) => {
        doc.entities[0].tags = ['pii', 'pii']
      },
      code: 'tag.duplicate',
      path: '/entities/0/tags/0',
    },
    {
      mutate: (doc) => {
        doc.entities[0].tags = ['']
      },
      code: 'tag.type',
      path: '/entities/0/tags/0',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = { nested: { value: true } }
      },
      code: 'meta.value-type',
      path: '/entities/0/meta/nested',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = new Date(0)
      },
      code: 'type.object',
      path: '/entities/0/meta',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = { constructor: 'blocked' }
      },
      code: 'meta.key-reserved',
      path: '/entities/0/meta/constructor',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = { 'fieldweft.owner': 'blocked' }
      },
      code: 'meta.key-reserved-namespace',
      path: '/entities/0/meta/fieldweft.owner',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = { '': true }
      },
      code: 'meta.key-empty',
      path: '/entities/0/meta/',
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = { ratio: Number.NaN }
      },
      code: 'meta.number-finite',
      path: '/entities/0/meta/ratio',
    },
    {
      mutate: (doc) => {
        doc.entities[0].tags = ['x'.repeat(FIELD_WEFT_MAX_TAG_CHARS_V1 + 1)]
      },
      code: 'limit.string.tag',
      path: '/entities/0/tags/0',
    },
    {
      mutate: (doc) => {
        doc.entities[0].tags = Array.from(
          { length: FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1 + 1 },
          (_, index) => `tag_${index}`,
        )
      },
      code: 'limit.tags-per-object',
      path: `/entities/0/tags/${FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1}`,
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = Object.fromEntries(
          Array.from(
            { length: FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1 + 1 },
            (_, index) => [`key_${index}`, index],
          ),
        )
      },
      code: 'limit.meta-per-object',
      path: `/entities/0/meta/key_${FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1}`,
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = {
          ['k'.repeat(FIELD_WEFT_MAX_META_KEY_CHARS_V1 + 1)]: true,
        }
      },
      code: 'limit.string.meta-key',
      path: `/entities/0/meta/${'k'.repeat(FIELD_WEFT_MAX_META_KEY_CHARS_V1 + 1)}`,
    },
    {
      mutate: (doc) => {
        doc.entities[0].meta = {
          text: 'x'.repeat(FIELD_WEFT_MAX_META_STRING_CHARS_V1 + 1),
        }
      },
      code: 'limit.string.meta-value',
      path: '/entities/0/meta/text',
    },
  ]
  for (const fixture of cases) {
    const doc = makeValidDoc()
    fixture.mutate(doc)
    const result = validateFieldWeftDocV1(doc)
    const error = errorWithCode(result, fixture.code)
    assert.equal(error.path, fixture.path)
  }

  const schemaStringOver = makeValidDoc()
  schemaStringOver.entities[0].meta = {
    text: '😀'.repeat(FIELD_WEFT_MAX_META_STRING_CHARS_V1 + 1),
  }
  assert.ok(
    validateJsonSchema(fieldWeftSchema, schemaStringOver).some(
      (error) =>
        error.path === '/entities/0/meta/text' &&
        error.keyword === 'maxLength',
    ),
  )
}

// annotation diff는 description property, tag set, meta key 단위 변경을 보고한다.
{
  const changed = structuredClone(annotatedCanonical)
  changed.entities[0].description = '변경된 설명'
  changed.entities[0].tags = ['pii', 'new-tag', 'critical', 'Alpha']
  delete changed.entities[0].meta.removedOwner
  changed.entities[0].meta.nullableOwner = 'payments'
  changed.entities[0].meta.owner = null
  changed.entities[0].meta.negativeZero = 0
  const next = readCanonicalFieldWeftDoc(changed)
  assert.equal(next.ok, true)
  const changes = diffCanonicalFieldWeftDocs(annotatedCanonical, next.doc)
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'property' &&
        change.object === 'entity' &&
        change.property === 'description',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'tag' &&
        change.action === 'add' &&
        change.tag === 'new-tag',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'meta' &&
        change.action === 'remove' &&
        change.key === 'removedOwner' &&
        change.before === null,
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'meta' &&
        change.action === 'update' &&
        change.key === 'nullableOwner' &&
        change.before === null &&
        change.after === 'payments',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'meta' &&
        change.action === 'add' &&
        change.key === 'owner' &&
        change.after === null,
    ),
  )
  assert.equal(
    changes.some(
      (change) =>
        change.kind === 'meta' && change.key === 'negativeZero',
    ),
    false,
  )

  const reordered = structuredClone(annotatedCanonical)
  reordered.entities[0].tags.reverse()
  reordered.entities[0].meta = Object.fromEntries(
    Object.entries(reordered.entities[0].meta).reverse(),
  )
  const reorderedResult = readCanonicalFieldWeftDoc(reordered)
  assert.equal(reorderedResult.ok, true)
  assert.deepEqual(
    diffCanonicalFieldWeftDocs(annotatedCanonical, reorderedResult.doc),
    [],
  )
}

// object별 한도 아래의 annotation도 문서 전체 tag/meta 예산을 넘으면 조기에 거부한다.
{
  const budgetDoc = (kind) => {
    let remaining =
      (kind === 'tags' ? FIELD_WEFT_MAX_TOTAL_TAGS_V1 : FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1) + 1
    const fields = []
    for (let index = 0; remaining > 0; index++) {
      const count = Math.min(
        kind === 'tags'
          ? FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1
          : FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1,
        remaining,
      )
      fields.push({
        id: `budget_${kind}_${index}`,
        name: `budget_${kind}_${index}`,
        type: 'string',
        ...(kind === 'tags'
          ? {
              tags: Array.from({ length: count }, (_, item) => `tag_${item}`),
            }
          : {
              meta: Object.fromEntries(
                Array.from({ length: count }, (_, item) => [`key_${item}`, item]),
              ),
            }),
      })
      remaining -= count
    }
    return {
      format: 'fieldweft',
      version: 1,
      entities: [
        {
          id: `budget_${kind}`,
          name: `Budget ${kind}`,
          kind: 'db',
          fields,
        },
      ],
      processes: [],
      boundaries: [],
      nodeRelations: [],
      mappings: [],
    }
  }

  assert.equal(
    errorWithCode(validateFieldWeftDocV1(budgetDoc('tags')), 'limit.tags').path,
    `/entities/0/fields/${Math.floor(FIELD_WEFT_MAX_TOTAL_TAGS_V1 / FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1)}/tags/0`,
  )
  assert.match(
    errorWithCode(
      validateFieldWeftDocV1(budgetDoc('meta')),
      'limit.meta-entries',
    ).path,
    /\/entities\/0\/fields\/\d+\/meta\/key_\d+$/,
  )
}

// semantic-v1 excludes layout noise; layout-v1 detects it and ignores semantic membership.
{
  const changed = makeValidDoc()
  changed.entities[0].position = { x: 999, y: -30 }
  changed.entities[0].collapsed = ['details_f']
  changed.processes[0].position = { x: 888, y: 777 }
  changed.boundaries[0].position = { x: 5, y: 6 }
  changed.boundaries[0].size = { width: 900, height: 500 }
  changed.boundaries[0].color = 'green'
  const changedCanonical = canonicalizeFieldWeftDoc(validDoc(changed))

  assert.deepEqual(
    projectSemanticFieldWeftDoc(changedCanonical),
    projectSemanticFieldWeftDoc(canonical),
  )
  assert.notDeepEqual(projectLayoutFieldWeftDoc(changedCanonical), projectLayoutFieldWeftDoc(canonical))

  const membershipChanged = makeValidDoc()
  membershipChanged.boundaries[0].members = ['order']
  const membershipCanonical = canonicalizeFieldWeftDoc(validDoc(membershipChanged))
  assert.notDeepEqual(
    projectSemanticFieldWeftDoc(membershipCanonical),
    projectSemanticFieldWeftDoc(canonical),
  )
  assert.deepEqual(projectLayoutFieldWeftDoc(membershipCanonical), projectLayoutFieldWeftDoc(canonical))
}

// 선택 layout 입력은 canonical 단계에서 결정적 기본값으로 실체화된다.
{
  const missingLayout = makeValidDoc()
  delete missingLayout.entities[0].position
  delete missingLayout.processes[0].position
  delete missingLayout.boundaries[0].position
  delete missingLayout.boundaries[0].size

  const source = canonicalizeFieldWeftDoc(validDoc(missingLayout))
  assert.deepEqual(source.entities[0].position, { x: 0, y: 0 })
  assert.deepEqual(source.processes[0].position, { x: 340, y: 120 })
  assert.deepEqual(source.boundaries[0].position, { x: 60, y: 60 })
  assert.deepEqual(source.boundaries[0].size, { width: 380, height: 240 })
  assert.deepEqual(canonicalizeFieldWeftDoc(source), source)

  assert.deepEqual(projectLayoutFieldWeftDoc(source), {
    format: 'fieldweft',
    version: 1,
    entities: [{ id: 'order', position: { x: 0, y: 0 }, collapsed: ['details_f', 'metadata_f'] }],
    processes: [{ id: 'normalize', position: { x: 340, y: 120 } }],
    boundaries: [
      {
        id: 'domain',
        position: { x: 60, y: 60 },
        size: { width: 380, height: 240 },
        color: 'blue',
      },
    ],
  })
}

// stable-ID structural diff는 rename·move·reorder·property를 delete/add와 구분한다.
{
  const changed = makeValidDoc()
  changed.entities[0].position = { x: 999, y: 999 }
  changed.entities[0].collapsed = ['details_f']
  changed.boundaries[0].position = { x: 50, y: 60 }
  changed.boundaries[0].size = { width: 900, height: 600 }

  const fields = changed.entities[0].fields
  fields[0].name = 'state'
  const note = fields.pop()
  const [status, channel, metadata, details] = fields
  details.children[0].nullable = true
  metadata.children = [note]
  changed.entities[0].fields = [
    channel,
    status,
    metadata,
    details,
    { id: 'extra_f', name: 'extra', type: 'string' },
  ]
  changed.mappings.reverse()

  const next = canonicalizeFieldWeftDoc(validDoc(changed))
  const beforeJson = JSON.stringify(canonical)
  const afterJson = JSON.stringify(next)
  const changes = diffCanonicalFieldWeftDocs(canonical, next)
  assert.equal(JSON.stringify(canonical), beforeJson)
  assert.equal(JSON.stringify(next), afterJson)

  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'rename' &&
        change.object === 'field' &&
        change.id === 'status_f' &&
        change.before === 'status' &&
        change.after === 'state',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'move' &&
        change.id === 'note_f' &&
        change.before.parentFieldId === undefined &&
        change.after.parentFieldId === 'metadata_f',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'property' &&
        change.object === 'field' &&
        change.id === 'amount_f' &&
        change.property === 'nullable' &&
        change.after === true,
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'add' &&
        change.object === 'field' &&
        change.id === 'extra_f',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'reorder' &&
        change.object === 'field' &&
        change.scope === 'entity:order:$root' &&
        change.beforeIds.join(',') ===
          'status_f,channel_f,metadata_f,details_f' &&
        change.afterIds.join(',') ===
          'channel_f,status_f,metadata_f,details_f',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'reorder' &&
        change.object === 'mapping' &&
        change.beforeIds.join(',') === 'map_in,map_out' &&
        change.afterIds.join(',') === 'map_out,map_in',
    ),
  )
  assert.equal(
    changes.some(
      (change) =>
        (change.kind === 'add' || change.kind === 'remove') &&
        (change.id === 'status_f' || change.id === 'note_f'),
    ),
    false,
  )
  assert.equal(
    changes.some(
      (change) =>
        change.kind === 'property' &&
        ['position', 'size', 'collapsed'].includes(change.property),
    ),
    false,
  )
}

// node relation과 mapping은 stable relation ID 기준으로 update/reorder를 보고한다.
{
  const beforeDoc = makeValidDoc()
  beforeDoc.nodeRelations = [
    {
      id: 'relation_a',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
    },
    {
      id: 'relation_b',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
      label: 'before',
    },
    {
      id: 'relation_c',
      sourceNodeId: 'normalize',
      targetNodeId: 'order',
    },
  ]
  const afterDoc = structuredClone(beforeDoc)
  afterDoc.nodeRelations = [
    afterDoc.nodeRelations[2],
    {
      ...afterDoc.nodeRelations[1],
      sourceNodeId: 'normalize',
      targetNodeId: 'order',
      label: 'after',
    },
    {
      id: 'relation_d',
      sourceNodeId: 'order',
      targetNodeId: 'normalize',
    },
  ]
  afterDoc.mappings[0].kind = 'transform'
  afterDoc.mappings[0].label = 'normalized'

  const changes = diffCanonicalFieldWeftDocs(
    canonicalizeFieldWeftDoc(validDoc(beforeDoc)),
    canonicalizeFieldWeftDoc(validDoc(afterDoc)),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'remove' &&
        change.object === 'nodeRelation' &&
        change.id === 'relation_a',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'add' &&
        change.object === 'nodeRelation' &&
        change.id === 'relation_d',
    ),
  )
  for (const property of ['sourceNodeId', 'targetNodeId', 'label']) {
    assert.ok(
      changes.some(
        (change) =>
          change.kind === 'property' &&
          change.object === 'nodeRelation' &&
          change.id === 'relation_b' &&
          change.property === property,
      ),
    )
  }
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'reorder' &&
        change.object === 'nodeRelation' &&
        change.beforeIds.join(',') === 'relation_b,relation_c' &&
        change.afterIds.join(',') === 'relation_c,relation_b',
    ),
  )
  for (const property of ['kind', 'label']) {
    assert.ok(
      changes.some(
        (change) =>
          change.kind === 'property' &&
          change.object === 'mapping' &&
          change.id === beforeDoc.mappings[0].id &&
          change.property === property,
      ),
    )
  }
  assert.equal(
    changes.some(
      (change) =>
        (change.kind === 'add' || change.kind === 'remove') &&
        change.object === 'mapping' &&
        change.id === beforeDoc.mappings[0].id,
    ),
    false,
  )
}

// clone처럼 ID가 바뀐 field는 rename/move가 아니라 remove/add identity 변화다.
{
  const cloned = makeValidDoc()
  cloned.entities[0].fields[3].children[0].id = 'amount_clone_f'
  cloned.mappings[0].sourceFieldId = 'amount_clone_f'
  const changes = diffCanonicalFieldWeftDocs(
    canonical,
    canonicalizeFieldWeftDoc(validDoc(cloned)),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'remove' &&
        change.object === 'field' &&
        change.id === 'amount_f',
    ),
  )
  assert.ok(
    changes.some(
      (change) =>
        change.kind === 'add' &&
        change.object === 'field' &&
        change.id === 'amount_clone_f',
    ),
  )
  assert.equal(
    changes.some(
      (change) =>
        (change.kind === 'rename' || change.kind === 'move') &&
        (change.id === 'amount_f' || change.id === 'amount_clone_f'),
    ),
    false,
  )
}

// 공개 code-spec의 모든 JSON code block은 실제 v1 validator를 통과해야 한다.
{
  const spec = readFileSync(join(root, 'docs', 'code-spec.md'), 'utf8')
  const examples = [...spec.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  assert.ok(examples.length >= 2)
  examples.forEach((match, index) => {
    const doc = JSON.parse(match[1])
    const result = validateFieldWeftDocV1(doc)
    assert.equal(
      result.ok,
      true,
      `code-spec JSON example ${index + 1}: ${
        result.ok ? '' : JSON.stringify(result.errors, null, 2)
      }`,
    )
    if (result.ok) {
      const canonicalJson = JSON.parse(
        JSON.stringify(canonicalizeFieldWeftDoc(result.doc)),
      )
      assert.deepEqual(canonicalJson, doc)
    }
  })
}

// Public documentation, commentary, and examples share the same links and validation boundary.
{
  const documentation = [
    { path: 'README.md', normative: true },
    { path: 'README.ko.md', normative: false },
    { path: 'CONTRIBUTING.md', normative: true },
    { path: 'CONTRIBUTING.ko.md', normative: false },
    { path: 'docs/code-spec.md', normative: true },
    { path: 'docs/fieldweft-authoring-guide.md', normative: true },
    { path: 'docs/fieldweft-adapter-guide.md', normative: true },
    { path: 'docs/fieldweft-sharing-guide.md', normative: true },
    { path: 'docs/public-api-manifest.md', normative: true },
    { path: 'docs/ko/README.md', normative: false },
    { path: 'docs/ko/code-spec.md', normative: false },
    { path: 'docs/ko/fieldweft-authoring-guide.md', normative: false },
    { path: 'docs/ko/fieldweft-adapter-guide.md', normative: false },
    { path: 'docs/ko/fieldweft-sharing-guide.md', normative: false },
  ]
  for (const document of documentation) {
    const documentPath = join(root, ...document.path.split('/'))
    const contents = readFileSync(documentPath, 'utf8')
    assert.match(contents, /FieldWeft/)
    if (document.normative) {
      assert.match(contents, /English[\s\S]*normative/)
    } else {
      assert.match(contents, /non-normative|비정본/)
    }
    for (const match of contents.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0]
      if (!target || /^[a-z]+:/i.test(target) || target.startsWith('/')) continue
      assert.equal(
        existsSync(join(dirname(documentPath), target)),
        true,
        `${document.path} has a missing link target: ${target}`,
      )
    }
    for (const [index, match] of [
      ...contents.matchAll(/```json\s*\n([\s\S]*?)\n```/g),
    ].entries()) {
      const example = JSON.parse(match[1])
      assert.deepEqual(
        validateJsonSchema(fieldWeftSchema, example),
        [],
        `${document.path} JSON example ${index + 1} schema`,
      )
      const result = validateFieldWeftDocV1(example)
      assert.equal(
        result.ok,
        true,
        `${document.path} JSON example ${index + 1}: ${
          result.ok ? '' : JSON.stringify(result.errors, null, 2)
        }`,
      )
    }
  }

  const contributionGuide = readFileSync(
    join(root, 'CONTRIBUTING.md'),
    'utf8',
  )
  assert.match(
    contributionGuide,
    /you are its copyright owner\s+or are authorized by its copyright owner/,
  )
  assert.match(
    contributionGuide,
    /approval required from an employer\s+or other third-party rights holder/,
  )
  assert.match(
    contributionGuide,
    /Disclose any known third-party license or\s+other restriction/,
  )

  const koreanContributionGuide = readFileSync(
    join(root, 'CONTRIBUTING.ko.md'),
    'utf8',
  )
  assert.match(
    koreanContributionGuide,
    /저작권자이거나 저작권자로부터 이\s+라이선스에 따라 제출할 권한/,
  )
  assert.match(
    koreanContributionGuide,
    /고용주나 기타 제3자 권리자로부터\s+제출에 필요한 승인/,
  )
  assert.match(
    koreanContributionGuide,
    /알려진 제3자 라이선스나 기타\s+제한이 있으면 공개/,
  )

  const packageJson = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  )
  assert.equal(packageJson.license, 'Apache-2.0')
  for (const packageFile of [
    'CONTRIBUTING.md',
    'CONTRIBUTING.ko.md',
    'LICENSE',
    'src/adapter-reference.ts',
  ]) {
    assert.equal(
      packageJson.files.includes(packageFile),
      true,
      `Package files are missing a public asset: ${packageFile}`,
    )
  }
  assert.equal(
    Object.hasOwn(packageJson.exports, './adapter-reference'),
    false,
  )

  const licenseBytes = readFileSync(join(root, 'LICENSE'))
  assert.equal(
    createHash('sha256').update(licenseBytes).digest('hex'),
    'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
  )
  const license = licenseBytes.toString('utf8')
  assert.match(license, /Apache License\s+Version 2\.0, January 2004/)
  assert.match(
    license,
    /TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION/,
  )
  for (let section = 1; section <= 9; section++) {
    assert.match(license, new RegExp(`^\\s*${section}\\. `, 'm'))
  }
  assert.match(license, /END OF TERMS AND CONDITIONS/)
  assert.match(license, /APPENDIX: How to apply the Apache License to your work\./)

  const koreanSpec = readFileSync(
    join(root, 'docs', 'ko', 'code-spec.md'),
    'utf8',
  )
  for (const publicName of [
    'type FieldWeftNodeRelationV1 = {',
    '`FieldWeftSemanticProjectionV1`',
    '`FieldWeftLayoutProjectionV1`',
  ]) {
    assert.equal(
      koreanSpec.includes(publicName),
      true,
      `Korean specification is missing a public type name: ${publicName}`,
    )
  }
  for (const legacyName of [
    'type NodeRelation = {',
    '`SemanticProjectionV1`',
    '`LayoutProjectionV1`',
  ]) {
    assert.equal(
      koreanSpec.includes(legacyName),
      false,
      `Korean specification retains a legacy type name: ${legacyName}`,
    )
  }

  const sharingGuides = [
    readFileSync(join(root, 'docs', 'fieldweft-sharing-guide.md'), 'utf8'),
    readFileSync(
      join(root, 'docs', 'ko', 'fieldweft-sharing-guide.md'),
      'utf8',
    ),
  ]
  for (const sharingGuide of sharingGuides) {
    for (const fixtureName of [
      'fieldweft-d1-v1-golden.json',
      'fieldweft-d1-v1-rich-golden.json',
    ]) {
      assert.equal(
        sharingGuide.includes(fixtureName),
        true,
        `Sharing guide is missing a named fixture: ${fixtureName}`,
      )
    }
  }
  assert.match(sharingGuides[0], /## Non-normative integration boundary/)
  assert.match(sharingGuides[1], /## 비규범 통합 경계/)
  const normativeSharingSections = [
    sharingGuides[0].split('## Non-normative integration boundary')[0],
    sharingGuides[1].split('## 비규범 통합 경계')[0],
  ]
  for (const webPolicy of [
    'Long-link warning',
    'Complete URL emitted by the product',
    'General raw JSON source',
    'Multi-page backup JSON',
    'stored as a new page',
    'complete graph is fit',
    '긴 링크 경고',
    '제품이 발행하는 전체 URL',
    '일반 raw JSON source',
    '여러 페이지 backup JSON',
    '기존 페이지를 덮지 않는 새',
    '전체 graph를 fit',
  ]) {
    assert.equal(
      normativeSharingSections.some((section) => section.includes(webPolicy)),
      false,
      `Normative share section retains web policy: ${webPolicy}`,
    )
  }
  const normativeContractDocs = [
    readFileSync(join(root, 'docs', 'code-spec.md'), 'utf8'),
    readFileSync(join(root, 'docs', 'fieldweft-authoring-guide.md'), 'utf8'),
    koreanSpec,
    readFileSync(
      join(root, 'docs', 'ko', 'fieldweft-authoring-guide.md'),
      'utf8',
    ),
  ]
  for (const backupLimit of [
    'backup JSON input and output: at most 64',
    'backup JSON to 64 MiB',
    'backup JSON input/output: UTF-8 최대 64',
    'backup JSON은 64 MiB',
  ]) {
    assert.equal(
      normativeContractDocs.some((document) => document.includes(backupLimit)),
      false,
      `Core documentation retains a web-owned backup limit: ${backupLimit}`,
    )
  }

  const exampleNames = [
    'table-job-node-relations.json',
    'table-job-field-lineage.json',
  ]
  const examples = exampleNames.map((name) =>
    JSON.parse(
      readFileSync(join(root, 'docs', 'examples', name), 'utf8'),
    ),
  )
  examples.forEach((example, index) => {
    assert.deepEqual(validateJsonSchema(fieldWeftSchema, example), [])
    const result = validateFieldWeftDocV1(example)
    assert.equal(
      result.ok,
      true,
      `${exampleNames[index]}: ${
        result.ok ? '' : JSON.stringify(result.errors, null, 2)
      }`,
    )
  })
  assert.equal(examples[0].entities.some((entity) => entity.position), false)
  assert.ok(examples[0].nodeRelations.length > 0)
  assert.equal(examples[0].mappings.length, 0)
  assert.ok(examples[1].nodeRelations.length > 0)
  assert.ok(examples[1].mappings.length > 0)

  const firstId = await deterministicAdapterId('mapping', [
    'warehouse',
    'raw.order_id',
    'analytics.order_id',
  ])
  assert.match(firstId, /^mapping_[A-Za-z0-9_-]{16}$/)
  assert.equal(firstId, 'mapping_oE35MSplMH3ChAzX')
  assert.equal(
    await deterministicAdapterId('mapping', [
      'warehouse',
      'raw.order_id',
      'analytics.order_id',
    ]),
    firstId,
  )
  assert.notEqual(
    await deterministicAdapterId('mapping', [
      'warehouse',
      'raw.order_id',
      'analytics.customer_id',
    ]),
    firstId,
  )
  assert.notEqual(
    await deterministicAdapterId('mapping', ['a', 'bc']),
    await deterministicAdapterId('mapping', ['ab', 'c']),
    'Length-prefix encoding must preserve tuple-part boundaries.',
  )
  assert.notEqual(
    await deterministicAdapterId('entity', ['caf\u00e9']),
    await deterministicAdapterId('entity', ['cafe\u0301']),
    'Unicode identity must remain unnormalized without source-system rules.',
  )
  const maximumAdapterId = await deterministicAdapterId('a'.repeat(239), [
    'source',
  ])
  assert.equal(maximumAdapterId.length, FIELD_WEFT_MAX_ID_CHARS_V1)
  await assert.rejects(
    deterministicAdapterId('a'.repeat(240), ['source']),
    /objectKind must be at most 239 characters/,
  )

  const adapterGuide = readFileSync(
    join(root, 'docs', 'fieldweft-adapter-guide.md'),
    'utf8',
  )
  assert.match(adapterGuide, /mapping `kind` and `label`[\s\S]*?identity input/)
  assert.match(adapterGuide, /property update/)
  assert.match(adapterGuide, /relation\.self_ambiguous/)
  assert.match(
    adapterGuide,
    /same source revision[\s\S]*?different times[\s\S]*?same annotations/,
  )
  assert.match(adapterGuide, /request, trace, or job IDs[\s\S]*?sidecar/)
  const normalizedAdapterGuide = adapterGuide.replace(/\s+/g, ' ')
  for (const decision of [
    'Do not add a separate part count.',
    'do not apply Unicode normalization',
    'fail explicitly instead of appending an arbitrary suffix',
    'at most 239 ASCII characters',
  ]) {
    assert.equal(
      normalizedAdapterGuide.includes(decision),
      true,
      `Adapter guide is missing an identity decision: ${decision}`,
    )
  }
  for (const formula of [
    'newRelative = oldAbsolute - newBoundaryAbsolute',
    'newAbsolute = oldRelative + oldBoundaryAbsolute',
    'preservedAbsolute = oldRelative + oldBoundaryAbsolute',
    'newRelative = preservedAbsolute - newBoundaryAbsolute',
  ]) {
    assert.equal(
      adapterGuide.includes(formula),
      true,
      `Adapter guide is missing a coordinate formula: ${formula}`,
    )
  }

  const spec = readFileSync(join(root, 'docs', 'code-spec.md'), 'utf8')
  const normalizedSpec = spec.replace(/\s+/g, ' ')
  for (const phrase of [
    'each boundary has at most one parent',
    'maximum depth will be 8',
    'relative to their direct parent',
    'Self-membership and cycles',
    'multiple membership will remain forbidden',
  ]) {
    assert.equal(
      normalizedSpec.includes(phrase),
      true,
      `Specification is missing a v2 boundary decision: ${phrase}`,
    )
  }

}

console.log('FieldWeft core document tests passed')
