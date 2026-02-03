import { PlatformAccessory } from 'homebridge'
import { hap } from '../shared/hap.ts'
import { LightAndSoundMachineAccessory } from '../shared/light-and-sound-machine.ts'
import { logInfo } from '../shared/util.ts'
import { RestoreV5 } from './restore-v5.ts'

/**
 * RestoreV5 Accessory - exposes Hatch Restore 2 (restoreV5) to HomeKit
 * 
 * Provides:
 * - Light control (brightness, color)
 * - Switch for routine on/off
 * - Volume control (via custom characteristic)
 */
export class RestoreV5Accessory extends LightAndSoundMachineAccessory {
  constructor(restore: RestoreV5, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap,
      onOffService = this.getService(Service.Switch)

    // Register the on/off characteristic for routine control
    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      restore.onSomeContentPlaying,
      (on) => {
        logInfo(
          `Turning ${on ? 'on bedtime routine for' : 'off'} ${restore.name}`,
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
