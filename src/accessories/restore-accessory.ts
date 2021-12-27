import { hap } from '../hap'
import { PlatformAccessory } from 'homebridge'
import { BaseAccessory } from './base-accessory'
import { RestIot } from '../rest-iot'
import { Restore } from '../restore'
import { logInfo } from '../util'

export class RestoreAccessory extends BaseAccessory {
  constructor(restore: Restore | RestIot, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap,
      onOffService = this.getService(Service.Switch)

    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      restore.onSomeContentPlaying,
      (on) => {
        logInfo(
          `Turning ${on ? 'on first bedtime step for' : 'off'} ${restore.name}`
        )
        if (on) {
          restore.turnOnRoutine()
        } else {
          restore.turnOff()
        }
      }
    )

    onOffService.setPrimaryService(true)
  }
}
