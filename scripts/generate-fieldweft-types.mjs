import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const schemaPath = join(root, 'schema', 'fieldweft-v1.schema.json')
const outputPath = join(root, 'src', 'fieldweft-v1.generated.ts')
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))

const typeNames = new Map(
  Object.keys(schema.$defs).map((name) => [
    name,
    name === 'Id' ? 'FieldWeftId' : `FieldWeft${name}V1`,
  ]),
)

function literal(value) {
  return JSON.stringify(value)
}

function indentBlock(value, spaces) {
  const indent = ' '.repeat(spaces)
  return value.split('\n').map((line) => `${indent}${line}`).join('\n')
}

function schemaType(value, depth = 0) {
  if (value.$ref) {
    const name = value.$ref.split('/').at(-1)
    const typeName = typeNames.get(name)
    if (!typeName) throw new Error(`알 수 없는 schema ref입니다: ${value.$ref}`)
    return typeName
  }
  if (Object.hasOwn(value, 'const')) return literal(value.const)
  if (value.enum) return value.enum.map(literal).join(' | ')
  if (Array.isArray(value.type)) {
    return value.type
      .map((type) => (type === 'null' ? 'null' : schemaType({ ...value, type }, depth)))
      .join(' | ')
  }
  if (value.type === 'string') return 'string'
  if (value.type === 'integer' || value.type === 'number') return 'number'
  if (value.type === 'boolean') return 'boolean'
  if (value.type === 'null') return 'null'
  if (value.type === 'array') return `Array<${schemaType(value.items, depth)}>`
  if (value.type === 'object') {
    const properties = value.properties ?? {}
    if (!Object.keys(properties).length && typeof value.additionalProperties === 'object') {
      return `Record<string, ${schemaType(value.additionalProperties, depth)}>`
    }
    const required = new Set(value.required ?? [])
    const lines = Object.entries(properties).map(([key, property]) => {
      const marker = required.has(key) ? '' : '?'
      return `${key}${marker}: ${schemaType(property, depth + 1)}`
    })
    if (!lines.length) return 'Record<string, never>'
    return `{\n${indentBlock(lines.join('\n'), (depth + 1) * 2)}\n${' '.repeat(depth * 2)}}`
  }
  throw new Error(`지원하지 않는 schema 조각입니다: ${JSON.stringify(value)}`)
}

function enumValues(definition, property) {
  const values = schema.$defs[definition]?.properties?.[property]?.enum
  if (!Array.isArray(values)) {
    throw new Error(`${definition}.${property} enum을 찾을 수 없습니다.`)
  }
  return values
}

function maxLength(definition) {
  const value = schema.$defs[definition]?.maxLength
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${definition}.maxLength를 찾을 수 없습니다.`)
  }
  return value
}

function maxItems(definition) {
  const value = schema.$defs[definition]?.maxItems
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${definition}.maxItems를 찾을 수 없습니다.`)
  }
  return value
}

const lines = [
  '// This file is generated from fieldweft-v1.schema.json.',
  '// Run `npm run generate:fieldweft-types` after changing the schema.',
  '',
  `export const FIELD_WEFT_FORMAT = ${literal(schema.properties.format.const)} as const`,
  `export const FIELD_WEFT_VERSION_V1 = ${literal(schema.properties.version.const)} as const`,
  `export const FIELD_WEFT_FIELD_TYPES_V1 = ${literal(enumValues('Field', 'type'))} as const`,
  `export const FIELD_WEFT_ENTITY_KINDS_V1 = ${literal(enumValues('Entity', 'kind'))} as const`,
  `export const FIELD_WEFT_BOUNDARY_COLORS_V1 = ${literal(enumValues('Boundary', 'color'))} as const`,
  `export const FIELD_WEFT_BOUNDARY_KINDS_V1 = ${literal(enumValues('Boundary', 'kind'))} as const`,
  `export const FIELD_WEFT_MAPPING_KINDS_V1 = ${literal(enumValues('Mapping', 'kind'))} as const`,
  `export const FIELD_WEFT_MAX_ID_CHARS_V1 = ${maxLength('Id')} as const`,
  `export const FIELD_WEFT_MAX_NAME_CHARS_V1 = ${maxLength('Name')} as const`,
  `export const FIELD_WEFT_MAX_LABEL_CHARS_V1 = ${maxLength('Label')} as const`,
  `export const FIELD_WEFT_MAX_DESCRIPTION_CHARS_V1 = ${maxLength('Description')} as const`,
  `export const FIELD_WEFT_MAX_TAG_CHARS_V1 = ${maxLength('Tag')} as const`,
  `export const FIELD_WEFT_MAX_TAGS_PER_OBJECT_V1 = ${maxItems('Tags')} as const`,
  `export const FIELD_WEFT_MAX_META_KEY_CHARS_V1 = ${schema.$defs.Metadata.propertyNames.maxLength} as const`,
  `export const FIELD_WEFT_MAX_META_ENTRIES_PER_OBJECT_V1 = ${schema.$defs.Metadata.maxProperties} as const`,
  `export const FIELD_WEFT_MAX_META_STRING_CHARS_V1 = ${schema.$defs.MetadataValue.maxLength} as const`,
  `export const FIELD_WEFT_MAX_VARIANT_VALUE_CHARS_V1 = ${maxLength('VariantValue')} as const`,
  `export const FIELD_WEFT_MAX_VARIANT_VALUES_V1 = ${maxItems('VariantValues')} as const`,
  '',
  'export type FieldWeftEntityKindV1 = (typeof FIELD_WEFT_ENTITY_KINDS_V1)[number]',
  'export type FieldWeftFieldTypeV1 = (typeof FIELD_WEFT_FIELD_TYPES_V1)[number]',
  'export type FieldWeftMappingKindV1 = (typeof FIELD_WEFT_MAPPING_KINDS_V1)[number]',
  'export type FieldWeftBoundaryKindV1 = (typeof FIELD_WEFT_BOUNDARY_KINDS_V1)[number]',
  'export type FieldWeftBoundaryColorV1 = (typeof FIELD_WEFT_BOUNDARY_COLORS_V1)[number]',
  '',
]

for (const [name, definition] of Object.entries(schema.$defs)) {
  lines.push(`export type ${typeNames.get(name)} = ${schemaType(definition)}`, '')
}
lines.push(`export type FieldWeftDocV1 = ${schemaType(schema)}`)

const generated = `${lines.join('\n')}\n`
if (process.argv.includes('--check')) {
  const current = readFileSync(outputPath, 'utf8')
  if (current !== generated) {
    process.stderr.write(
      'fieldweft-v1.generated.ts가 fieldweft-v1.schema.json과 일치하지 않습니다.\n',
    )
    process.exit(1)
  }
} else {
  writeFileSync(outputPath, generated)
}
