import { HatchBabyRestPlus } from '../hatch-baby-rest-plus'
import { hap } from '../hap'
import { debounceTime, distinctUntilChanged, map, take } from 'rxjs/operators'
import { combineLatest, Observable, of, Subject } from 'rxjs'
import {
  PlatformAccessory,
  WithUUID,
  Service as ServiceClass,
  Characteristic as CharacteristicClass,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
} from 'homebridge'
import { HatchBabyPlatformOptions, SpecialColor } from '../hatch-baby-types'

export class HatchBabyRestPlusAccessory {
  constructor(
    private light: HatchBabyRestPlus,
    private accessory: PlatformAccessory,
    private options: HatchBabyPlatformOptions
  ) {
    const { Service, Characteristic } = hap,
      lightService = this.getService(Service.Lightbulb),
      batteryService = this.getService(Service.BatteryService),
      speakerService = this.getService(Service.Speaker),
      accessoryInfoService = this.getService(Service.AccessoryInformation),
      onSetHue = new Subject<number>(),
      onSetSaturation = new Subject<number>()

    combineLatest([onSetHue, onSetSaturation])
      .pipe(debounceTime(100))
      .subscribe(([hue, saturation]) => {
        if (this.options.alwaysRainbow) {
          light.setColor(SpecialColor.Rainbow)
          return
        }

        light.setColorFromHueAndSaturation(hue, saturation)
      })

    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.On),
      light.onIsPowered,
      (on) => {
        light.setPower(on)

        if (on && this.options.alwaysRainbow) {
          light.setColor(SpecialColor.Rainbow)
        }
      }
    )

    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Brightness),
      light.onBrightness,
      (brightness) => light.setBrightness(brightness)
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Hue),
      light.onHue,
      (hue) => onSetHue.next(hue)
    )
    this.registerCharacteristic(
      lightService.getCharacteristic(Characteristic.Saturation),
      light.onSaturation,
      (sat) => onSetSaturation.next(sat)
    )

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

    this.registerCharacteristic(
      speakerService.getCharacteristic(Characteristic.Volume),
      light.onVolume,
      (volume) => light.setVolume(volume)
    )
    this.registerCharacteristic(
      speakerService.getCharacteristic(Characteristic.Mute),
      light.onVolume.pipe(map((volume) => volume === 0)),
      (mute) => {
        light.setVolume(mute ? 0 : 50)
      }
    )

    accessoryInfoService
      .getCharacteristic(Characteristic.Manufacturer)
      .updateValue('Hatch Baby')
    accessoryInfoService
      .getCharacteristic(Characteristic.Model)
      .updateValue('Rest+')
    accessoryInfoService
      .getCharacteristic(Characteristic.SerialNumber)
      .updateValue('Unknown')

    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.FirmwareRevision),
      light.onState.pipe(map((state) => state.deviceInfo.f))
    )
    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.Name),
      of(light.name)
    )
  }

  getService(serviceType: WithUUID<typeof ServiceClass>) {
    const existingService = this.accessory.getService(serviceType)
    return existingService || this.accessory.addService(serviceType)
  }

  registerCharacteristic(
    characteristic: CharacteristicClass,
    onValue: Observable<any>,
    setValue?: (value: any) => any
  ) {
    const getValue = () => onValue.pipe(take(1)).toPromise()

    if (setValue) {
      characteristic.on(
        CharacteristicEventTypes.SET,
        async (
          value: CharacteristicValue,
          callback: CharacteristicSetCallback
        ) => {
          callback()

          const currentValue = await getValue()
          if (value !== currentValue) {
            setValue(value)
          }
        }
      )
    }

    onValue.pipe(distinctUntilChanged()).subscribe((value) => {
      characteristic.updateValue(value)
    })
  }
}
