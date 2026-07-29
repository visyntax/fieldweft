export const legacyCoreWebAliases = [
  'CODE_DOC_FORMAT',
  'CODE_DOC_VERSION',
  'CODE_ENTITY_KINDS',
  'CODE_FIELD_TYPES',
  'CODE_MAPPING_KINDS',
  'MAX_CODEDOC_DESCRIPTION_CHARS',
  'MAX_CODEDOC_ANNOTATION_CODEPOINTS',
  'MAX_CODEDOC_CANONICAL_BYTES',
  'MAX_CODEDOC_FIELD_DEPTH',
  'MAX_CODEDOC_FIELDS',
  'MAX_CODEDOC_ID_CHARS',
  'MAX_CODEDOC_LABEL_CHARS',
  'MAX_CODEDOC_META_ENTRIES',
  'MAX_CODEDOC_META_ENTRIES_PER_OBJECT',
  'MAX_CODEDOC_META_KEY_CHARS',
  'MAX_CODEDOC_META_STRING_CHARS',
  'MAX_CODEDOC_NAME_CHARS',
  'MAX_CODEDOC_NODES',
  'MAX_CODEDOC_RELATIONS',
  'MAX_CODEDOC_SOURCE_BYTES',
  'MAX_CODEDOC_TAG_CHARS',
  'MAX_CODEDOC_TAGS',
  'MAX_CODEDOC_TAGS_PER_OBJECT',
  'MAX_CODEDOC_VARIANT_VALUE_CHARS',
  'MAX_CODEDOC_VARIANT_VALUES',
  'MAX_GRAPH_COORD',
  'RESERVED_FIELDWEFT_IDS',
  'RESERVED_FIELDWEFT_META_KEYS',
  'RESERVED_FIELDWEFT_META_PREFIX',
  'CanonicalCodeDoc',
  'CanonicalBoundary',
  'CanonicalEntity',
  'CanonicalProcess',
  'CodeBoundary',
  'CodeDoc',
  'CodeEntity',
  'CodePosition',
  'CodeProcess',
  'CodeSize',
  'Discriminator',
  'Field',
  'FieldId',
  'FieldMapping',
  'FieldWeftAnnotations',
  'LayoutBoundaryV1',
  'LayoutEntityV1',
  'LayoutProcessV1',
  'LayoutProjectionV1',
  'Metadata',
  'MetadataValue',
  'NodeRelation',
  'SemanticProjectionV1',
  'ValidCodeDoc',
  'When',
  'FieldWeftV1Input',
  'readCodeDoc',
  'validateCodeDocV1',
  'Diagnostic',
  'DiagnosticRelated',
  'ReadCodeDocResult',
  'ValidateCodeDocResult',
  'canonicalizeCodeDoc',
  'projectLayoutCodeDoc',
  'projectSemanticCodeDoc',
  'diffCanonicalCodeDocs',
  'diffSemanticProjections',
  'FieldLocation',
  'FieldOwnerKind',
  'SemanticObjectKind',
  'SemanticStructuralChange',
  'formatCodeDocDiagnostic',
  'parseCodeDocJson',
  'readCanonicalCodeDoc',
  'ReadCanonicalCodeDocResult',
  'canonicalCodeDocUtf8Bytes',
  'serializeCanonicalCodeDoc',
  'SerializeCanonicalCodeDocOptions',
  'allocateFieldId',
  'FIELD_ID_ALLOCATION_ATTEMPTS',
  'FIELD_ID_SLUG_MAX_CHARS',
  'FIELD_ID_SUFFIX_ALPHABET',
  'FIELD_ID_SUFFIX_BITS',
  'FIELD_ID_SUFFIX_LENGTH',
  'fieldIdSlug',
  'FillFieldIdRandomValues',
]

const legacyCoreWebAliasSet = new Set(legacyCoreWebAliases)

const api = (
  publicName,
  kind,
  versionBucket,
  source,
  sourceNames = [],
  note = '',
) => ({
  publicName,
  kind,
  versionBucket,
  source,
  sourceNames,
  webAliases: sourceNames.filter((name) => legacyCoreWebAliasSet.has(name)),
  note,
})

export const webOwnedExports = [
  { name: 'AppEdge', kind: 'type', source: 'src/flow/edge-kind.ts' },
  { name: 'DisplayEdge', kind: 'type', source: 'src/flow/edge-kind.ts' },
  { name: 'DerivedNodeRollupEdge', kind: 'type', source: 'src/flow/edge-kind.ts' },
  { name: 'MappingEdge', kind: 'type', source: 'src/flow/edge-kind.ts' },
  { name: 'NodeRelationEdge', kind: 'type', source: 'src/flow/edge-kind.ts' },
  { name: 'traceNodes', kind: 'function', source: 'src/flow/node-lineage.ts' },
  {
    name: 'collectNodeLineageRelations',
    kind: 'function',
    source: 'src/flow/node-lineage.ts',
  },
  { name: 'NodeLineageItem', kind: 'type', source: 'src/flow/node-lineage.ts' },
  { name: 'NodeLineageRelation', kind: 'type', source: 'src/flow/node-lineage.ts' },
  { name: 'NodeLineageResult', kind: 'type', source: 'src/flow/node-lineage.ts' },
  { name: 'NodeLineageSource', kind: 'type', source: 'src/flow/node-lineage.ts' },
  { name: 'TraceNodesOptions', kind: 'type', source: 'src/flow/node-lineage.ts' },
  { name: 'CodeDocInvariantError', kind: 'class', source: 'src/flow/code-convert.ts' },
  { name: 'docToGraph', kind: 'function', source: 'src/flow/code-convert.ts' },
  { name: 'graphToDoc', kind: 'function', source: 'src/flow/code-convert.ts' },
  { name: 'FIELD_TYPES', kind: 'value', source: 'src/flow/code.ts' },
  { name: 'KINDS', kind: 'value', source: 'src/flow/code.ts' },
  { name: 'graphToCode', kind: 'function', source: 'src/flow/code.ts' },
  { name: 'CodeParseResult', kind: 'type', source: 'src/flow/code.ts' },
  { name: 'codeToGraph', kind: 'function', source: 'src/flow/code.ts' },
]

export const publicApiReview = {
  status: 'approved',
  approvedAt: '2026-07-26',
  reviewItems: [],
}

export const publicPackageExports = [
  {
    subpath: '.',
    kind: 'module',
    target: {
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
  },
  {
    subpath: './schema/v1',
    kind: 'schema',
    target: './schema/fieldweft-v1.schema.json',
  },
  {
    subpath: './fixtures/*',
    kind: 'fixture-pattern',
    target: './fixtures/*',
  },
]

export const publicFixtureFiles = [
  'fieldweft-canonical-v1-compact.json',
  'fieldweft-canonical-v1-input.json',
  'fieldweft-canonical-v1-pretty.json',
  'fieldweft-d1-v1-golden.json',
  'fieldweft-d1-v1-rich-golden.json',
]

export const privatePackageModules = [
  {
    source: 'src/adapter-reference.ts',
    rootExport: false,
    subpathExport: false,
    disposition: 'repository-reference',
    reason:
      'The packaged adapter source is copy-only reference code and is not part of the package API.',
  },
]

const generatedSource = 'src/fieldweft-v1.generated.ts'
const modelSource = 'src/code-model.ts'

const generatedV1Values = [
  ['FIELD_WEFT_VERSION_V1', ['FIELD_WEFT_VERSION', 'CODE_DOC_VERSION']],
  ['FIELD_WEFT_FIELD_TYPES_V1', ['FIELD_WEFT_FIELD_TYPES', 'CODE_FIELD_TYPES']],
  ['FIELD_WEFT_ENTITY_KINDS_V1', ['FIELD_WEFT_ENTITY_KINDS', 'CODE_ENTITY_KINDS']],
  ['FIELD_WEFT_BOUNDARY_COLORS_V1', ['FIELD_WEFT_BOUNDARY_COLORS']],
  ['FIELD_WEFT_BOUNDARY_KINDS_V1', ['FIELD_WEFT_BOUNDARY_KINDS']],
  ['FIELD_WEFT_MAPPING_KINDS_V1', ['FIELD_WEFT_MAPPING_KINDS', 'CODE_MAPPING_KINDS']],
  ['FIELD_WEFT_MAX_ID_CHARS_V1', ['FIELD_WEFT_MAX_ID_CHARS', 'MAX_CODEDOC_ID_CHARS']],
  ['FIELD_WEFT_MAX_NAME_CHARS_V1', ['FIELD_WEFT_MAX_NAME_CHARS', 'MAX_CODEDOC_NAME_CHARS']],
  ['FIELD_WEFT_MAX_LABEL_CHARS_V1', ['FIELD_WEFT_MAX_LABEL_CHARS', 'MAX_CODEDOC_LABEL_CHARS']],
  ['FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1', ['FIELD_WEFT_MAX_DESCRIPTION_CHARS', 'MAX_CODEDOC_DESCRIPTION_CHARS']],
  ['FIELD_WEFT_MAX_TAG_CHARS_V1', ['FIELD_WEFT_MAX_TAG_CHARS', 'MAX_CODEDOC_TAG_CHARS']],
  ['FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1', ['FIELD_WEFT_MAX_TAGS', 'MAX_CODEDOC_TAGS_PER_OBJECT']],
  ['FIELD_WEFT_MAX_META_KEY_CHARS_V1', ['FIELD_WEFT_MAX_META_KEY_CHARS', 'MAX_CODEDOC_META_KEY_CHARS']],
  ['FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1', ['FIELD_WEFT_MAX_META_ENTRIES', 'MAX_CODEDOC_META_ENTRIES_PER_OBJECT']],
  ['FIELD_WEFT_MAX_META_STRING_CHARS_V1', ['FIELD_WEFT_MAX_META_STRING_CHARS', 'MAX_CODEDOC_META_STRING_CHARS']],
  ['FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1', ['FIELD_WEFT_MAX_VARIANT_VALUE_CHARS', 'MAX_CODEDOC_VARIANT_VALUE_CHARS']],
  ['FIELD_WEFT_MAX_VARIANT_VALUES_V1', ['FIELD_WEFT_MAX_VARIANT_VALUES', 'MAX_CODEDOC_VARIANT_VALUES']],
]

const generatedV1Types = [
  ['FieldWeftNameV1', ['FieldWeftName']],
  ['FieldWeftLabelV1', ['FieldWeftLabel']],
  ['FieldWeftDescriptionV1', ['FieldWeftDescription']],
  ['FieldWeftTagV1', ['FieldWeftTag']],
  ['FieldWeftTagsV1', ['FieldWeftTags']],
  ['FieldWeftMetadataValueV1', ['FieldWeftMetadataValue', 'MetadataValue']],
  ['FieldWeftMetadataV1', ['FieldWeftMetadata', 'Metadata']],
  ['FieldWeftVariantValueV1', ['FieldWeftVariantValue']],
  ['FieldWeftVariantValuesV1', ['FieldWeftVariantValues']],
  ['FieldWeftPositionV1', ['FieldWeftPosition', 'CodePosition']],
  ['FieldWeftSizeV1', ['FieldWeftSize', 'CodeSize']],
  ['FieldWeftDiscriminatorV1', ['FieldWeftDiscriminator', 'Discriminator']],
  ['FieldWeftWhenV1', ['FieldWeftWhen', 'When']],
  ['FieldWeftFieldV1', ['FieldWeftField', 'Field']],
  ['FieldWeftEntityV1', ['FieldWeftEntity', 'CodeEntity']],
  ['FieldWeftProcessV1', ['FieldWeftProcess', 'CodeProcess']],
  ['FieldWeftBoundaryV1', ['FieldWeftBoundary', 'CodeBoundary']],
  ['FieldWeftNodeRelationV1', ['FieldWeftNodeRelation', 'NodeRelation']],
  ['FieldWeftMappingV1', ['FieldWeftMapping', 'FieldMapping']],
  ['FieldWeftDocV1', ['FieldWeftV1Input', 'CodeDoc']],
]

const generatedKindTypes = [
  'FieldWeftEntityKindV1',
  'FieldWeftFieldTypeV1',
  'FieldWeftMappingKindV1',
  'FieldWeftBoundaryKindV1',
  'FieldWeftBoundaryColorV1',
]

const manualV1Values = [
  ['FIELD_WEFT_MAX_NODES_V1', 'MAX_CODEDOC_NODES'],
  ['FIELD_WEFT_MAX_RELATIONS_V1', 'MAX_CODEDOC_RELATIONS'],
  ['FIELD_WEFT_MAX_FIELDS_V1', 'MAX_CODEDOC_FIELDS'],
  ['FIELD_WEFT_MAX_FIELD_DEPTH_V1', 'MAX_CODEDOC_FIELD_DEPTH'],
  ['FIELD_WEFT_MAX_COORD_V1', 'MAX_GRAPH_COORD'],
  ['FIELD_WEFT_MAX_CANONICAL_BYTES_V1', 'MAX_CODEDOC_CANONICAL_BYTES'],
  ['FIELD_WEFT_MAX_SOURCE_BYTES_V1', 'MAX_CODEDOC_SOURCE_BYTES'],
  ['FIELD_WEFT_MAX_TOTAL_TAGS_V1', 'MAX_CODEDOC_TAGS'],
  ['FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1', 'MAX_CODEDOC_META_ENTRIES'],
  ['FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1', 'MAX_CODEDOC_ANNOTATION_CODEPOINTS'],
]

export const publicApiManifest = [
  api('FIELD_WEFT_FORMAT', 'value', 'global', generatedSource, [
    'FIELD_WEFT_FORMAT',
    'CODE_DOC_FORMAT',
  ]),
  ...generatedV1Values.map(([name, sourceNames]) =>
    api(name, 'value', 'v1', generatedSource, sourceNames),
  ),
  ...manualV1Values.map(([name, sourceName]) =>
    api(name, 'value', 'v1', modelSource, [sourceName]),
  ),
  api('FIELD_WEFT_RESERVED_IDS', 'value', 'global', modelSource, [
    'RESERVED_FIELDWEFT_IDS',
  ]),
  api('FIELD_WEFT_RESERVED_META_KEYS', 'value', 'global', modelSource, [
    'RESERVED_FIELDWEFT_META_KEYS',
  ]),
  api('FIELD_WEFT_RESERVED_META_PREFIX', 'value', 'global', modelSource, [
    'RESERVED_FIELDWEFT_META_PREFIX',
  ]),

  api('FieldWeftId', 'type', 'global', generatedSource, ['FieldWeftId', 'FieldId']),
  ...generatedV1Types.map(([name, sourceNames]) =>
    api(name, 'type', 'v1', generatedSource, sourceNames),
  ),
  ...generatedKindTypes.map((name) =>
    api(name, 'type', 'v1', generatedSource, [], 'New generated kind union.'),
  ),
  api('FieldWeftAnnotationsV1', 'type', 'v1', modelSource, [
    'FieldWeftAnnotations',
  ]),
  api('ValidFieldWeftDocV1', 'type', 'v1', modelSource, ['ValidCodeDoc']),
  api('CanonicalFieldWeftEntityV1', 'type', 'v1', modelSource, [
    'CanonicalEntity',
  ]),
  api('CanonicalFieldWeftProcessV1', 'type', 'v1', modelSource, [
    'CanonicalProcess',
  ]),
  api('CanonicalFieldWeftBoundaryV1', 'type', 'v1', modelSource, [
    'CanonicalBoundary',
  ]),
  api('CanonicalFieldWeftDocV1', 'type', 'v1', modelSource, [
    'CanonicalCodeDoc',
  ]),
  api('FieldWeftSemanticProjectionV1', 'type', 'v1', modelSource, [
    'SemanticProjectionV1',
  ]),
  api('FieldWeftLayoutEntityV1', 'type', 'v1', modelSource, ['LayoutEntityV1']),
  api('FieldWeftLayoutProcessV1', 'type', 'v1', modelSource, [
    'LayoutProcessV1',
  ]),
  api('FieldWeftLayoutBoundaryV1', 'type', 'v1', modelSource, [
    'LayoutBoundaryV1',
  ]),
  api('FieldWeftLayoutProjectionV1', 'type', 'v1', modelSource, [
    'LayoutProjectionV1',
  ]),

  api(
    'canonicalizeFieldWeftDoc',
    'function',
    'v1-typed',
    'src/code-canonical.ts',
    ['canonicalizeCodeDoc'],
  ),
  api(
    'projectSemanticFieldWeftDoc',
    'function',
    'v1-typed',
    'src/code-canonical.ts',
    ['projectSemanticCodeDoc'],
  ),
  api(
    'projectLayoutFieldWeftDoc',
    'function',
    'v1-typed',
    'src/code-canonical.ts',
    ['projectLayoutCodeDoc'],
  ),

  api('FieldWeftSemanticObjectKindV1', 'type', 'v1', 'src/code-diff.ts', [
    'SemanticObjectKind',
  ]),
  api('FieldWeftFieldOwnerKindV1', 'type', 'v1', 'src/code-diff.ts', [
    'FieldOwnerKind',
  ]),
  api('FieldWeftFieldLocationV1', 'type', 'v1', 'src/code-diff.ts', [
    'FieldLocation',
  ]),
  api(
    'FieldWeftSemanticStructuralChangeV1',
    'type',
    'v1',
    'src/code-diff.ts',
    ['SemanticStructuralChange'],
  ),
  api(
    'diffFieldWeftSemanticProjections',
    'function',
    'v1-typed',
    'src/code-diff.ts',
    ['diffSemanticProjections'],
  ),
  api(
    'diffCanonicalFieldWeftDocs',
    'function',
    'v1-typed',
    'src/code-diff.ts',
    ['diffCanonicalCodeDocs'],
  ),

  api(
    'ReadCanonicalFieldWeftDocResult',
    'type',
    'dispatcher',
    'src/code-input.ts',
    ['ReadCanonicalCodeDocResult'],
  ),
  api(
    'readCanonicalFieldWeftDoc',
    'function',
    'dispatcher',
    'src/code-input.ts',
    ['readCanonicalCodeDoc'],
  ),
  api(
    'parseFieldWeftDocJson',
    'function',
    'dispatcher',
    'src/code-input.ts',
    ['parseCodeDocJson'],
  ),
  api(
    'formatFieldWeftDiagnostic',
    'function',
    'global',
    'src/code-input.ts',
    ['formatCodeDocDiagnostic'],
  ),

  api(
    'SerializeCanonicalFieldWeftDocOptions',
    'type',
    'version-neutral',
    'src/code-serialize.ts',
    ['SerializeCanonicalCodeDocOptions'],
  ),
  api(
    'serializeCanonicalFieldWeftDoc',
    'function',
    'v1-typed',
    'src/code-serialize.ts',
    ['serializeCanonicalCodeDoc'],
  ),
  api(
    'canonicalFieldWeftDocUtf8Bytes',
    'function',
    'v1-typed',
    'src/code-serialize.ts',
    ['canonicalCodeDocUtf8Bytes'],
  ),

  api('FieldWeftDiagnosticRelated', 'type', 'global', 'src/code-validate.ts', [
    'DiagnosticRelated',
  ]),
  api('FieldWeftDiagnostic', 'type', 'global', 'src/code-validate.ts', [
    'Diagnostic',
  ]),
  api(
    'ValidateFieldWeftDocResultV1',
    'type',
    'v1',
    'src/code-validate.ts',
    ['ValidateCodeDocResult'],
  ),
  api('ReadFieldWeftDocResult', 'type', 'dispatcher', 'src/code-validate.ts', [
    'ReadCodeDocResult',
  ]),
  api(
    'validateFieldWeftDocV1',
    'function',
    'v1',
    'src/code-validate.ts',
    ['validateCodeDocV1'],
  ),
  api(
    'readFieldWeftDoc',
    'function',
    'dispatcher',
    'src/code-validate.ts',
    ['readCodeDoc'],
  ),

  api('FIELD_ID_SUFFIX_ALPHABET', 'value', 'global', 'src/field-id.ts', [
    'FIELD_ID_SUFFIX_ALPHABET',
  ]),
  api('FIELD_ID_SUFFIX_LENGTH', 'value', 'global', 'src/field-id.ts', [
    'FIELD_ID_SUFFIX_LENGTH',
  ]),
  api('FIELD_ID_SUFFIX_BITS', 'value', 'global', 'src/field-id.ts', [
    'FIELD_ID_SUFFIX_BITS',
  ]),
  api('FIELD_ID_SLUG_MAX_CHARS', 'value', 'global', 'src/field-id.ts', [
    'FIELD_ID_SLUG_MAX_CHARS',
  ]),
  api('FIELD_ID_ALLOCATION_ATTEMPTS', 'value', 'global', 'src/field-id.ts', [
    'FIELD_ID_ALLOCATION_ATTEMPTS',
  ]),
  api('FillFieldIdRandomValues', 'type', 'global', 'src/field-id.ts', [
    'FillFieldIdRandomValues',
  ]),
  api('fieldIdSlug', 'function', 'global', 'src/field-id.ts', ['fieldIdSlug']),
  api('allocateFieldId', 'function', 'global', 'src/field-id.ts', [
    'allocateFieldId',
  ]),

  api(
    'FIELD_WEFT_SHARE_PACK_VERSION',
    'value',
    'share',
    'src/share-codec.ts',
    ['SHARE_PACK_VERSION'],
  ),
  api('FIELD_WEFT_SHARE_FORMAT', 'value', 'share', 'src/share-codec.ts', [
    'SHARE_FORMAT',
  ]),
  api(
    'FIELD_WEFT_MAX_SHARE_TOKEN_CHARS',
    'value',
    'share',
    'src/share-codec.ts',
    ['MAX_SHARE_TOKEN_CHARS'],
  ),
  api(
    'FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES',
    'value',
    'share',
    'src/share-codec.ts',
    ['MAX_SHARE_DECOMPRESSED_BYTES'],
  ),
  api('FieldWeftShareEncodeResult', 'type', 'share', 'src/share-codec.ts', [
    'CodecEncodeResult',
  ]),
  api('FieldWeftShareDecodeResult', 'type', 'share', 'src/share-codec.ts', [
    'CodecDecodeResult',
  ]),
  api('FieldWeftShareTupleError', 'class', 'share', 'src/share-codec.ts', [
    'ShareTupleError',
  ]),
  api(
    'packFieldWeftShareDocV1',
    'function',
    'v1',
    'src/share-codec.ts',
    ['packShareDocV1'],
  ),
  api(
    'unpackFieldWeftShareDocV1',
    'function',
    'v1',
    'src/share-codec.ts',
    ['unpackShareDocV1'],
  ),
  api('encodeFieldWeftShare', 'function', 'share', 'src/share-codec.ts', [
    'encodeShare',
  ]),
  api('decodeFieldWeftShare', 'function', 'share', 'src/share-codec.ts', [
    'decodeShare',
  ]),
]

export const excludedApiSymbols = [
  {
    name: 'deterministicAdapterId',
    source: 'src/adapter-reference.ts',
    disposition: 'repository-reference',
    reason: 'The packaged adapter source is copied by consumers, not imported as a package API.',
  },
  {
    name: 'BOUNDARY_KIND_VALUES',
    source: 'src/boundary-kind.ts',
    disposition: 'generated-replacement',
    reason: 'Use FIELD_WEFT_BOUNDARY_KINDS_V1 from generated output.',
  },
  {
    name: 'BoundaryKind',
    source: 'src/boundary-kind.ts',
    disposition: 'generated-replacement',
    reason: 'Use FieldWeftBoundaryKindV1 from generated output.',
  },
  {
    name: 'DEFAULT_BOUNDARY_SIZE',
    source: 'src/code-layout.ts',
    disposition: 'internal',
    reason: 'Default layout construction is an implementation detail, not a format contract.',
  },
  {
    name: 'defaultBoundaryPosition',
    source: 'src/code-layout.ts',
    disposition: 'internal',
    reason: 'Default layout construction is an implementation detail, not a format contract.',
  },
  {
    name: 'defaultEntityPosition',
    source: 'src/code-layout.ts',
    disposition: 'internal',
    reason: 'Default layout construction is an implementation detail, not a format contract.',
  },
  {
    name: 'defaultProcessPosition',
    source: 'src/code-layout.ts',
    disposition: 'internal',
    reason: 'Default layout construction is an implementation detail, not a format contract.',
  },
]

export const publicApiVersionBuckets = {
  global: 'Unversioned contract that is invariant across FieldWeft document versions.',
  v1: 'FieldWeft v1 schema or validation contract; the public name carries a V1 suffix where applicable.',
  dispatcher: 'Unversioned entry point that accepts unknown input and dispatches or reports unsupported versions.',
  'v1-typed': 'Operation whose version is fixed by its FieldWeft v1 parameter and result types.',
  'version-neutral': 'Option or helper contract that does not encode a document version.',
  share: 'Share codec contract governed by the d1 and pack-version axis.',
}
