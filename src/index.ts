/**
 * Public FieldWeft core package entry point.
 *
 * Keep this list in exact parity with docs/public-api-manifest.md.
 */

export {
  FIELD_WEFT_BOUNDARY_COLORS_V1,
  FIELD_WEFT_BOUNDARY_KINDS_V1,
  FIELD_WEFT_ENTITY_KINDS_V1,
  FIELD_WEFT_FIELD_TYPES_V1,
  FIELD_WEFT_FORMAT,
  FIELD_WEFT_MAPPING_KINDS_V1,
  FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1,
  FIELD_WEFT_MAX_ID_CHARS_V1,
  FIELD_WEFT_MAX_LABEL_CHARS_V1,
  FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1,
  FIELD_WEFT_MAX_META_KEY_CHARS_V1,
  FIELD_WEFT_MAX_META_STRING_CHARS_V1,
  FIELD_WEFT_MAX_NAME_CHARS_V1,
  FIELD_WEFT_MAX_TAG_CHARS_V1,
  FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1,
  FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1,
  FIELD_WEFT_MAX_VARIANT_VALUES_V1,
  FIELD_WEFT_VERSION_V1,
} from './fieldweft-v1.generated.js'
export type {
  FieldWeftBoundaryColorV1,
  FieldWeftBoundaryKindV1,
  FieldWeftBoundaryV1,
  FieldWeftDescriptionV1,
  FieldWeftDiscriminatorV1,
  FieldWeftDocV1,
  FieldWeftEntityKindV1,
  FieldWeftEntityV1,
  FieldWeftFieldTypeV1,
  FieldWeftFieldV1,
  FieldWeftId,
  FieldWeftLabelV1,
  FieldWeftMappingKindV1,
  FieldWeftMappingV1,
  FieldWeftMetadataV1,
  FieldWeftMetadataValueV1,
  FieldWeftNameV1,
  FieldWeftNodeRelationV1,
  FieldWeftPositionV1,
  FieldWeftProcessV1,
  FieldWeftSizeV1,
  FieldWeftTagV1,
  FieldWeftTagsV1,
  FieldWeftVariantValueV1,
  FieldWeftVariantValuesV1,
  FieldWeftWhenV1,
} from './fieldweft-v1.generated.js'

export {
  FIELD_WEFT_MAX_CANONICAL_BYTES_V1,
  FIELD_WEFT_MAX_COORD_V1,
  FIELD_WEFT_MAX_FIELDS_V1,
  FIELD_WEFT_MAX_FIELD_DEPTH_V1,
  FIELD_WEFT_MAX_NODES_V1,
  FIELD_WEFT_MAX_RELATIONS_V1,
  FIELD_WEFT_MAX_SOURCE_BYTES_V1,
  FIELD_WEFT_MAX_TOTAL_ANNOTATION_CODEPOINTS_V1,
  FIELD_WEFT_MAX_TOTAL_META_ENTRIES_V1,
  FIELD_WEFT_MAX_TOTAL_TAGS_V1,
  FIELD_WEFT_RESERVED_IDS,
  FIELD_WEFT_RESERVED_META_KEYS,
  FIELD_WEFT_RESERVED_META_PREFIX,
} from './code-model.js'
export type {
  CanonicalFieldWeftBoundaryV1,
  CanonicalFieldWeftDocV1,
  CanonicalFieldWeftEntityV1,
  CanonicalFieldWeftProcessV1,
  FieldWeftAnnotationsV1,
  FieldWeftLayoutBoundaryV1,
  FieldWeftLayoutEntityV1,
  FieldWeftLayoutProcessV1,
  FieldWeftLayoutProjectionV1,
  FieldWeftSemanticProjectionV1,
  ValidFieldWeftDocV1,
} from './code-model.js'

export {
  canonicalizeFieldWeftDoc,
  projectLayoutFieldWeftDoc,
  projectSemanticFieldWeftDoc,
} from './code-canonical.js'

export {
  diffCanonicalFieldWeftDocs,
  diffFieldWeftSemanticProjections,
} from './code-diff.js'
export type {
  FieldWeftFieldLocationV1,
  FieldWeftFieldOwnerKindV1,
  FieldWeftSemanticObjectKindV1,
  FieldWeftSemanticStructuralChangeV1,
} from './code-diff.js'

export {
  formatFieldWeftDiagnostic,
  parseFieldWeftDocJson,
  readCanonicalFieldWeftDoc,
} from './code-input.js'
export type { ReadCanonicalFieldWeftDocResult } from './code-input.js'

export {
  canonicalFieldWeftDocUtf8Bytes,
  serializeCanonicalFieldWeftDoc,
} from './code-serialize.js'
export type {
  SerializeCanonicalFieldWeftDocOptions,
} from './code-serialize.js'

export {
  readFieldWeftDoc,
  validateFieldWeftDocV1,
} from './code-validate.js'
export type {
  FieldWeftDiagnostic,
  FieldWeftDiagnosticRelated,
  ReadFieldWeftDocResult,
  ValidateFieldWeftDocResultV1,
} from './code-validate.js'

export {
  allocateFieldId,
  FIELD_ID_ALLOCATION_ATTEMPTS,
  FIELD_ID_SLUG_MAX_CHARS,
  FIELD_ID_SUFFIX_ALPHABET,
  FIELD_ID_SUFFIX_BITS,
  FIELD_ID_SUFFIX_LENGTH,
  fieldIdSlug,
} from './field-id.js'
export type { FillFieldIdRandomValues } from './field-id.js'

export {
  decodeFieldWeftShare,
  encodeFieldWeftShare,
  FIELD_WEFT_MAX_SHARE_DECOMPRESSED_BYTES,
  FIELD_WEFT_MAX_SHARE_TOKEN_CHARS,
  FIELD_WEFT_SHARE_FORMAT,
  FIELD_WEFT_SHARE_PACK_VERSION,
  FieldWeftShareTupleError,
  packFieldWeftShareDocV1,
  unpackFieldWeftShareDocV1,
} from './share-codec.js'
export type {
  FieldWeftShareDecodeResult,
  FieldWeftShareEncodeResult,
} from './share-codec.js'
