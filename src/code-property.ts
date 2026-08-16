/** Schema properties exist only when they are own properties serialized by JSON. */
export function hasOwnEnumerableProperty(
  value: object,
  key: PropertyKey,
): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function getOwnEnumerableProperty<
  Value extends object,
  Key extends keyof Value,
>(value: Value, key: Key): Value[Key] | undefined {
  return hasOwnEnumerableProperty(value, key) ? value[key] : undefined
}
