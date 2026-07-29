import { createHash } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { performance } from 'node:perf_hooks'

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
const BASE36 = 'abcdefghijklmnopqrstuvwxyz0123456789'
const SLUG_MAX_CHARS = 24

function slug(value) {
  const normalized = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, SLUG_MAX_CHARS)
    .replace(/_+$/g, '')
  return normalized || 'field'
}

function deterministicChars(strategy, index, length, alphabet) {
  let out = ''
  let block = 0
  while (out.length < length) {
    const digest = createHash('sha256')
      .update(`${strategy}:${index}:${block++}`)
      .digest()
    for (const byte of digest) {
      out += alphabet[byte % alphabet.length]
      if (out.length === length) break
    }
  }
  return out
}

const STRATEGIES = [
  {
    name: 'sequential',
    make: ({ index }) => `f_${index.toString(36)}`,
  },
  {
    name: 'random-b64url-8',
    bits: 48,
    make: ({ index }) => `f_${deterministicChars('r8', index, 8, BASE64URL)}`,
  },
  {
    name: 'random-b64url-9',
    bits: 54,
    make: ({ index }) => `f_${deterministicChars('r9', index, 9, BASE64URL)}`,
  },
  {
    name: 'random-b64url-10',
    bits: 60,
    make: ({ index }) => `f_${deterministicChars('r10', index, 10, BASE64URL)}`,
  },
  {
    name: 'slug-counter-9-control',
    make: ({ index, fieldName }) =>
      `${slug(fieldName)}_${index.toString(36).padStart(9, '0')}`,
  },
  {
    name: 'slug-b64url-8',
    bits: 48,
    make: ({ index, fieldName }) =>
      `${slug(fieldName)}_${deterministicChars('s8', index, 8, BASE64URL)}`,
  },
  {
    name: 'slug-b64url-9',
    bits: 54,
    make: ({ index, fieldName }) =>
      `${slug(fieldName)}_${deterministicChars('s9', index, 9, BASE64URL)}`,
  },
  {
    name: 'slug-b64url-10',
    bits: 60,
    make: ({ index, fieldName }) =>
      `${slug(fieldName)}_${deterministicChars('s10', index, 10, BASE64URL)}`,
  },
  {
    name: 'node-field-b64url-10',
    bits: 60,
    make: ({ index, nodeName, fieldName }) =>
      `${slug(`${nodeName}_${fieldName}`)}_${deterministicChars('nf10', index, 10, BASE64URL)}`,
  },
  {
    name: 'slug-base36-12',
    bits: 12 * Math.log2(36),
    make: ({ index, fieldName }) =>
      `${slug(fieldName)}_${deterministicChars('s36', index, 12, BASE36)}`,
  },
]

const REALISTIC_NAMES = [
  'id',
  'status',
  'createdAt',
  'updatedAt',
  'customerId',
  'orderId',
  'productId',
  'quantity',
  'amount',
  'currency',
  'region',
  'channel',
  'email',
  'phoneNumber',
  'shippingAddress',
  'paymentMethod',
  'riskScore',
  'metadata',
  'description',
  'externalReference',
]

const MULTILINGUAL_NAMES = [
  '주문상태',
  '고객식별자',
  '배송지주소',
  '결제수단',
  '총결제금액',
  '생성일시',
  '수정일시',
  '처리결과',
  '상세설명',
  '재생성된_아주_긴_필드_이름_with_repeated_suffix',
  '고객이_입력한_긴_메모_필드',
  '외부시스템_연동_참조값',
]

const FIXTURES = [
  {
    name: 'sample',
    entities: 4,
    fieldsPerEntity: 8,
    processes: 1,
    fieldsPerProcess: 8,
    mappings: 12,
    boundaries: 1,
    mode: 'realistic',
  },
  {
    name: 'medium-600',
    entities: 25,
    fieldsPerEntity: 20,
    processes: 5,
    fieldsPerProcess: 20,
    mappings: 80,
    boundaries: 5,
    mode: 'realistic',
  },
  {
    name: 'repeated-600',
    entities: 25,
    fieldsPerEntity: 20,
    processes: 5,
    fieldsPerProcess: 20,
    mappings: 80,
    boundaries: 5,
    mode: 'repeated',
  },
  {
    name: 'multilingual-600',
    entities: 25,
    fieldsPerEntity: 20,
    processes: 5,
    fieldsPerProcess: 20,
    mappings: 80,
    boundaries: 5,
    mode: 'multilingual',
  },
]

function fieldName(mode, fieldIndex) {
  if (fieldIndex === 0) return mode === 'multilingual' ? '주문상태' : 'status'
  if (fieldIndex === 1) return mode === 'multilingual' ? '상세정보' : 'metadata'
  if (mode === 'repeated') return REALISTIC_NAMES[fieldIndex % 6]
  if (mode === 'multilingual') return MULTILINGUAL_NAMES[fieldIndex % MULTILINGUAL_NAMES.length]
  return REALISTIC_NAMES[fieldIndex % REALISTIC_NAMES.length]
}

function buildFixture(config, strategy) {
  let fieldIndex = 0
  const fieldIds = []
  const sources = []
  const targets = []

  const makeId = (nodeName, name) => {
    const id = strategy.make({ index: fieldIndex++, nodeName, fieldName: name })
    fieldIds.push(id)
    return id
  }

  const entities = Array.from({ length: config.entities }, (_, entityIndex) => {
    const nodeName =
      config.mode === 'multilingual' ? `주문도메인${entityIndex}` : `order_entity_${entityIndex}`
    const fields = []
    const statusId = makeId(nodeName, fieldName(config.mode, 0))
    fields.push({
      id: statusId,
      name: fieldName(config.mode, 0),
      type: 'string',
      discriminator: { values: ['ACTIVE', 'CLOSED', 'PENDING'] },
    })
    sources.push(statusId)
    targets.push(statusId)

    const metadataId = makeId(nodeName, fieldName(config.mode, 1))
    fields.push({ id: metadataId, name: fieldName(config.mode, 1), type: 'object' })

    for (let index = 2; index < config.fieldsPerEntity; index++) {
      const name = fieldName(config.mode, index)
      const id = makeId(nodeName, name)
      fields.push({
        id,
        name,
        type: index % 3 === 0 ? 'number' : 'string',
        ...(index % 5 === 0 ? { when: { [statusId]: ['ACTIVE', 'PENDING'] } } : {}),
      })
      sources.push(id)
      targets.push(id)
    }

    return {
      id: `entity_${entityIndex}`,
      name: nodeName,
      kind: entityIndex % 3 === 0 ? 'event' : 'db',
      position: { x: entityIndex * 240, y: (entityIndex % 5) * 160 },
      fields,
      collapsed: [metadataId],
    }
  })

  const processes = Array.from({ length: config.processes }, (_, processIndex) => {
    const nodeName =
      config.mode === 'multilingual' ? `처리프로세스${processIndex}` : `process_${processIndex}`
    const inputCount = Math.floor(config.fieldsPerProcess / 2)
    const outputCount = config.fieldsPerProcess - inputCount
    const inputs = Array.from({ length: inputCount }, (_, index) => {
      const name = fieldName(config.mode, index + 2)
      const id = makeId(nodeName, name)
      targets.push(id)
      return { id, name, type: index % 2 === 0 ? 'string' : 'number' }
    })
    const outputs = Array.from({ length: outputCount }, (_, index) => {
      const name = fieldName(config.mode, index + inputCount + 2)
      const id = makeId(nodeName, name)
      sources.push(id)
      return { id, name, type: index % 2 === 0 ? 'string' : 'number' }
    })
    return {
      id: `process_${processIndex}`,
      name: nodeName,
      kind: 'api',
      position: { x: processIndex * 260, y: 960 },
      inputs,
      outputs,
    }
  })

  const nodeIds = [...entities.map((entity) => entity.id), ...processes.map((process) => process.id)]
  const boundaries = Array.from({ length: config.boundaries }, (_, boundaryIndex) => ({
    id: `boundary_${boundaryIndex}`,
    name: `Boundary ${boundaryIndex}`,
    position: { x: boundaryIndex * 120, y: boundaryIndex * 80 },
    size: { width: 1200, height: 800 },
    members: nodeIds.filter((_, index) => index % config.boundaries === boundaryIndex),
  }))
  const mappings = Array.from({ length: config.mappings }, (_, mappingIndex) => ({
    id: `mapping_${mappingIndex}`,
    sourceFieldId: sources[mappingIndex % sources.length],
    targetFieldId: targets[(mappingIndex * 7 + 3) % targets.length],
    ...(mappingIndex % 4 === 0 ? { kind: 'transform', label: 'normalize' } : {}),
  }))

  return {
    doc: {
      format: 'fieldweft',
      version: 1,
      entities,
      processes,
      boundaries,
      nodeRelations: [],
      mappings,
    },
    fieldIds,
  }
}

function visitFields(fields, visit) {
  for (const field of fields) {
    visit(field)
    if (field.children) visitFields(field.children, visit)
  }
}

function fieldIdOccurrenceBytes(doc) {
  let bytes = 0
  const add = (value) => {
    bytes += Buffer.byteLength(value)
  }
  for (const entity of doc.entities) {
    visitFields(entity.fields, (field) => {
      add(field.id)
      if (field.when) Object.keys(field.when).forEach(add)
    })
    entity.collapsed?.forEach(add)
  }
  for (const process of doc.processes) {
    visitFields(process.inputs, (field) => add(field.id))
    visitFields(process.outputs, (field) => add(field.id))
  }
  for (const mapping of doc.mappings) {
    add(mapping.sourceFieldId)
    add(mapping.targetFieldId)
  }
  return bytes
}

function measure(config, strategy) {
  const started = performance.now()
  const { doc, fieldIds } = buildFixture(config, strategy)
  const json = JSON.stringify(doc)
  const jsonBytes = Buffer.byteLength(json)
  const compressedBytes = deflateRawSync(Buffer.from(json), { level: 9 }).length
  return {
    fixture: config.name,
    strategy: strategy.name,
    fields: fieldIds.length,
    idDefinitionBytes: fieldIds.reduce((sum, id) => sum + Buffer.byteLength(id), 0),
    idOccurrenceBytes: fieldIdOccurrenceBytes(doc),
    jsonBytes,
    compressedBytes,
    tokenChars: Math.ceil((compressedBytes * 4) / 3),
    elapsedMs: performance.now() - started,
  }
}

function collisionProbability(bits, generated) {
  const space = 2 ** bits
  const exponent = -(generated * (generated - 1)) / (2 * space)
  return -Math.expm1(exponent)
}

const rows = FIXTURES.flatMap((fixture) => STRATEGIES.map((strategy) => measure(fixture, strategy)))
const controls = new Map(
  rows
    .filter((row) => row.strategy === 'slug-counter-9-control')
    .map((row) => [row.fixture, row.compressedBytes]),
)

if (process.argv.includes('--smoke')) {
  const expectedRows = FIXTURES.length * STRATEGIES.length
  if (
    rows.length !== expectedRows ||
    controls.size !== FIXTURES.length ||
    rows.some(
      (row) =>
        row.fields <= 0 ||
        row.jsonBytes <= 0 ||
        row.compressedBytes <= 0 ||
        !Number.isFinite(row.elapsedMs),
    )
  ) {
    throw new Error('Field ID benchmark smoke produced invalid measurements.')
  }
  console.log(`Field ID benchmark smoke passed (${rows.length} measurements).`)
  process.exit(0)
}

console.log(`# Field ID micro benchmark`)
console.log(``)
console.log(`- runtime: ${process.version}`)
console.log(`- compression: node:zlib deflateRaw level 9`)
console.log(`- slug max: ${SLUG_MAX_CHARS} ASCII chars`)
console.log(`- deterministic hash bytes are benchmark-only; production uses Web Crypto`)
console.log(``)
console.log(
  '| fixture | strategy | fields | ID def bytes | ID occurrence bytes | JSON bytes | deflate bytes | token chars | Δ deflate vs slug-counter-9 | ms |',
)
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|')
for (const row of rows) {
  const delta = row.compressedBytes - controls.get(row.fixture)
  console.log(
    `| ${row.fixture} | ${row.strategy} | ${row.fields} | ${row.idDefinitionBytes} | ${row.idOccurrenceBytes} | ${row.jsonBytes} | ${row.compressedBytes} | ${row.tokenChars} | ${delta >= 0 ? '+' : ''}${delta} | ${row.elapsedMs.toFixed(2)} |`,
  )
}

console.log(``)
console.log(`## Collision estimates before current-document retry`)
console.log(``)
console.log('| suffix | entropy bits | 100k generated | 1m generated | 10m generated |')
console.log('|---|---:|---:|---:|---:|')
for (const candidate of [
  ['base64url-8', 48],
  ['base64url-9', 54],
  ['base64url-10', 60],
  ['base36-12', 12 * Math.log2(36)],
]) {
  const [name, bits] = candidate
  const probabilities = [100_000, 1_000_000, 10_000_000].map((count) =>
    collisionProbability(bits, count),
  )
  console.log(
    `| ${name} | ${bits.toFixed(2)} | ${probabilities[0].toExponential(3)} | ${probabilities[1].toExponential(3)} | ${probabilities[2].toExponential(3)} |`,
  )
}
