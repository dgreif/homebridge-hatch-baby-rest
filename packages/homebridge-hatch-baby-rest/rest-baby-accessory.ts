import { hap } from '../shared/hap.ts'
import type { PlatformAccessory } from 'homebridge'
import { BaseAccessory } from '../shared/base-accessory.ts'
import { debounceTime, map, startWith } from 'rxjs/operators'
import { Subject } from 'rxjs'
import { HsbColor } from '../shared/colors.ts'
import { logInfo } from '../shared/util.ts'
import { RestBaby } from './rest-baby.ts'

export class RestBabyAccessory extends BaseAccessory {
  constructor(restBaby: RestBaby, accessory: PlatformAccessory) {
    super(restBaby, accessory)

    const { Service, Characteristic } = hap,
      { name } = restBaby,
      staleSpeaker = accessory.getService(Service.Speaker)

    if (staleSpeaker) {
      accessory.removeService(staleSpeaker)
    }

    const onOffService = this.getService(Service.Switch),
      lightService = this.getService(Service.Lightbulb, 'Light'),
      volumeService = this.getService(Service.Fan, 'Volume'),
      onHsbSet = new Subject(),
      context = accessory.context as HsbColor,
      onBrightness = restBaby.onBrightness.pipe(startWith(context.b || 0))

    context.h = context.h || 0
    context.s = context.s || 0
    context.b = context.b || 0

    restBaby.onHue.subscribe((h) => (context.h = h))
    restBaby.onSaturation.subscribe((s) => (context.s = s))
    onBrightness.subscribe((b) => {
      context.b = b
      if (b > 0) {
        context.previousBrightness = b
      }
    })
    onHsbSet.pipe(debounceTime(100)).subscribe(() => {
      restBaby.setHsb(context)
    })

    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      restBaby.onSomeContentPlaying,
      (on) => {
        logInfo(`Turning ${on ? 'on first routine for' : 'off'} ${name}`)
        if (on) {
          restBaby.turnOnRoutine()
        } else {
          restBaby.turnOff()
        }
      },
    )

    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.On),
      onBrightness.pipe(map((brightness) => Boolean(brightness))),
      (on) => {
        if (on) {
          context.b = context.previousBrightness || 100
        } else {
          context.b = 0
        }
        onHsbSet.next(null)
      },
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Hue),
      restBaby.onHue,
      (hue) => {
        context.h = hue
        onHsbSet.next(null)
      },
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Saturation),
      restBaby.onSaturation,
      (saturation) => {
        context.s = saturation
        onHsbSet.next(null)
      },
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Brightness),
      onBrightness,
      (brightness) => {
        context.b = brightness
        onHsbSet.next(null)
      },
    )

    this.registerCharacteristic(
      volumeService.getCharacteristic(Characteristic.On),
      restBaby.onVolume.pipe(map((volume) => volume > 0)),
      (on) => {
        restBaby.setVolume(on ? 50 : 0)
      },
    )
    this.registerCharacteristic(
      volumeService.getCharacteristic(Characteristic.RotationSpeed),
      restBaby.onVolume,
      (volume) => restBaby.setVolume(volume),
    )

    onOffService.setPrimaryService(true)
  }
}
