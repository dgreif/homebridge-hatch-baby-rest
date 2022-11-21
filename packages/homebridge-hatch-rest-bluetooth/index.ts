import { setHap } from '../shared/hap'
import { migrateRestBluetooth } from '../shared/migrate-bluetooth'
import {
  HatchRestBluetoothPlatform,
  platformName,
  pluginName,
} from './platform'

export default function (homebridge: any) {
  setHap(homebridge.hap)

  migrateRestBluetooth(homebridge)

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchRestBluetoothPlatform,
    true
  )
}
