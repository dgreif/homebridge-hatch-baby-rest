import { setHap } from '../shared/hap.ts'
import { migrateRestBluetooth } from '../shared/migrate-bluetooth.ts'
import {
  HatchRestBluetoothPlatform,
  platformName,
  pluginName,
} from './platform.ts'

export default function (homebridge: any) {
  setHap(homebridge.hap)

  migrateRestBluetooth(homebridge)

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchRestBluetoothPlatform,
    true,
  )
}
