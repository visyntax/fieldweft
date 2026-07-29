function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pointer(path, key) {
  const token = String(key).replaceAll('~', '~0').replaceAll('/', '~1')
  return `${path}/${token}`
}

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`지원하지 않는 schema ref: ${ref}`)
  return ref
    .slice(2)
    .split('/')
    .reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], root)
}

function exceedsCodePointLimit(value, limit) {
  let length = 0
  for (const unused of value) {
    void unused
    length++
    if (length > limit) return true
  }
  return false
}

function visit(root, schema, value, path, errors) {
  if (schema.$ref) {
    visit(root, resolveRef(root, schema.$ref), value, path, errors)
    return
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    errors.push({ path, keyword: 'const' })
    return
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({ path, keyword: 'enum' })
    return
  }
  if (Array.isArray(schema.type)) {
    const matches = schema.type.some((type) => {
      if (type === 'null') return value === null
      if (type === 'string') return typeof value === 'string'
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
      if (type === 'boolean') return typeof value === 'boolean'
      if (type === 'integer') return Number.isSafeInteger(value)
      if (type === 'array') return Array.isArray(value)
      if (type === 'object') return isObject(value)
      return false
    })
    if (!matches) {
      errors.push({ path, keyword: 'type' })
      return
    }
    if (typeof value === 'string') {
      if (schema.minLength != null && value.length < schema.minLength) {
        errors.push({ path, keyword: 'minLength' })
      }
      if (
        schema.maxLength != null &&
        exceedsCodePointLimit(value, schema.maxLength)
      ) {
        errors.push({ path, keyword: 'maxLength' })
      }
      if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
        errors.push({ path, keyword: 'pattern' })
      }
    }
    return
  }

  if (schema.type === 'object') {
    if (!isObject(value)) {
      errors.push({ path, keyword: 'type' })
      return
    }
    const properties = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push({ path: pointer(path, key), keyword: 'required' })
      }
    }
    if (
      schema.maxProperties != null &&
      Object.keys(value).length > schema.maxProperties
    ) {
      errors.push({ path, keyword: 'maxProperties' })
    }
    for (const [key, item] of Object.entries(value)) {
      if (schema.propertyNames) {
        visit(root, schema.propertyNames, key, pointer(path, key), errors)
      }
      if (properties[key]) {
        visit(root, properties[key], item, pointer(path, key), errors)
      } else if (schema.additionalProperties === false) {
        errors.push({ path: pointer(path, key), keyword: 'additionalProperties' })
      } else if (isObject(schema.additionalProperties)) {
        visit(
          root,
          schema.additionalProperties,
          item,
          pointer(path, key),
          errors,
        )
      }
    }
    return
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push({ path, keyword: 'type' })
      return
    }
    if (schema.minItems != null && value.length < schema.minItems) {
      errors.push({ path, keyword: 'minItems' })
    }
    if (schema.maxItems != null && value.length > schema.maxItems) {
      errors.push({ path, keyword: 'maxItems' })
    }
    if (
      schema.uniqueItems === true &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    ) {
      errors.push({ path, keyword: 'uniqueItems' })
    }
    value.forEach((item, index) => {
      if (schema.items) visit(root, schema.items, item, pointer(path, index), errors)
    })
    return
  }

  if (schema.type === 'string' && typeof value !== 'string') {
    errors.push({ path, keyword: 'type' })
    return
  }
  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push({ path, keyword: 'type' })
    return
  }
  if (
    schema.type === 'integer' &&
    (!Number.isSafeInteger(value) || typeof value !== 'number')
  ) {
    errors.push({ path, keyword: 'type' })
    return
  }
  if (
    schema.type === 'number' &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    errors.push({ path, keyword: 'type' })
    return
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) {
      errors.push({ path, keyword: 'minLength' })
    }
    if (
      schema.maxLength != null &&
      exceedsCodePointLimit(value, schema.maxLength)
    ) {
      errors.push({ path, keyword: 'maxLength' })
    }
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push({ path, keyword: 'pattern' })
    }
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) {
      errors.push({ path, keyword: 'minimum' })
    }
    if (schema.maximum != null && value > schema.maximum) {
      errors.push({ path, keyword: 'maximum' })
    }
  }
}

export function validateJsonSchema(schema, value) {
  const errors = []
  visit(schema, schema, value, '', errors)
  return errors
}
