import { hap } from '../hap'
import { filter, map } from 'rxjs/operators'
import { Observable } from 'rxjs'
import { PlatformAccessory } from 'homebridge'
import { BaseAccessory, BaseDevice } from './base-accessory'

export interface SoundMachine extends BaseDevice {
  audioTracks: number[]

  onVolume: Observable<number>
  onAudioPlaying: Observable<boolean>
  onAudioTrack: Observable<number>

  setVolume: (volume: number) => any
  setAudioPlaying: (playing: boolean) => any
  setAudioTrack: (track: number) => any
}

export class SoundMachineAccessory extends BaseAccessory {
  constructor(device: SoundMachine, accessory: PlatformAccessory) {
    super(device, accessory)

    const { Service, Characteristic } = hap,
      speakerService = this.getService(Service.Speaker, 'Volume'),
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
  }
}
