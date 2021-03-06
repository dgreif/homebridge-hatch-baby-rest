import { hap, isTestHomebridge } from '../hap'
import { distinctUntilChanged, filter, map } from 'rxjs/operators'
import { Observable, of } from 'rxjs'
import {
  Characteristic as CharacteristicClass,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service as ServiceClass,
  WithUUID,
} from 'homebridge'
import { LightAndSoundMachine } from './light-and-sound-machine'

export interface SoundMachine {
  name: string
  macAddress: string
  model: string
  audioTracks: number[]

  onVolume: Observable<number>
  onAudioPlaying: Observable<boolean>
  onAudioTrack: Observable<number>
  onFirmwareVersion?: Observable<string>

  setVolume: (volume: number) => any
  setAudioPlaying: (playing: boolean) => any
  setAudioTrack: (track: number) => any
}

export class SoundMachineAccessory {
  constructor(
    private device: SoundMachine | LightAndSoundMachine,
    protected accessory: PlatformAccessory
  ) {
    const { Service, Characteristic } = hap,
      speakerService = this.getService(Service.Speaker, 'Volume'),
      accessoryInfoService = this.getService(Service.AccessoryInformation),
      audioService = this.getService(
        Service.Fan,
        'onBrightness' in device ? 'Audio Track' : undefined
      ),
      { audioTracks } = device

    this.registerCharacteristic(
      speakerService.getCharacteristic(Characteristic.Volume),
      device.onVolume,
      (volume) => device.setVolume(volume)
    )
    this.registerCharacteristic(
      speakerService.getCharacteristic(Characteristic.Mute),
      device.onVolume.pipe(map((volume) => volume === 0)),
      (mute) => {
        device.setVolume(mute ? 0 : 50)
      }
    )

    this.registerCharacteristic(
      audioService.getCharacteristic(Characteristic.On),
      device.onAudioPlaying,
      (on: boolean) => device.setAudioPlaying(on)
    )

    this.registerCharacteristic(
      audioService.getCharacteristic(Characteristic.RotationSpeed),
      device.onAudioTrack.pipe(
        filter((audioTrack) => Boolean(audioTrack)),
        map((audioTrack) => audioTracks.indexOf(audioTrack))
      ),
      (level: number) => {
        const audioTrack = audioTracks[level]

        if (audioTrack !== undefined) {
          device.setAudioTrack(audioTrack)
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
      .updateValue(device.model)
    accessoryInfoService
      .getCharacteristic(Characteristic.SerialNumber)
      .updateValue(device.macAddress)

    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.FirmwareRevision),
      device.onFirmwareVersion || of('')
    )
    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.Name),
      of(device.name)
    )
  }

  getService(serviceType: WithUUID<typeof ServiceClass>, nameSuffix?: string) {
    let name = nameSuffix
      ? this.device.name + ' ' + nameSuffix
      : this.device.name

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
