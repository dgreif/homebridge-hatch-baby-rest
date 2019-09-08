import { hap } from './hap'
import { HatchBabyRestAccessory } from './accessory'

export default function(homebridge: any) {
  hap.PlatformAccessory = homebridge.platformAccessory
  hap.Service = homebridge.hap.Service
  hap.Characteristic = homebridge.hap.Characteristic
  hap.UUIDGen = homebridge.hap.uuid
  hap.AccessoryCategories = homebridge.hap.Accessory.Categories

  homebridge.registerAccessory(
    'homebridge-hatch-baby-rest',
    'HatchBabyRest',
    HatchBabyRestAccessory
  )
}
