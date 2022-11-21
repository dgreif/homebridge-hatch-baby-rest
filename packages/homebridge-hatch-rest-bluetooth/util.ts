export function stripUuid(uuid: string) {
  return uuid.replace(/-/g, '').toLowerCase()
}

export function stripMacAddress(uuid: string) {
  return uuid.replace(/-|:/g, '').toLowerCase()
}
