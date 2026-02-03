import { PlatformAccessory } from 'homebridge'
import { hap } from '../shared/hap.ts'
import { BaseAccessory } from '../shared/base-accessory.ts'
import { logInfo } from '../shared/util.ts'
import { RestoreV5 } from './restore-v5.ts'

// Debounce helper - waits until value stops changing before calling fn
function debounce<T>(fn: (value: T) => void, delay = 300): (value: T) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (value: T) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(value), delay)
  }
}

/**
 * RestoreV5 Accessory - exposes Hatch Restore 2 (restoreV5) to HomeKit
 *
 * Provides three separate controls:
 * - Routine (Switch): plays/stops the first saved routine
 * - Nightlight (Lightbulb): independent light control with brightness
 * - Volume (Lightbulb): sound volume control with brightness slider
 */
export class RestoreV5Accessory extends BaseAccessory {
  constructor(restore: RestoreV5, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap

    // === Routine Switch ===
    const routineService = this.getService(Service.Switch, 'Routine', 'routine')
    routineService.updateCharacteristic(Characteristic.Name, 'Routine')

    this.registerCharacteristic(
      routineService.getCharacteristic(Characteristic.On),
      restore.onSomeContentPlaying,
      (on) => {
        logInfo(`Turning ${on ? 'on routine for' : 'off'} ${restore.name}`)
        if (on) {
          restore.turnOnRoutine()
        } else {
          restore.turnOff()
        }
      },
    )
    routineService.setPrimaryService(true)

    // === Nightlight (Lightbulb) ===
    const nightlightService = this.getService(
      Service.Lightbulb,
      'Nightlight',
      'nightlight',
    )
    nightlightService.updateCharacteristic(Characteristic.Name, 'Nightlight')

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.On),
      restore.onNightlightOn,
      (on) => restore.setNightlightOn(on),
    )

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.Brightness),
      restore.onNightlightBrightness,
      debounce((brightness: number) => restore.setNightlightBrightness(brightness), 300),
    )

    // Track current HSB for color changes
    let currentHsb = { h: 0, s: 0, b: 50 }
    restore.onNightlightHsb.subscribe((hsb) => {
      currentHsb = hsb
    })

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.Hue),
      restore.onNightlightHue,
      debounce((hue: number) => restore.setNightlightColor({ ...currentHsb, h: hue }), 300),
    )

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.Saturation),
      restore.onNightlightSaturation,
      debounce((saturation: number) => restore.setNightlightColor({ ...currentHsb, s: saturation }), 300),
    )

    // === Volume (Lightbulb for slider access) ===
    const volumeService = this.getService(Service.Lightbulb, 'Volume', 'volume')
    volumeService.updateCharacteristic(Characteristic.Name, 'Volume')

    this.registerCharacteristic(
      volumeService.getCharacteristic(Characteristic.On),
      restore.onVolumeOn,
      (on) => restore.setVolume(on ? 50 : 0),
    )

    this.registerCharacteristic(
      volumeService.getCharacteristic(Characteristic.Brightness),
      restore.onVolume,
      debounce((volume: number) => restore.setVolume(volume), 300),
    )
  }
}
