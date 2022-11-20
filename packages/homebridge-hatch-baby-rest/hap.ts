import { HAP } from 'homebridge'

export let hap: HAP
export function setHap(hapInstance: HAP) {
  hap = hapInstance
}

export const isTestHomebridge = process.env.TEST_HOMEBRIDGE === 'true'

export const pluginName = 'homebridge-hatch-baby-rest'
export const platformName = 'HatchBabyRest'
