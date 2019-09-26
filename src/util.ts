export function kebabCaseAddress(macAddress: string) {
  const dashMac = macAddress
    .replace(/[^0-9a-fA-F]/g, '')
    .split('')
    .reduce((mac, letter, index) => {
      if (index % 2 === 0 && mac.length > 0) {
        mac += '-'
      }
      return mac + letter
    }, '')
    .toLowerCase()

  if (dashMac.length !== 17) {
    throw new Error('Invalid mac address ' + macAddress)
  }

  return dashMac
}

export function stripUuid(uuid: string) {
  return uuid.replace(/-/g, '').toLowerCase()
}

export function stripMacAddress(uuid: string) {
  return uuid.replace(/-|:/g, '').toLowerCase()
}

export function delay(milliseconds: number) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}
