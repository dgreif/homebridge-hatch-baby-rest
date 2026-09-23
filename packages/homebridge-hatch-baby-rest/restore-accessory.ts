import { hap } from '../shared/hap.ts'
import type { PlatformAccessory } from 'homebridge'
import { BaseAccessory } from '../shared/base-accessory.ts'
import { RestIot } from './rest-iot.ts'
import { Restore } from './restore.ts'
import { logError, logInfo } from '../shared/util.ts'

export class RestoreAccessory extends BaseAccessory {
  constructor(restore: Restore | RestIot, accessory: PlatformAccessory) {
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
          // for RestIot devices, turnOnRoutine fetches routines over HTTPS
          // first; an uncaught rejection there (e.g. a transient 5xx) would
          // crash the process on modern Node. Restore's turnOnRoutine is
          // synchronous, for which this wrapper is a harmless no-op
          Promise.resolve(restore.turnOnRoutine()).catch((e) => {
            logError(`Failed to turn on first ${stepName} for ${restore.name}`)
            logError(e)
          })
        } else {
          restore.turnOff()
        }
      },
    )

    onOffService.setPrimaryService(true)
  }
}
