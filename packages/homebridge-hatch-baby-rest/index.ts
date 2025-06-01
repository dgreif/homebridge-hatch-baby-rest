import { setHap } from '../shared/hap.ts'
import { HatchBabyRestPlatform, platformName, pluginName } from './platform.ts'
import { migrateRestBluetooth } from '../shared/migrate-bluetooth.ts'

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
