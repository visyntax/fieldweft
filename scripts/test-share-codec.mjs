import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const {
  FIELD_WEFT_BOUNDARY_COLORS_V1,
  FIELD_WEFT_BOUNDARY_KINDS_V1,
  FIELD_WEFT_ENTITY_KINDS_V1,
  FIELD_WEFT_FIELD_TYPES_V1,
  FIELD_WEFT_MAPPING_KINDS_V1,
  FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1,
  FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
  FIELD_WEFT_MAX_DIAGNOSTICS_V1,
  FIELD_WEFT_MAX_FIELD_DEPTH_V1,
  FIELD_WEFT_MAX_LABEL_CHARS_V1,
  FIELD_WEFT_MAX_NODES_V1,
  FIELD_WEFT_MAX_RELATIONS_V1,
  FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1,
  FIELD_WEFT_MAX_VARIANT_VALUES_V1,
} = await import('../dist/index.js')
const { readCanonicalFieldWeftDoc } = await import('../dist/index.js')
const {
  FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES,
  FIELD_WEFT_MAX_SHARE_TOKEN_CHARS,
  FIELD_WEFT_SHARE_PACK_VERSION,
  FieldWeftShareTupleError,
  decodeFieldWeftShare,
  encodeFieldWeftShare,
  packFieldWeftShareDocV1,
  unpackFieldWeftShareDocV1,
} = await import('../dist/index.js')

const canonicalInput = JSON.parse(
  readFileSync(
    join(root, 'fixtures', 'fieldweft-canonical-v1-input.json'),
    'utf8',
  ),
)
const golden = JSON.parse(
  readFileSync(
    join(root, 'fixtures', 'fieldweft-d1-v1-golden.json'),
    'utf8',
  ),
)
const richGolden = JSON.parse(
  readFileSync(
    join(
      root,
      'fixtures',
      'fieldweft-d1-v1-rich-golden.json',
    ),
    'utf8',
  ),
)

function canonical(doc) {
  const result = readCanonicalFieldWeftDoc(doc)
  if (!result.ok) {
    assert.fail(`expected valid FieldWeft:\n${JSON.stringify(result.errors, null, 2)}`)
  }
  return result.doc
}

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

function tokenFromBytes(bytes) {
  return `d1.${deflateSync(bytes).toString('base64url')}`
}

function tokenFromJson(value) {
  return tokenFromBytes(Buffer.from(JSON.stringify(value)))
}

// Canonical fixtures round-trip without mutation, and the public d1 vector is exact.
{
  const document = canonical(canonicalInput)
  const documentBefore = JSON.stringify(document)
  const packed = packFieldWeftShareDocV1(document)
  assert.equal(JSON.stringify(document), documentBefore)
  assert.equal(packed[0], FIELD_WEFT_SHARE_PACK_VERSION)
  const packedBefore = structuredClone(packed)
  assert.deepEqual(plain(canonical(unpackFieldWeftShareDocV1(packed))), plain(document))
  assert.deepEqual(packed, packedBefore)

  const goldenDocument = canonical(golden.document)
  assert.deepEqual(packFieldWeftShareDocV1(goldenDocument), golden.packed)
  assert.deepEqual(
    plain(canonical(unpackFieldWeftShareDocV1(golden.packed))),
    plain(goldenDocument),
  )
  assert.equal(JSON.stringify(golden.packed).includes('fieldweft'), false)

  const richDocument = canonical(richGolden.document)
  const richDocumentBefore = JSON.stringify(richDocument)
  const richPacked = packFieldWeftShareDocV1(richDocument)
  assert.equal(JSON.stringify(richDocument), richDocumentBefore)
  assert.deepEqual(richPacked, richGolden.packed)
  assert.deepEqual(richPacked.slice(1, 3), [-5000, 2500])
  assert.deepEqual(richPacked[3][0].slice(3, 5), [40, 80])
  assert.deepEqual(richPacked[3][0][6], [1])
  assert.deepEqual(richPacked[3][1].slice(3, 5), [500, 700])
  assert.deepEqual(richPacked[4][0].slice(3, 5), [2500, 1100])
  assert.deepEqual(richPacked[5][0].slice(2, 4), [0, 0])
  assert.deepEqual(richPacked[5][0][6], [0])
  assert.deepEqual(richPacked[5][0].slice(7, 9), [3, 3])
  assert.deepEqual(richPacked[6][0].slice(0, 5), ['map_in', 2, 4, 0, 0])
  assert.deepEqual(richPacked[6][1].slice(0, 5), [
    'map_out',
    5,
    3,
    2,
    'normalize currency',
  ])
  const richPackedBefore = structuredClone(richPacked)
  assert.deepEqual(
    plain(canonical(unpackFieldWeftShareDocV1(richPacked))),
    plain(richDocument),
  )
  assert.deepEqual(richPacked, richPackedBefore)
}

// Attempted public vocabulary mutation cannot change d1 enum indexes.
{
  const document = canonical(richGolden.document)
  const packedBefore = packFieldWeftShareDocV1(document)
  for (const vocabulary of [
    FIELD_WEFT_BOUNDARY_COLORS_V1,
    FIELD_WEFT_BOUNDARY_KINDS_V1,
    FIELD_WEFT_ENTITY_KINDS_V1,
    FIELD_WEFT_FIELD_TYPES_V1,
    FIELD_WEFT_MAPPING_KINDS_V1,
  ]) {
    assert.equal(Object.isFrozen(vocabulary), true)
    assert.throws(() => vocabulary.push('mutated'), TypeError)
    assert.throws(() => vocabulary.splice(0, 1), TypeError)
  }
  assert.deepEqual(packFieldWeftShareDocV1(document), packedBefore)
  assert.deepEqual(
    plain(canonical(unpackFieldWeftShareDocV1(packedBefore))),
    plain(document),
  )
}

// Empty optional slots and strict tuple errors keep their wire-level contracts.
{
  const empty = canonical({
    format: 'fieldweft',
    version: 1,
    entities: [],
    processes: [],
    boundaries: [],
    nodeRelations: [],
    mappings: [],
  })
  const packed = packFieldWeftShareDocV1(empty)
  assert.deepEqual(packed, [1, 0, 0, [], [], [], []])
  assert.deepEqual(plain(canonical(unpackFieldWeftShareDocV1(packed))), plain(empty))

  assert.throws(
    () => unpackFieldWeftShareDocV1([999, 0, 0, [], [], [], []]),
    (error) =>
      error instanceof FieldWeftShareTupleError &&
      error.code === 'tuple.version' &&
      assert.deepEqual(error.params, { expected: 1 }) === undefined,
  )

  const invalidFlags = [
    1,
    0,
    0,
    [['entity', 'Entity', 0, 0, 0, [['field_id', 'value', 1, 8]]]],
    [],
    [],
    [],
  ]
  assert.throws(
    () => unpackFieldWeftShareDocV1(invalidFlags),
    (error) =>
      error instanceof FieldWeftShareTupleError &&
      error.code === 'tuple.flags' &&
      assert.deepEqual(error.params, { flags: 8 }) === undefined,
  )
}

// Encoding and decoding use the same canonical contract and expose diagnostic params.
{
  const document = canonical(canonicalInput)
  const encoded = await encodeFieldWeftShare(document)
  assert.equal(encoded.kind, 'ok')
  assert.equal(encoded.token.startsWith('d1.'), true)
  assert.equal(encoded.tokenChars, encoded.token.length)
  const decoded = await decodeFieldWeftShare(encoded.token)
  assert.equal(decoded.kind, 'ok')
  assert.deepEqual(plain(decoded.doc), plain(document))

  const duplicate = structuredClone(canonicalInput)
  duplicate.entities[0].fields[1].id = duplicate.entities[0].fields[0].id
  const invalid = await encodeFieldWeftShare(duplicate)
  assert.equal(invalid.kind, 'invalid')
  assert.equal(invalid.diagnostics[0].code, 'id.duplicate-field')
  assert.deepEqual(invalid.diagnostics[0].params, {
    id: duplicate.entities[0].fields[0].id,
  })

  const accessorBacked = structuredClone(canonicalInput)
  let accessorReads = 0
  Object.defineProperty(accessorBacked.entities[0], 'id', {
    enumerable: true,
    get() {
      accessorReads++
      return accessorReads === 1 ? 'entity' : '!'.repeat(500)
    },
  })
  const unstable = await encodeFieldWeftShare(accessorBacked)
  assert.equal(unstable.kind, 'invalid')
  assert.equal(unstable.diagnostics[0].code, 'input.unstable')
  assert.equal(unstable.diagnostics[0].path, '/entities/0/id')
  assert.equal(accessorReads, 0)

  const oversizedDescription = structuredClone(golden.document)
  oversizedDescription.entities[0].description = 'x'.repeat(
    FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1 + 1,
  )
  assert.deepEqual(await encodeFieldWeftShare(oversizedDescription), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1',
  })

  const oversizedAnnotations = {
    format: 'fieldweft',
    version: 1,
    entities: [],
    processes: [],
    boundaries: Array.from(
      {
        length:
          Math.floor(
            FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1 /
              FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
          ) + 1,
      },
      (_, index) => ({
        id: `boundary_${index}`,
        name: 'Boundary',
        description: 'x'.repeat(FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1),
      }),
    ),
    nodeRelations: [],
    mappings: [],
  }
  assert.deepEqual(await encodeFieldWeftShare(oversizedAnnotations), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1',
  })

  const manyUnknownProperties = structuredClone(golden.document)
  for (let index = 0; index < FIELD_WEFT_MAX_DIAGNOSTICS_V1 + 50; index++) {
    manyUnknownProperties[`x${index}`] = true
  }
  const truncated = await encodeFieldWeftShare(manyUnknownProperties)
  assert.equal(truncated.kind, 'invalid')
  assert.equal(truncated.diagnostics.length, FIELD_WEFT_MAX_DIAGNOSTICS_V1)
  assert.deepEqual(truncated.diagnostics.at(-1), {
    code: 'diagnostics.truncated',
    path: '',
    severity: 'error',
    message: 'Additional diagnostics were omitted after reaching the limit.',
    params: { limit: FIELD_WEFT_MAX_DIAGNOSTICS_V1 },
  })

  const limitBeforeTruncation = {
    format: 'fieldweft',
    version: 1,
    entities: [
      {
        id: 'limited',
        name: 'Limited',
        kind: 'db',
        fields: [],
        tags: Array.from(
          { length: FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1 + 1 },
          (_, index) => `tag_${index}`,
        ),
      },
      { id: 'invalid', name: 'Invalid', kind: 'db', fields: [] },
    ],
    processes: [],
    boundaries: [],
    nodeRelations: [],
    mappings: [],
  }
  for (let index = 0; index < FIELD_WEFT_MAX_DIAGNOSTICS_V1; index++) {
    limitBeforeTruncation.entities[1][`x${index}`] = true
  }
  const limited = readCanonicalFieldWeftDoc(limitBeforeTruncation)
  assert.equal(limited.ok, false)
  assert.equal(limited.errors.length, FIELD_WEFT_MAX_DIAGNOSTICS_V1)
  assert.equal(limited.errors[0].code, 'limit.tags-per-object')
  assert.deepEqual(limited.errors.at(-1), truncated.diagnostics.at(-1))
  assert.deepEqual(await encodeFieldWeftShare(limitBeforeTruncation), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1',
  })
}

// Envelope, compression, UTF-8, JSON, tuple, and resource gates are distinguished.
{
  assert.deepEqual(await decodeFieldWeftShare('x1.AA'), {
    kind: 'unsupported',
    format: 'x1',
  })
  for (const token of ['d1', 'd1.', 'd1.*', 'd1.A', 'd1.AB']) {
    assert.equal((await decodeFieldWeftShare(token)).kind, 'invalid')
  }
  assert.equal((await decodeFieldWeftShare('d1.AA')).reason, 'deflate')
  assert.deepEqual(await decodeFieldWeftShare(tokenFromBytes(Buffer.from([0xc3, 0x28]))), {
    kind: 'invalid',
    reason: 'utf8',
  })
  assert.deepEqual(await decodeFieldWeftShare(tokenFromBytes(Buffer.from('{'))), {
    kind: 'invalid',
    reason: 'json',
  })
  assert.deepEqual(
    await decodeFieldWeftShare(tokenFromJson([999, 0, 0, [], [], [], []])),
    { kind: 'invalid', reason: 'tuple.version' },
  )

  const duplicateFieldTuple = [
    1,
    0,
    0,
    [
      [
        'entity',
        'Entity',
        0,
        0,
        0,
        [
          ['duplicate_id', 'first', 1, 0],
          ['duplicate_id', 'second', 1, 0],
        ],
      ],
    ],
    [],
    [],
    [],
  ]
  const invalidDocument = await decodeFieldWeftShare(tokenFromJson(duplicateFieldTuple))
  assert.equal(invalidDocument.kind, 'invalid')
  assert.equal(invalidDocument.reason, 'fieldweft')
  assert.equal(invalidDocument.diagnostics[0].code, 'id.duplicate-field')
  assert.deepEqual(invalidDocument.diagnostics[0].params, {
    id: 'duplicate_id',
  })

  const boundaryEndpoint = [
    1,
    0,
    0,
    [['entity', 'Entity', 2, 0, 0, []]],
    [],
    [['boundary', 'Boundary', 0, 0, 380, 240]],
    [],
    [['invalid_boundary_endpoint', 0, 1]],
  ]
  assert.deepEqual(await decodeFieldWeftShare(tokenFromJson(boundaryEndpoint)), {
    kind: 'invalid',
    reason: 'tuple.index-range',
  })

  const badMappingIndex = [
    1,
    0,
    0,
    [['entity', 'Entity', 0, 0, 0, [['field_id', 'value', 1, 0]]]],
    [],
    [],
    [['mapping', 0, 1]],
  ]
  assert.deepEqual(await decodeFieldWeftShare(tokenFromJson(badMappingIndex)), {
    kind: 'invalid',
    reason: 'tuple.index-range',
  })

  const tooManyNodes = [
    1,
    0,
    0,
    Array.from({ length: FIELD_WEFT_MAX_NODES_V1 + 1 }, () => 0),
    [],
    [],
    [],
  ]
  assert.deepEqual(await decodeFieldWeftShare(tokenFromJson(tooManyNodes)), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_NODES_V1',
  })

  const tooManyRelations = [
    1,
    0,
    0,
    [],
    [],
    [],
    Array.from({ length: FIELD_WEFT_MAX_RELATIONS_V1 / 2 }, () => 0),
    Array.from({ length: FIELD_WEFT_MAX_RELATIONS_V1 / 2 + 1 }, () => 0),
  ]
  assert.deepEqual(await decodeFieldWeftShare(tokenFromJson(tooManyRelations)), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_RELATIONS_V1',
  })

  let deepField = ['leaf_id', 'leaf', 1, 0]
  for (let depth = 0; depth < FIELD_WEFT_MAX_FIELD_DEPTH_V1 + 2; depth++) {
    deepField = [`field_${depth}`, `field ${depth}`, 5, 0, [deepField]]
  }
  const tooDeep = [
    1,
    0,
    0,
    [['entity', 'Entity', 0, 0, 0, [deepField]]],
    [],
    [],
    [],
  ]
  assert.deepEqual(await decodeFieldWeftShare(tokenFromJson(tooDeep)), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_FIELD_DEPTH_V1',
  })

  assert.notEqual(
    (await decodeFieldWeftShare('x'.repeat(FIELD_WEFT_MAX_SHARE_TOKEN_CHARS))).kind,
    'too-large',
  )
  assert.deepEqual(await decodeFieldWeftShare('x'.repeat(FIELD_WEFT_MAX_SHARE_TOKEN_CHARS + 1)), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_SHARE_TOKEN_CHARS',
  })

  assert.equal(
    (
      await decodeFieldWeftShare(
        tokenFromBytes(Buffer.alloc(FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES, 0x20)),
      )
    ).kind,
    'invalid',
  )
  assert.deepEqual(
    await decodeFieldWeftShare(
      tokenFromBytes(
        Buffer.alloc(FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES + 1, 0x20),
      ),
    ),
    { kind: 'too-large', limit: 'FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES' },
  )
}

// Validator resource diagnostics are mapped to stable public limit names.
{
  const tooManyRelations = structuredClone(golden.document)
  tooManyRelations.nodeRelations = Array.from(
    { length: FIELD_WEFT_MAX_RELATIONS_V1 + 1 },
    (_, index) => ({
      id: `relation_${index}`,
      sourceNodeId: 'source',
      targetNodeId: 'target',
    }),
  )
  assert.deepEqual(await encodeFieldWeftShare(tooManyRelations), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_RELATIONS_V1',
  })

  const tooLongLabel = structuredClone(golden.document)
  tooLongLabel.nodeRelations[0].label = 'x'.repeat(
    FIELD_WEFT_MAX_LABEL_CHARS_V1 + 1,
  )
  assert.deepEqual(await encodeFieldWeftShare(tooLongLabel), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_LABEL_CHARS_V1',
  })

  const tooManyVariants = structuredClone(canonicalInput)
  tooManyVariants.entities[0].fields[0].discriminator.values = Array.from(
    { length: FIELD_WEFT_MAX_VARIANT_VALUES_V1 + 1 },
    (_, index) => `variant_${index}`,
  )
  assert.deepEqual(await encodeFieldWeftShare(tooManyVariants), {
    kind: 'too-large',
    limit: 'FIELD_WEFT_MAX_VARIANT_VALUES_V1',
  })
}

console.log('FieldWeft share codec tests passed')
