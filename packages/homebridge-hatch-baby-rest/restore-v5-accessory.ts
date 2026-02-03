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
 * - Nightlight (Lightbulb): independent light control with brightness and color
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

    // === Nightlight (Lightbulb with color) ===
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
      debounce(
        (brightness: number) => restore.setNightlightBrightness(brightness),
        300,
      ),
    )

    // Track PENDING color values to avoid race conditions between H and S updates
    let pendingHsb = { h: 0, s: 100, b: 50 }
    let colorTimeout: ReturnType<typeof setTimeout> | null = null

    // Initialize from device state (only when not actively setting)
    restore.onNightlightHsb.subscribe((hsb) => {
      if (!colorTimeout) {
        pendingHsb = { ...hsb }
      }
    })

    // Debounced color update - combines H and S changes into single update
    const sendColorUpdate = () => {
      if (colorTimeout) clearTimeout(colorTimeout)
      colorTimeout = setTimeout(() => {
        restore.setNightlightColor(pendingHsb)
        colorTimeout = null
      }, 350)
    }

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.Hue),
      restore.onNightlightHue,
      (hue: number) => {
        pendingHsb.h = hue
        sendColorUpdate()
      },
    )

    this.registerCharacteristic(
      nightlightService.getCharacteristic(Characteristic.Saturation),
      restore.onNightlightSaturation,
      (saturation: number) => {
        pendingHsb.s = saturation
        sendColorUpdate()
      },
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
