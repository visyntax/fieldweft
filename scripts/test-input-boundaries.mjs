import assert from 'node:assert/strict'

const { parseFieldWeftDocJson, readCanonicalFieldWeftDoc } =
  await import('../dist/index.js')
const {
  FIELD_WEFT_MAX_CANONICAL_BYTES_V1,
  FIELD_WEFT_MAX_SOURCE_BYTES_V1,
} = await import('../dist/index.js')

function emptyDoc(extra = {}) {
  return {
    format: 'fieldweft',
    version: 1,
    entities: [],
    processes: [],
    boundaries: [],
    nodeRelations: [],
    mappings: [],
    ...extra,
  }
}

// Every external value crosses the same validate-and-canonicalize boundary.
{
  const input = emptyDoc()
  const result = readCanonicalFieldWeftDoc(input)
  assert.equal(result.ok, true)
  assert.equal(result.doc.version, 1)
  assert.deepEqual(Object.keys(result.doc), [
    'format',
    'version',
    'entities',
    'processes',
    'boundaries',
    'nodeRelations',
    'mappings',
  ])
}

// Unsupported versions, parse failures, and source limits use structured diagnostics.
{
  const unsupported = readCanonicalFieldWeftDoc(emptyDoc({ version: 2 }))
  assert.equal(unsupported.ok, false)
  assert.equal(unsupported.errors[0].code, 'version.unsupported')
  assert.equal(unsupported.errors[0].path, '/version')
  assert.deepEqual(unsupported.errors[0].params, { actual: '2' })

  const malformed = parseFieldWeftDocJson('{')
  assert.equal(malformed.ok, false)
  assert.equal(malformed.errors[0].code, 'json.parse')
  assert.equal(typeof malformed.errors[0].params.reason, 'string')

  const fenced = parseFieldWeftDocJson(
    `\`\`\`json\n${JSON.stringify(emptyDoc())}\n\`\`\``,
  )
  assert.equal(fenced.ok, true)

  const oversizedSource = parseFieldWeftDocJson(
    ' '.repeat(FIELD_WEFT_MAX_SOURCE_BYTES_V1 + 1),
  )
  assert.equal(oversizedSource.ok, false)
  assert.equal(oversizedSource.errors[0].code, 'limit.source-bytes')
  assert.deepEqual(oversizedSource.errors[0].params, {
    limit: FIELD_WEFT_MAX_SOURCE_BYTES_V1,
  })
}

// Structured input is also subject to the compact canonical UTF-8 byte gate.
{
  const oversizedCanonical = emptyDoc({
    boundaries: Array.from({ length: 700 }, (_, index) => ({
      id: `boundary_${index}`,
      name: `Boundary ${index}`,
      description: '한'.repeat(4096),
    })),
  })
  const result = readCanonicalFieldWeftDoc(oversizedCanonical)
  assert.equal(result.ok, false)
  assert.equal(result.errors[0].code, 'limit.canonical-bytes')
  assert.deepEqual(result.errors[0].params, {
    limit: FIELD_WEFT_MAX_CANONICAL_BYTES_V1,
  })
}

// Validation never mutates invalid input.
{
  const invalid = emptyDoc({ entities: [{}] })
  const before = structuredClone(invalid)
  const result = readCanonicalFieldWeftDoc(invalid)
  assert.equal(result.ok, false)
  assert.deepEqual(invalid, before)
}

console.log('FieldWeft core input boundary tests passed')
