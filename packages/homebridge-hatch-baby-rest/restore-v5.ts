import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { HsbColor, hsbToRgb, rgbToHsb } from '../shared/colors.ts'
import {
  IotDeviceInfo,
  RestIotRoutine,
  RestoreV5State,
} from '../shared/hatch-sleep-types.ts'
import { LightAndSoundMachine } from '../shared/light-and-sound-machine.ts'
import {
  convertFromPercentage,
  convertToPercentage,
  IotDevice,
  MAX_IOT_VALUE,
} from './iot-device.ts'
import { apiPath, RestClient } from './rest-client.ts'

export class RestoreV5
  extends IotDevice<RestoreV5State>
  implements LightAndSoundMachine
{
  readonly model = 'Rest+ 2nd Gen'

  constructor(
    public readonly info: IotDeviceInfo,
    public readonly onIotClient: BehaviorSubject<AwsIotDevice>,
    public readonly restClient: RestClient,
  ) {
    super(info, onIotClient)
  }

  // Audio tracks available on RestoreV5
  audioTracks = [0] // Simplified - routines handle sounds

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.current.sound.v)),
    distinctUntilChanged(),
  )

  onAudioTrack = this.onState.pipe(
    map((state) => state.current.sound.id),
    distinctUntilChanged(),
  )

  onAudioPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none' && !state.current.paused),
    distinctUntilChanged(),
  )

  onBrightness = this.onState.pipe(
    map(({ current }) => {
      const { color } = current
      // If all RGB values are 0 and no white, light is off
      if (color.r === 0 && color.g === 0 && color.b === 0 && color.w === 0) {
        return 0
      }
      return convertToPercentage(color.i)
    }),
    distinctUntilChanged(),
  )

  onHsb = this.onState.pipe(
    map((state) => {
      const { color } = state.current
      // Handle white light
      if (color.w > 0) {
        return { h: 0, s: 0, b: convertToPercentage(color.i) }
      }
      return rgbToHsb(color, MAX_IOT_VALUE)
    }),
  )

  onHue = this.onHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged(),
  )

  onSaturation = this.onHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged(),
  )

  onBatteryLevel = undefined // RestoreV5 is always plugged in

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  // Setters

  setVolume(volume: number) {
    this.update({
      current: {
        sound: {
          v: convertFromPercentage(volume),
        },
      },
    })
  }

  setHsb({ h, s, b }: HsbColor) {
    const rgb = hsbToRgb({ h, s, b: 100 }, MAX_IOT_VALUE)

    this.update({
      current: {
        color: {
          ...rgb,
          w: 0,
          i: convertFromPercentage(b),
        },
      },
    })
  }

  setAudioPlaying(playing: boolean) {
    if (playing) {
      this.turnOnRoutine()
    } else {
      this.turnOff()
    }
  }

  setAudioTrack(_track: number) {
    // RestoreV5 uses routines for sounds, not individual tracks
    // This is a no-op but required by the interface
  }

  // Turn on the first available routine (Bedtime)
  async turnOnRoutine() {
    try {
      const routines = await this.fetchRoutines()
      if (routines.length > 0) {
        const routine = routines[0]
        this.update({
          current: {
            playing: 'routine',
            paused: false,
            step: 1,
            srId: routine.id,
          },
        })
      }
    } catch (e) {
      // Fallback to simple remote play
      this.update({
        current: {
          playing: 'remote',
          paused: false,
          step: 1,
        },
      })
    }
  }

  turnOff() {
    this.update({
      current: {
        playing: 'none',
        paused: false,
        step: 0,
      },
    })
  }

  async fetchRoutines(): Promise<RestIotRoutine[]> {
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
      // Get routines available on touch ring (favorites or button0)
      touchRingRoutines = sortedRoutines.filter((routine) => {
        return routine.type === 'favorite' || routine.button0
      })

    return touchRingRoutines.length > 0 ? touchRingRoutines : sortedRoutines
  }
}
