import { platformName, pluginName, setHap } from './hap'
import { HatchBabyRestPlatform } from './platform'

export default function (homebridge: any) {
  setHap(homebridge.hap)

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchBabyRestPlatform,
    true
  )
}
