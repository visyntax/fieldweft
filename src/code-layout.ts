import type {
  FieldWeftPositionV1,
  FieldWeftSizeV1,
} from './fieldweft-v1.generated.js'

/** Deterministic defaults used to materialize optional layout in canonical snapshots. */
export const DEFAULT_BOUNDARY_SIZE: Readonly<FieldWeftSizeV1> = {
  width: 380,
  height: 240,
}

export function defaultBoundaryPosition(index: number): FieldWeftPositionV1 {
  return { x: 60 + index * 40, y: 60 + index * 40 }
}

export function defaultEntityPosition(index: number): FieldWeftPositionV1 {
  return { x: 0, y: index * 120 }
}

export function defaultProcessPosition(index: number): FieldWeftPositionV1 {
  return { x: 340, y: 120 + index * 160 }
}
