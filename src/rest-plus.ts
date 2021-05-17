import {
  AudioTrack,
  audioTracks,
  IotDeviceInfo,
  RestPlusColor,
  RestPlusState,
} from './hatch-sleep-types'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { LightAndSoundMachine } from './accessories/light-and-sound-machine'
import { HsbColor, hsbToRgb, rgbToHsb } from './colors'
import {
  convertFromPercentage,
  convertToPercentage,
  IotDevice,
  MAX_IOT_VALUE,
} from './iot-device'

export class RestPlus
  extends IotDevice<RestPlusState>
  implements LightAndSoundMachine
{
  readonly model = 'Rest+'
  audioTracks = audioTracks

  constructor(public readonly info: IotDeviceInfo) {
    super(info)
  }

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.a.v)),
    distinctUntilChanged()
  )

  onAudioTrack = this.onState.pipe(
    map((state) => state.a.t),
    distinctUntilChanged()
  )

  onAudioPlaying = this.onAudioTrack.pipe(
    map((track) => track !== AudioTrack.None),
    distinctUntilChanged()
  )

  onIsPowered = this.onState.pipe(
    map((state) => state.isPowered),
    distinctUntilChanged()
  )

  onBrightness = this.onState.pipe(
    map(({ c }) => {
      if (c.r === 0 && c.g === 0 && c.b === 0 && !c.R && !c.W) {
        // when "no" color is selected in Rest app, i (intensity) doesn't get set to 0, but everything else does
        return 0
      }
      return convertToPercentage(c.i)
    }),
    distinctUntilChanged()
  )

  onHsb = this.onState.pipe(map((state) => rgbToHsb(state.c, MAX_IOT_VALUE)))

  onHue = this.onHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged()
  )

  onSaturation = this.onHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged()
  )

  onBatteryLevel = this.onState.pipe(
    map((state) => state.deviceInfo.b),
    distinctUntilChanged()
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  setVolume(percentage: number) {
    this.update({
      a: {
        v: convertFromPercentage(percentage),
      },
    })
  }

  setAudioTrack(audioTrack: AudioTrack) {
    this.update({
      a: {
        t: audioTrack,
      },
    })
  }

  setAudioPlaying(playing: boolean) {
    if (!playing) {
      return this.setAudioTrack(AudioTrack.None)
    }

    // do nothing for other audio tracks.  They will be handed to `setAudioTrack` directly
  }

  setColor(color: Partial<RestPlusColor>) {
    this.update({
      c: color,
    })
  }

  setHsb({ h, s, b }: HsbColor) {
    // NOTE: lights assume 100% brightness in color calculations
    const rgb = hsbToRgb({ h, s, b: 100 }, MAX_IOT_VALUE)

    this.setColor({
      ...rgb,
      R: false,
      W: false,
      i: convertFromPercentage(b),
    })
  }

  setPower(on: boolean) {
    this.update({
      isPowered: on,
    })
  }
}
