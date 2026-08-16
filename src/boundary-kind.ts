import { FIELD_WEFT_BOUNDARY_KINDS_V1 } from './fieldweft-v1.generated.js'

export const BOUNDARY_KIND_VALUES = Object.freeze([
  ...FIELD_WEFT_BOUNDARY_KINDS_V1,
] as const)

export type BoundaryKind = (typeof BOUNDARY_KIND_VALUES)[number]
