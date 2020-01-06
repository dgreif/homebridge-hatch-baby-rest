import { hap, platformName, pluginName } from './hap'
import { HatchBabyRestAccessory } from './accessories/hatch-baby-rest'
import { HatchBabyRestPlatform } from './platform'

export default function(homebridge: any) {
  hap.PlatformAccessory = homebridge.platformAccessory
  hap.Service = homebridge.hap.Service
  hap.Characteristic = homebridge.hap.Characteristic
  hap.UUIDGen = homebridge.hap.uuid
  hap.AccessoryCategories = homebridge.hap.Accessory.Categories

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
