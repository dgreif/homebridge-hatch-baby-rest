import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { HsbColor, hsbToRgb, rgbToHsb } from '../shared/colors'
import { AudioTrack, IotDeviceInfo, RestIotRoutine, Restore2Color, Restore2State, SoundId, soundIds } from '../shared/hatch-sleep-types'
import { LightAndSoundMachine } from '../shared/light-and-sound-machine'
import { convertFromPercentage, convertToPercentage, IotDevice, MAX_IOT_VALUE } from './iot-device'
import { apiPath, RestClient } from './rest-client'

export class Restore2 extends IotDevice<Restore2State> implements LightAndSoundMachine {
  readonly model = 'RestoreV4'

  constructor(
    public readonly info: IotDeviceInfo,
    public readonly onIotClient: BehaviorSubject<AwsIotDevice>,
    public readonly restClient: RestClient,
  ) {
    super(info, onIotClient)
  }

  // Getters
  audioTracks = soundIds

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.current.sound.v)),
    distinctUntilChanged()
  )

  onAudioTrack = this.onState.pipe(
    map((state) => state.current.sound.id),
    distinctUntilChanged()
  )

  onAudioPlaying = this.onAudioTrack.pipe(
    map((track) => track !== AudioTrack.None),
    distinctUntilChanged()
  )

  onIsPowered = this.onState.pipe(
    map((state) => state.deviceInfo.powerStatus),
    distinctUntilChanged(),
  )

  onBrightness = this.onState.pipe(
    map(({ current }) => {
      if (current.color.r === 0 && current.color.g === 0 && current.color.b === 0 && !current.color.r && !current.color.w) {
        // when "no" color is selected in Rest app, i (intensity) doesn't get set to 0, but everything else does
        return 0
      }
      return convertToPercentage(current.color.i)
    }),
    distinctUntilChanged()
  )

  onHsb = this.onState.pipe(map((state) => rgbToHsb(state.current.color, MAX_IOT_VALUE)))

  onHue = this.onHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged(),
  )

  onSaturation = this.onHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged(),
  )

  onBatteryLevel?: undefined

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  // Setters

  setColor(color: Partial<Restore2Color>) {
    this.update({
      current: {
        color: color
      }
    })
  }

  setHsb({ h, s, b }: HsbColor) {
    // NOTE: lights assume 100% brightness in color calculations
    const rgb = hsbToRgb({ h, s, b: 100 }, MAX_IOT_VALUE)

    this.setColor({
      ...rgb,
      w: false,
      i: convertFromPercentage(b),
    })

  }

  setPower(on: boolean) {
    this.update({
      deviceInfo: {
        powerStatus: on
      }
    })

    if (!on) {
      this.turnOff()
    } else {
      this.turnOnRoutine()
    }
  }

  setVolume(volume: number) {
    this.update({
      current: {
        sound: {
          v: convertFromPercentage(volume),
        },
      }
    })
  }

  setAudioPlaying(playing: boolean) {
    if (!playing) {
      return this.setAudioTrack(AudioTrack.None)
    }
  }

  setAudioTrack(track: number) {
    this.update({
      current: {
        sound: {
          id: track
        }
      }
    })
  }

  // Helpers

  private setContent(
    playing: Restore2State['current']['playing'],
    step: number,
    soundId: SoundId
  ) {
    this.update({
      current: {
        playing,
        paused: false,
        step,
        sound: {
          id: soundId
        }
      },
    })
  }

  async turnOnRoutine() {
    const routines = await this.fetchRoutines()
    this.setContent('remote', 1, routines[0].id)

  }

  turnOff() {
    this.setContent('none', 0, SoundId.None)
  }

  async fetchRoutines() {
    const routinesPath = apiPath(
      `service/app/routine/v2/fetch?macAddress=${encodeURIComponent(
        this.info.macAddress,
      )}`,
    ),
      allRoutines = await this.restClient.request<RestIotRoutine[]>({
        url: routinesPath,
        method: 'GET',
      }),
      sortedRoutines = allRoutines.sort(
        (a, b) => a.displayOrder - b.displayOrder,
      ),
      touchRingRoutines = sortedRoutines.filter((routine) => {
        return (
          routine.type === 'favorite' || // Before upgrade, only favorites were on touch ring
          routine.button0 // After upgrade, many routine types can be on touch ring but will have `button0: true`
        )
      })

    return touchRingRoutines
  }
}
