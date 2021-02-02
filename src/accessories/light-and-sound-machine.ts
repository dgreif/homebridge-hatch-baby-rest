import { hap, isTestHomebridge } from '../hap'
import {
  debounceTime,
  distinctUntilChanged,
  map,
  startWith,
} from 'rxjs/operators'
import { Observable, of, Subject } from 'rxjs'
import {
  Characteristic as CharacteristicClass,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service as ServiceClass,
  WithUUID,
} from 'homebridge'
import { AudioTrack, audioTracks } from '../hatch-baby-types'
import { HsbColor } from '../colors'
import { logInfo } from '../util'

export interface LightAndSoundMachine {
  name: string
  macAddress: string

  onIsPowered: Observable<boolean>
  onBrightness: Observable<number>
  onHue: Observable<number>
  onSaturation: Observable<number>
  onBatteryLevel?: Observable<number>
  onVolume: Observable<number>
  onAudioTrack: Observable<AudioTrack>
  onFirmwareVersion?: Observable<string>

  setHsb: (hsb: HsbColor) => any
  setPower: (on: boolean) => any
  setVolume: (volume: number) => any
  setAudioTrack: (track: AudioTrack) => any
}

export class HatchBabyRestPlusAccessory {
  constructor(
    private light: LightAndSoundMachine,
    private accessory: PlatformAccessory
  ) {
    const { Service, Characteristic } = hap,
      { name } = light,
      lightService = this.getService(Service.Lightbulb, 'Light'),
      speakerService = this.getService(Service.Speaker, 'Volume'),
      accessoryInfoService = this.getService(Service.AccessoryInformation),
      audioService = this.getService(Service.Fan, 'Audio Track'),
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

    this.registerCharacteristic(
      audioService.getCharacteristic(Characteristic.On),
      light.onAudioTrack.pipe(
        map((audioTrack) => audioTrack !== AudioTrack.None)
      ),
      (on: boolean) => {
        if (!on) {
          light.setAudioTrack(AudioTrack.None)
        }
      }
    )

    this.registerCharacteristic(
      audioService.getCharacteristic(Characteristic.RotationSpeed),
      light.onAudioTrack.pipe(
        map((audioTrack) => audioTracks.indexOf(audioTrack))
      ),
      (level: number) => {
        const audioTrack = audioTracks[level]
        if (audioTrack !== undefined) {
          light.setAudioTrack(audioTrack)
        }
      }
    )

    audioService
      .getCharacteristic(Characteristic.RotationSpeed)
      .setProps({ minValue: 0, maxValue: audioTracks.length - 1 })

    accessoryInfoService
      .getCharacteristic(Characteristic.Manufacturer)
      .updateValue('Hatch Baby')
    accessoryInfoService
      .getCharacteristic(Characteristic.Model)
      .updateValue('Rest+')
    accessoryInfoService
      .getCharacteristic(Characteristic.SerialNumber)
      .updateValue(light.macAddress)

    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.FirmwareRevision),
      light.onFirmwareVersion || of('')
    )
    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.Name),
      of(light.name)
    )

    onOffService.setPrimaryService(true)
  }

  getService(serviceType: WithUUID<typeof ServiceClass>, nameSuffix?: string) {
    let name = nameSuffix ? this.light.name + ' ' + nameSuffix : this.light.name
    if (isTestHomebridge) {
      name = 'TEST ' + name
    }

    const existingService = this.accessory.getService(serviceType)
    return existingService || this.accessory.addService(serviceType, name)
  }

  registerCharacteristic(
    characteristic: CharacteristicClass,
    onValue: Observable<any>,
    setValue?: (value: any) => any
  ) {
    if (setValue) {
      characteristic.on(
        CharacteristicEventTypes.SET,
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          callback()
          setValue(value)
        }
      )
    }

    onValue.pipe(distinctUntilChanged()).subscribe((value) => {
      characteristic.updateValue(value)
    })
  }
}
