// This file is generated from fieldweft-v1.schema.json.
// Run `npm run generate:fieldweft-types` after changing the schema.

export const FIELD_WEFT_FORMAT = "fieldweft" as const
export const FIELD_WEFT_VERSION_V1 = 1 as const
export const FIELD_WEFT_FIELD_TYPES_V1 = Object.freeze(["uuid","string","number","boolean","timestamp","object","json"] as const)
export const FIELD_WEFT_ENTITY_KINDS_V1 = Object.freeze(["event","api","db","other"] as const)
export const FIELD_WEFT_BOUNDARY_COLORS_V1 = Object.freeze(["blue","green","purple","rose","slate"] as const)
export const FIELD_WEFT_BOUNDARY_KINDS_V1 = Object.freeze(["domain","system","external","security","other"] as const)
export const FIELD_WEFT_MAPPING_KINDS_V1 = Object.freeze(["keep","transform"] as const)
export const FIELD_WEFT_MAX_ID_CHARS_V1 = 256 as const
export const FIELD_WEFT_MAX_NAME_CHARS_V1 = 256 as const
export const FIELD_WEFT_MAX_LABEL_CHARS_V1 = 512 as const
export const FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1 = 4096 as const
export const FIELD_WEFT_MAX_TAG_CHARS_V1 = 64 as const
export const FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1 = 32 as const
export const FIELD_WEFT_MAX_META_KEY_CHARS_V1 = 128 as const
export const FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1 = 32 as const
export const FIELD_WEFT_MAX_META_STRING_CHARS_V1 = 4096 as const
export const FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1 = 256 as const
export const FIELD_WEFT_MAX_VARIANT_VALUES_V1 = 256 as const

export type FieldWeftEntityKindV1 = (typeof FIELD_WEFT_ENTITY_KINDS_V1)[number]
export type FieldWeftFieldTypeV1 = (typeof FIELD_WEFT_FIELD_TYPES_V1)[number]
export type FieldWeftMappingKindV1 = (typeof FIELD_WEFT_MAPPING_KINDS_V1)[number]
export type FieldWeftBoundaryKindV1 = (typeof FIELD_WEFT_BOUNDARY_KINDS_V1)[number]
export type FieldWeftBoundaryColorV1 = (typeof FIELD_WEFT_BOUNDARY_COLORS_V1)[number]

export type FieldWeftId = string

export type FieldWeftNameV1 = string

export type FieldWeftLabelV1 = string

export type FieldWeftDescriptionV1 = string

export type FieldWeftTagV1 = string

export type FieldWeftTagsV1 = Array<FieldWeftTagV1>

export type FieldWeftMetadataValueV1 = string | number | boolean | null

export type FieldWeftMetadataV1 = Record<string, FieldWeftMetadataValueV1>

export type FieldWeftVariantValueV1 = string

export type FieldWeftVariantValuesV1 = Array<FieldWeftVariantValueV1>

export type FieldWeftPositionV1 = {
  x: number
  y: number
}

export type FieldWeftSizeV1 = {
  width: number
  height: number
}

export type FieldWeftDiscriminatorV1 = {
  values: FieldWeftVariantValuesV1
}

export type FieldWeftWhenV1 = Record<string, FieldWeftVariantValuesV1>

export type FieldWeftFieldV1 = {
  id: FieldWeftId
  name: FieldWeftNameV1
  type: "uuid" | "string" | "number" | "boolean" | "timestamp" | "object" | "json"
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
  array?: boolean
  nullable?: boolean
  pk?: boolean
  children?: Array<FieldWeftFieldV1>
  discriminator?: FieldWeftDiscriminatorV1
  when?: FieldWeftWhenV1
}

export type FieldWeftEntityV1 = {
  id: FieldWeftId
  name: FieldWeftNameV1
  kind: "event" | "api" | "db" | "other"
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
  position?: FieldWeftPositionV1
  fields: Array<FieldWeftFieldV1>
  collapsed?: Array<FieldWeftId>
}

export type FieldWeftProcessV1 = {
  id: FieldWeftId
  name: FieldWeftNameV1
  kind: "event" | "api" | "db" | "other"
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
  position?: FieldWeftPositionV1
  inputs: Array<FieldWeftFieldV1>
  outputs: Array<FieldWeftFieldV1>
}

export type FieldWeftBoundaryV1 = {
  id: FieldWeftId
  name: FieldWeftNameV1
  color?: "blue" | "green" | "purple" | "rose" | "slate"
  kind?: "domain" | "system" | "external" | "security" | "other"
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
  position?: FieldWeftPositionV1
  size?: FieldWeftSizeV1
  members?: Array<FieldWeftId>
}

export type FieldWeftNodeRelationV1 = {
  id: FieldWeftId
  sourceNodeId: FieldWeftId
  targetNodeId: FieldWeftId
  label?: FieldWeftLabelV1
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
}

export type FieldWeftMappingV1 = {
  id: FieldWeftId
  sourceFieldId: FieldWeftId
  targetFieldId: FieldWeftId
  kind?: "keep" | "transform"
  label?: FieldWeftLabelV1
  description?: FieldWeftDescriptionV1
  tags?: FieldWeftTagsV1
  meta?: FieldWeftMetadataV1
}

export type FieldWeftDocV1 = {
  format: "fieldweft"
  version: 1
  entities: Array<FieldWeftEntityV1>
  processes: Array<FieldWeftProcessV1>
  boundaries: Array<FieldWeftBoundaryV1>
  nodeRelations: Array<FieldWeftNodeRelationV1>
  mappings: Array<FieldWeftMappingV1>
}
