import { PlatformAccessory } from 'homebridge'
import { hap } from '../shared/hap'
import { LightAndSoundMachineAccessory } from '../shared/light-and-sound-machine'
import { logInfo } from '../shared/util'
import { RestIot } from './rest-iot'
import { Restore2 } from './restore-v2'

export class RestoreV2Accessory extends LightAndSoundMachineAccessory {
  constructor(restore: Restore2, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap,
      onOffService = this.getService(Service.Switch),
      stepName = restore instanceof RestIot ? 'routine' : 'bedtime step'

    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      restore.onSomeContentPlaying,
      (on) => {
        logInfo(
          `Turning ${on ? `on first ${stepName} for` : 'off'} ${restore.name}`,
        )
        if (on) {
          restore.turnOnRoutine()
        } else {
          restore.turnOff()
        }
      },
    )

    onOffService.setPrimaryService(true)
  }
}
