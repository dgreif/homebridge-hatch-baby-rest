import { hap } from '../hap'
import { debounceTime, map, startWith } from 'rxjs/operators'
import { Observable, Subject } from 'rxjs'
import { PlatformAccessory } from 'homebridge'
import { HsbColor } from '../colors'
import { logInfo } from '../util'
import { SoundMachine, SoundMachineAccessory } from './sound-machine'

export interface LightAndSoundMachine extends SoundMachine {
  onIsPowered: Observable<boolean>
  onBrightness: Observable<number>
  onHue: Observable<number>
  onSaturation: Observable<number>
  onBatteryLevel?: Observable<number>

  setHsb: (hsb: HsbColor) => any
  setPower: (on: boolean) => any
}

export class LightAndSoundMachineAccessory extends SoundMachineAccessory {
  constructor(
    private light: LightAndSoundMachine,
    protected accessory: PlatformAccessory
  ) {
    super(light, accessory)

    const { Service, Characteristic } = hap,
      { name } = light,
      lightService = this.getService(Service.Lightbulb, 'Light'),
      onOffService = this.getService(Service.Switch),
      onHsbSet = new Subject(),
      context = accessory.context as HsbColor,
      onBrightness = light.onBrightness.pipe(startWith(context.b || 0))

    context.h = context.h || 0
    context.s = context.s || 0
    context.b = context.b || 0

    light.onHue.subscribe((h) => (context.h = h))
    light.onSaturation.subscribe((s) => (context.s = s))
    onBrightness.subscribe((b) => (context.b = b))
    onHsbSet.pipe(debounceTime(100)).subscribe(() => {
      light.setHsb(context)
    })

    this.registerCharacteristic(
      onOffService.getCharacteristic(Characteristic.On),
      light.onIsPowered,
      (on) => {
        logInfo(`Turning ${on ? 'on' : 'off'} ${name}`)
        light.setPower(on)
      }
    )

    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.On),
      onBrightness.pipe(map((brightness) => Boolean(brightness)))
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Hue),
      light.onHue,
      (hue) => {
        context.h = hue
        onHsbSet.next()
      }
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Saturation),
      light.onSaturation,
      (saturation) => {
        context.s = saturation
        onHsbSet.next()
      }
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Brightness),
      onBrightness,
      (brightness) => {
        context.b = brightness
        onHsbSet.next()
      }
    )

    if (light.onBatteryLevel) {
      const batteryService = this.getService(Service.BatteryService, name)

      this.registerCharacteristic(
        batteryService.getCharacteristic(Characteristic.BatteryLevel),
        light.onBatteryLevel
      )
      this.registerCharacteristic(
        batteryService.getCharacteristic(Characteristic.StatusLowBattery),
        light.onBatteryLevel.pipe(
          map((batteryLevel) => (batteryLevel < 20 ? 1 : 0))
        )
      )

      batteryService
        .getCharacteristic(Characteristic.ChargingState)
        .updateValue(2) // "not chargeable". no way to detect if it is plugged in.
    }

    onOffService.setPrimaryService(true)
  }
}
