import { hap } from '../shared/hap'
import { PlatformAccessory } from 'homebridge'
import { BaseAccessory } from '../shared/base-accessory'
import { RestIot } from './rest-iot'
import { Restore } from './restore'
import { RestoreIot } from './restore-iot'
import { logInfo } from '../shared/util'

export class RestoreAccessory extends BaseAccessory {
  constructor(restore: Restore | RestIot | RestoreIot, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap,
      onOffService = this.getService(Service.Switch),
      stepName = restore instanceof RestIot ? 'favorite' : 'bedtime step'

    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      restore.onSomeContentPlaying,
      (on) => {
        logInfo(
          `Turning ${on ? `on first ${stepName} for` : 'off'} ${restore.name}`
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
