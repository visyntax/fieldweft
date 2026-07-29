# Public API Manifest

> **Status:** Approved on 2026-07-29.
> **Language:** This English manifest is normative. Korean documentation is
> non-normative commentary; English takes precedence if the two differ.
> Names in the “Current source names” column classify the extraction source.
> Names in the “Historical v1 fieldweft-web aliases” column are superseded
> extraction history and MUST NOT be exported as compatibility aliases.

## Decisions represented by this manifest

- The root entry point exports only the symbols listed in this document.
- Schema-derived vocabulary types, enum arrays, and limits use generated
  `FieldWeft*V1` and `FIELD_WEFT_*_V1` names.
- Limits paired with document-wide totals state `PER_OBJECT` explicitly in
  their object-local names.
- `FieldWeftId`, reserved identifiers, diagnostics, and field-ID helpers are
  global unversioned contracts.
- Reader functions are unversioned dispatchers. Validator functions name their
  schema version explicitly.
- Canonicalization, serialization, projection, and diff operations remain
  unversioned because their parameter and result types pin them to v1.
- The d1 share codec uses its own share and pack-version axis.
- Legacy `CodeDoc`, `CODE_DOC`, and unbranded names are extraction history only,
  not migration inputs or compatibility contracts.
- The first `fieldweft-web` release consumes `Public name` directly and MUST NOT
  export aliases from the historical v1 column.
- The schema and named golden fixtures are package subpath contracts.
- Reference adapter source is a packaged copy-only documentation asset, not
  a root export or package subpath.
- Layout default constructors are not root exports.

## Version buckets

| Bucket | Meaning |
|---|---|
| `global` | Unversioned contract that is invariant across FieldWeft document versions. |
| `v1` | FieldWeft v1 schema or validation contract; the public name carries a V1 suffix where applicable. |
| `dispatcher` | Unversioned entry point that accepts unknown input and dispatches or reports unsupported versions. |
| `v1-typed` | Operation whose version is fixed by its FieldWeft v1 parameter and result types. |
| `version-neutral` | Option or helper contract that does not encode a document version. |
| `share` | Share codec contract governed by the d1 and pack-version axis. |

## Review state

- No unresolved review items.

## Public package subpaths

| Subpath | Kind | Target |
|---|---|---|
| `.` | `module` | `types`: `./dist/index.d.ts`<br>`default`: `./dist/index.js` |
| `./schema/v1` | `schema` | `./schema/fieldweft-v1.schema.json` |
| `./fixtures/*` | `fixture-pattern` | `./fixtures/*` |

### Public fixture files

- `fieldweft-canonical-v1-compact.json`
- `fieldweft-canonical-v1-input.json`
- `fieldweft-canonical-v1-pretty.json`
- `fieldweft-d1-v1-golden.json`
- `fieldweft-d1-v1-rich-golden.json`

## Root exports

### `src/fieldweft-v1.generated.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FIELD_WEFT_FORMAT` | value | `global` | `FIELD_WEFT_FORMAT`, `CODE_DOC_FORMAT` | `CODE_DOC_FORMAT` | — |
| `FIELD_WEFT_VERSION_V1` | value | `v1` | `FIELD_WEFT_VERSION`, `CODE_DOC_VERSION` | `CODE_DOC_VERSION` | — |
| `FIELD_WEFT_FIELD_TYPES_V1` | value | `v1` | `FIELD_WEFT_FIELD_TYPES`, `CODE_FIELD_TYPES` | `CODE_FIELD_TYPES` | — |
| `FIELD_WEFT_ENTITY_KINDS_V1` | value | `v1` | `FIELD_WEFT_ENTITY_KINDS`, `CODE_ENTITY_KINDS` | `CODE_ENTITY_KINDS` | — |
| `FIELD_WEFT_BOUNDARY_COLORS_V1` | value | `v1` | `FIELD_WEFT_BOUNDARY_COLORS` | — | — |
| `FIELD_WEFT_BOUNDARY_KINDS_V1` | value | `v1` | `FIELD_WEFT_BOUNDARY_KINDS` | — | — |
| `FIELD_WEFT_MAPPING_KINDS_V1` | value | `v1` | `FIELD_WEFT_MAPPING_KINDS`, `CODE_MAPPING_KINDS` | `CODE_MAPPING_KINDS` | — |
| `FIELD_WEFT_MAX_ID_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_ID_CHARS`, `MAX_CODEDOC_ID_CHARS` | `MAX_CODEDOC_ID_CHARS` | — |
| `FIELD_WEFT_MAX_NAME_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_NAME_CHARS`, `MAX_CODEDOC_NAME_CHARS` | `MAX_CODEDOC_NAME_CHARS` | — |
| `FIELD_WEFT_MAX_LABEL_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_LABEL_CHARS`, `MAX_CODEDOC_LABEL_CHARS` | `MAX_CODEDOC_LABEL_CHARS` | — |
| `FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_DESCRIPTION_CHARS`, `MAX_CODEDOC_DESCRIPTION_CHARS` | `MAX_CODEDOC_DESCRIPTION_CHARS` | — |
| `FIELD_WEFT_MAX_TAG_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_TAG_CHARS`, `MAX_CODEDOC_TAG_CHARS` | `MAX_CODEDOC_TAG_CHARS` | — |
| `FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1` | value | `v1` | `FIELD_WEFT_MAX_TAGS`, `MAX_CODEDOC_TAGS_PER_OBJECT` | `MAX_CODEDOC_TAGS_PER_OBJECT` | — |
| `FIELD_WEFT_MAX_META_KEY_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_META_KEY_CHARS`, `MAX_CODEDOC_META_KEY_CHARS` | `MAX_CODEDOC_META_KEY_CHARS` | — |
| `FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1` | value | `v1` | `FIELD_WEFT_MAX_META_ENTRIES`, `MAX_CODEDOC_META_ENTRIES_PER_OBJECT` | `MAX_CODEDOC_META_ENTRIES_PER_OBJECT` | — |
| `FIELD_WEFT_MAX_META_STRING_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_META_STRING_CHARS`, `MAX_CODEDOC_META_STRING_CHARS` | `MAX_CODEDOC_META_STRING_CHARS` | — |
| `FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1` | value | `v1` | `FIELD_WEFT_MAX_VARIANT_VALUE_CHARS`, `MAX_CODEDOC_VARIANT_VALUE_CHARS` | `MAX_CODEDOC_VARIANT_VALUE_CHARS` | — |
| `FIELD_WEFT_MAX_VARIANT_VALUES_V1` | value | `v1` | `FIELD_WEFT_MAX_VARIANT_VALUES`, `MAX_CODEDOC_VARIANT_VALUES` | `MAX_CODEDOC_VARIANT_VALUES` | — |
| `FieldWeftId` | type | `global` | `FieldWeftId`, `FieldId` | `FieldId` | — |
| `FieldWeftNameV1` | type | `v1` | `FieldWeftName` | — | — |
| `FieldWeftLabelV1` | type | `v1` | `FieldWeftLabel` | — | — |
| `FieldWeftDescriptionV1` | type | `v1` | `FieldWeftDescription` | — | — |
| `FieldWeftTagV1` | type | `v1` | `FieldWeftTag` | — | — |
| `FieldWeftTagsV1` | type | `v1` | `FieldWeftTags` | — | — |
| `FieldWeftMetadataValueV1` | type | `v1` | `FieldWeftMetadataValue`, `MetadataValue` | `MetadataValue` | — |
| `FieldWeftMetadataV1` | type | `v1` | `FieldWeftMetadata`, `Metadata` | `Metadata` | — |
| `FieldWeftVariantValueV1` | type | `v1` | `FieldWeftVariantValue` | — | — |
| `FieldWeftVariantValuesV1` | type | `v1` | `FieldWeftVariantValues` | — | — |
| `FieldWeftPositionV1` | type | `v1` | `FieldWeftPosition`, `CodePosition` | `CodePosition` | — |
| `FieldWeftSizeV1` | type | `v1` | `FieldWeftSize`, `CodeSize` | `CodeSize` | — |
| `FieldWeftDiscriminatorV1` | type | `v1` | `FieldWeftDiscriminator`, `Discriminator` | `Discriminator` | — |
| `FieldWeftWhenV1` | type | `v1` | `FieldWeftWhen`, `When` | `When` | — |
| `FieldWeftFieldV1` | type | `v1` | `FieldWeftField`, `Field` | `Field` | — |
| `FieldWeftEntityV1` | type | `v1` | `FieldWeftEntity`, `CodeEntity` | `CodeEntity` | — |
| `FieldWeftProcessV1` | type | `v1` | `FieldWeftProcess`, `CodeProcess` | `CodeProcess` | — |
| `FieldWeftBoundaryV1` | type | `v1` | `FieldWeftBoundary`, `CodeBoundary` | `CodeBoundary` | — |
| `FieldWeftNodeRelationV1` | type | `v1` | `FieldWeftNodeRelation`, `NodeRelation` | `NodeRelation` | — |
| `FieldWeftMappingV1` | type | `v1` | `FieldWeftMapping`, `FieldMapping` | `FieldMapping` | — |
| `FieldWeftDocV1` | type | `v1` | `FieldWeftV1Input`, `CodeDoc` | `FieldWeftV1Input`, `CodeDoc` | — |
| `FieldWeftEntityKindV1` | type | `v1` | — | — | New generated kind union. |
| `FieldWeftFieldTypeV1` | type | `v1` | — | — | New generated kind union. |
| `FieldWeftMappingKindV1` | type | `v1` | — | — | New generated kind union. |
| `FieldWeftBoundaryKindV1` | type | `v1` | — | — | New generated kind union. |
| `FieldWeftBoundaryColorV1` | type | `v1` | — | — | New generated kind union. |

### `src/code-model.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FIELD_WEFT_MAX_NODES_V1` | value | `v1` | `MAX_CODEDOC_NODES` | `MAX_CODEDOC_NODES` | — |
| `FIELD_WEFT_MAX_RELATIONS_V1` | value | `v1` | `MAX_CODEDOC_RELATIONS` | `MAX_CODEDOC_RELATIONS` | — |
| `FIELD_WEFT_MAX_FIELDS_V1` | value | `v1` | `MAX_CODEDOC_FIELDS` | `MAX_CODEDOC_FIELDS` | — |
| `FIELD_WEFT_MAX_FIELD_DEPTH_V1` | value | `v1` | `MAX_CODEDOC_FIELD_DEPTH` | `MAX_CODEDOC_FIELD_DEPTH` | — |
| `FIELD_WEFT_MAX_COORD_V1` | value | `v1` | `MAX_GRAPH_COORD` | `MAX_GRAPH_COORD` | — |
| `FIELD_WEFT_MAX_CANONICAL_BYTES_V1` | value | `v1` | `MAX_CODEDOC_CANONICAL_BYTES` | `MAX_CODEDOC_CANONICAL_BYTES` | — |
| `FIELD_WEFT_MAX_SOURCE_BYTES_V1` | value | `v1` | `MAX_CODEDOC_SOURCE_BYTES` | `MAX_CODEDOC_SOURCE_BYTES` | — |
| `FIELD_WEFT_MAX_TOTAL_TAGS_V1` | value | `v1` | `MAX_CODEDOC_TAGS` | `MAX_CODEDOC_TAGS` | — |
| `FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1` | value | `v1` | `MAX_CODEDOC_META_ENTRIES` | `MAX_CODEDOC_META_ENTRIES` | — |
| `FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1` | value | `v1` | `MAX_CODEDOC_ANNOTATION_CODEPOINTS` | `MAX_CODEDOC_ANNOTATION_CODEPOINTS` | — |
| `FIELD_WEFT_RESERVED_IDS` | value | `global` | `RESERVED_FIELDWEFT_IDS` | `RESERVED_FIELDWEFT_IDS` | — |
| `FIELD_WEFT_RESERVED_META_KEYS` | value | `global` | `RESERVED_FIELDWEFT_META_KEYS` | `RESERVED_FIELDWEFT_META_KEYS` | — |
| `FIELD_WEFT_RESERVED_META_PREFIX` | value | `global` | `RESERVED_FIELDWEFT_META_PREFIX` | `RESERVED_FIELDWEFT_META_PREFIX` | — |
| `FieldWeftAnnotationsV1` | type | `v1` | `FieldWeftAnnotations` | `FieldWeftAnnotations` | — |
| `ValidFieldWeftDocV1` | type | `v1` | `ValidCodeDoc` | `ValidCodeDoc` | — |
| `CanonicalFieldWeftEntityV1` | type | `v1` | `CanonicalEntity` | `CanonicalEntity` | — |
| `CanonicalFieldWeftProcessV1` | type | `v1` | `CanonicalProcess` | `CanonicalProcess` | — |
| `CanonicalFieldWeftBoundaryV1` | type | `v1` | `CanonicalBoundary` | `CanonicalBoundary` | — |
| `CanonicalFieldWeftDocV1` | type | `v1` | `CanonicalCodeDoc` | `CanonicalCodeDoc` | — |
| `FieldWeftSemanticProjectionV1` | type | `v1` | `SemanticProjectionV1` | `SemanticProjectionV1` | — |
| `FieldWeftLayoutEntityV1` | type | `v1` | `LayoutEntityV1` | `LayoutEntityV1` | — |
| `FieldWeftLayoutProcessV1` | type | `v1` | `LayoutProcessV1` | `LayoutProcessV1` | — |
| `FieldWeftLayoutBoundaryV1` | type | `v1` | `LayoutBoundaryV1` | `LayoutBoundaryV1` | — |
| `FieldWeftLayoutProjectionV1` | type | `v1` | `LayoutProjectionV1` | `LayoutProjectionV1` | — |

### `src/code-canonical.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `canonicalizeFieldWeftDoc` | function | `v1-typed` | `canonicalizeCodeDoc` | `canonicalizeCodeDoc` | — |
| `projectSemanticFieldWeftDoc` | function | `v1-typed` | `projectSemanticCodeDoc` | `projectSemanticCodeDoc` | — |
| `projectLayoutFieldWeftDoc` | function | `v1-typed` | `projectLayoutCodeDoc` | `projectLayoutCodeDoc` | — |

### `src/code-diff.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FieldWeftSemanticObjectKindV1` | type | `v1` | `SemanticObjectKind` | `SemanticObjectKind` | — |
| `FieldWeftFieldOwnerKindV1` | type | `v1` | `FieldOwnerKind` | `FieldOwnerKind` | — |
| `FieldWeftFieldLocationV1` | type | `v1` | `FieldLocation` | `FieldLocation` | — |
| `FieldWeftSemanticStructuralChangeV1` | type | `v1` | `SemanticStructuralChange` | `SemanticStructuralChange` | — |
| `diffFieldWeftSemanticProjections` | function | `v1-typed` | `diffSemanticProjections` | `diffSemanticProjections` | — |
| `diffCanonicalFieldWeftDocs` | function | `v1-typed` | `diffCanonicalCodeDocs` | `diffCanonicalCodeDocs` | — |

### `src/code-input.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `ReadCanonicalFieldWeftDocResult` | type | `dispatcher` | `ReadCanonicalCodeDocResult` | `ReadCanonicalCodeDocResult` | — |
| `readCanonicalFieldWeftDoc` | function | `dispatcher` | `readCanonicalCodeDoc` | `readCanonicalCodeDoc` | — |
| `parseFieldWeftDocJson` | function | `dispatcher` | `parseCodeDocJson` | `parseCodeDocJson` | — |
| `formatFieldWeftDiagnostic` | function | `global` | `formatCodeDocDiagnostic` | `formatCodeDocDiagnostic` | — |

### `src/code-serialize.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `SerializeCanonicalFieldWeftDocOptions` | type | `version-neutral` | `SerializeCanonicalCodeDocOptions` | `SerializeCanonicalCodeDocOptions` | — |
| `serializeCanonicalFieldWeftDoc` | function | `v1-typed` | `serializeCanonicalCodeDoc` | `serializeCanonicalCodeDoc` | — |
| `canonicalFieldWeftDocUtf8Bytes` | function | `v1-typed` | `canonicalCodeDocUtf8Bytes` | `canonicalCodeDocUtf8Bytes` | — |

### `src/code-validate.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FieldWeftDiagnosticRelated` | type | `global` | `DiagnosticRelated` | `DiagnosticRelated` | — |
| `FieldWeftDiagnostic` | type | `global` | `Diagnostic` | `Diagnostic` | — |
| `ValidateFieldWeftDocResultV1` | type | `v1` | `ValidateCodeDocResult` | `ValidateCodeDocResult` | — |
| `ReadFieldWeftDocResult` | type | `dispatcher` | `ReadCodeDocResult` | `ReadCodeDocResult` | — |
| `validateFieldWeftDocV1` | function | `v1` | `validateCodeDocV1` | `validateCodeDocV1` | — |
| `readFieldWeftDoc` | function | `dispatcher` | `readCodeDoc` | `readCodeDoc` | — |

### `src/field-id.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FIELD_ID_SUFFIX_ALPHABET` | value | `global` | `FIELD_ID_SUFFIX_ALPHABET` | `FIELD_ID_SUFFIX_ALPHABET` | — |
| `FIELD_ID_SUFFIX_LENGTH` | value | `global` | `FIELD_ID_SUFFIX_LENGTH` | `FIELD_ID_SUFFIX_LENGTH` | — |
| `FIELD_ID_SUFFIX_BITS` | value | `global` | `FIELD_ID_SUFFIX_BITS` | `FIELD_ID_SUFFIX_BITS` | — |
| `FIELD_ID_SLUG_MAX_CHARS` | value | `global` | `FIELD_ID_SLUG_MAX_CHARS` | `FIELD_ID_SLUG_MAX_CHARS` | — |
| `FIELD_ID_ALLOCATION_ATTEMPTS` | value | `global` | `FIELD_ID_ALLOCATION_ATTEMPTS` | `FIELD_ID_ALLOCATION_ATTEMPTS` | — |
| `FillFieldIdRandomValues` | type | `global` | `FillFieldIdRandomValues` | `FillFieldIdRandomValues` | — |
| `fieldIdSlug` | function | `global` | `fieldIdSlug` | `fieldIdSlug` | — |
| `allocateFieldId` | function | `global` | `allocateFieldId` | `allocateFieldId` | — |

### `src/share-codec.ts`

| Public name | Kind | Bucket | Current source names | Historical v1 fieldweft-web aliases (superseded) | Note |
|---|---|---|---|---|---|
| `FIELD_WEFT_SHARE_PACK_VERSION` | value | `share` | `SHARE_PACK_VERSION` | — | — |
| `FIELD_WEFT_SHARE_FORMAT` | value | `share` | `SHARE_FORMAT` | — | — |
| `FIELD_WEFT_MAX_SHARE_TOKEN_CHARS` | value | `share` | `MAX_SHARE_TOKEN_CHARS` | — | — |
| `FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES` | value | `share` | `MAX_SHARE_DECOMPRESSED_BYTES` | — | — |
| `FieldWeftShareEncodeResult` | type | `share` | `CodecEncodeResult` | — | — |
| `FieldWeftShareDecodeResult` | type | `share` | `CodecDecodeResult` | — | — |
| `FieldWeftShareTupleError` | class | `share` | `ShareTupleError` | — | — |
| `packFieldWeftShareDocV1` | function | `v1` | `packShareDocV1` | — | — |
| `unpackFieldWeftShareDocV1` | function | `v1` | `unpackShareDocV1` | — | — |
| `encodeFieldWeftShare` | function | `share` | `encodeShare` | — | — |
| `decodeFieldWeftShare` | function | `share` | `decodeShare` | — | — |

## fieldweft-web-owned v2 implementation names

This is an ownership-boundary inventory, not a compatibility-export or public-facade mandate.
The first `fieldweft-web` release MUST NOT retain superseded v1 aliases for these names.

| Name | Kind | Source in fieldweft-web |
|---|---|---|
| `AppEdge` | type | `src/flow/edge-kind.ts` |
| `DisplayEdge` | type | `src/flow/edge-kind.ts` |
| `DerivedNodeRollupEdge` | type | `src/flow/edge-kind.ts` |
| `MappingEdge` | type | `src/flow/edge-kind.ts` |
| `NodeRelationEdge` | type | `src/flow/edge-kind.ts` |
| `traceNodes` | function | `src/flow/node-lineage.ts` |
| `collectNodeLineageRelations` | function | `src/flow/node-lineage.ts` |
| `NodeLineageItem` | type | `src/flow/node-lineage.ts` |
| `NodeLineageRelation` | type | `src/flow/node-lineage.ts` |
| `NodeLineageResult` | type | `src/flow/node-lineage.ts` |
| `NodeLineageSource` | type | `src/flow/node-lineage.ts` |
| `TraceNodesOptions` | type | `src/flow/node-lineage.ts` |
| `FieldWeftDocInvariantError` | class | `src/flow/code-convert.ts` |
| `docToGraph` | function | `src/flow/code-convert.ts` |
| `graphToDoc` | function | `src/flow/code-convert.ts` |
| `FIELD_TYPES` | value | `src/flow/code.ts` |
| `KINDS` | value | `src/flow/code.ts` |
| `graphToCode` | function | `src/flow/code.ts` |
| `CodeParseResult` | type | `src/flow/code.ts` |
| `codeToGraph` | function | `src/flow/code.ts` |

## Private package modules

| Source | Root export | Subpath export | Disposition | Reason |
|---|---|---|---|---|
| `src/adapter-reference.ts` | no | no | `repository-reference` | The packaged adapter source is copy-only reference code and is not part of the package API. |

## Explicitly excluded module exports

| Current name | Source | Disposition | Reason |
|---|---|---|---|
| `deterministicAdapterId` | `src/adapter-reference.ts` | `repository-reference` | The packaged adapter source is copied by consumers, not imported as a package API. |
| `BOUNDARY_KIND_VALUES` | `src/boundary-kind.ts` | `generated-replacement` | Use FIELD_WEFT_BOUNDARY_KINDS_V1 from generated output. |
| `BoundaryKind` | `src/boundary-kind.ts` | `generated-replacement` | Use FieldWeftBoundaryKindV1 from generated output. |
| `DEFAULT_BOUNDARY_SIZE` | `src/code-layout.ts` | `internal` | Default layout construction is an implementation detail, not a format contract. |
| `defaultBoundaryPosition` | `src/code-layout.ts` | `internal` | Default layout construction is an implementation detail, not a format contract. |
| `defaultEntityPosition` | `src/code-layout.ts` | `internal` | Default layout construction is an implementation detail, not a format contract. |
| `defaultProcessPosition` | `src/code-layout.ts` | `internal` | Default layout construction is an implementation detail, not a format contract. |

