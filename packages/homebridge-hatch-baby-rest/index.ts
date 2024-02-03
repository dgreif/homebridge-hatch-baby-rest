import { setHap } from '../shared/hap'
import { HatchBabyRestPlatform, platformName, pluginName } from './platform'
import { migrateRestBluetooth } from '../shared/migrate-bluetooth'

export default function (homebridge: any) {
  setHap(homebridge.hap)

  migrateRestBluetooth(homebridge)

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchBabyRestPlatform,
    true,
  )
}
