import { platformName, pluginName, setHap } from './hap'
import { HatchBabyRestAccessory } from './accessories/hatch-baby-rest'
import { HatchBabyRestPlatform } from './platform'

export default function (homebridge: any) {
  setHap(homebridge.hap)

  homebridge.registerAccessory(
    pluginName,
    'HatchBabyRest',
    HatchBabyRestAccessory
  )

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchBabyRestPlatform,
    true
  )
}
