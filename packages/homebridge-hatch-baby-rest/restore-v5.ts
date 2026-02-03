import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { HsbColor, hsbToRgb, rgbToHsb } from '../shared/colors.ts'
import {
  IotDeviceInfo,
  RestIotRoutine,
  RestoreV5State,
} from '../shared/hatch-sleep-types.ts'
import {
  convertFromPercentage,
  convertToPercentage,
  IotDevice,
  MAX_IOT_VALUE,
} from './iot-device.ts'
import { apiPath, RestClient } from './rest-client.ts'

/**
 * RestoreV5 - Hatch Restore 2 (newer revision) device class
 * 
 * Exposes three independent controls:
 * - Routine: plays/stops the first saved routine
 * - Nightlight: independent light (on/off + brightness)
 * - Volume: sound volume control
 */
export class RestoreV5 extends IotDevice<RestoreV5State> {
  readonly model = 'Rest+ 2nd Gen'

  constructor(
    public readonly info: IotDeviceInfo,
    public readonly onIotClient: BehaviorSubject<AwsIotDevice>,
    public readonly restClient: RestClient,
  ) {
    super(info, onIotClient)
  }

  // === Routine Controls ===

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

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
        srId: 0,
      },
    })
  }

  // === Nightlight Controls (independent of routines) ===

  onNightlightOn = this.onState.pipe(
    map((state) => state.nightlightOn),
    distinctUntilChanged(),
  )

  onNightlightBrightness = this.onState.pipe(
    map((state) => convertToPercentage(state.nightlightIntensity || 0)),
    distinctUntilChanged(),
  )

  setNightlightOn(on: boolean) {
    this.update({ nightlightOn: on })
  }

  setNightlightBrightness(percentage: number) {
    this.update({ nightlightIntensity: convertFromPercentage(percentage) })
  }

  // Nightlight color (HSB)
  onNightlightHsb = this.onState.pipe(
    map((state) => {
      const color = state.nightlightColor
      // Handle white-only light
      if (color.w > 0 && color.r === 0 && color.g === 0 && color.b === 0) {
        return { h: 0, s: 0, b: convertToPercentage(state.nightlightIntensity || 0) }
      }
      return rgbToHsb(color, MAX_IOT_VALUE)
    }),
  )

  onNightlightHue = this.onNightlightHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged(),
  )

  onNightlightSaturation = this.onNightlightHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged(),
  )

  setNightlightColor({ h, s, b }: HsbColor) {
    const rgb = hsbToRgb({ h, s, b: 100 }, MAX_IOT_VALUE)

    this.update({
      nightlightColor: {
        ...rgb,
        w: 0,
        id: 0,
      },
      nightlightIntensity: convertFromPercentage(b),
    })
  }

  // === Volume Controls ===

  onVolume = this.onState.pipe(
    map((state) =>
      state.current?.sound?.v
        ? convertToPercentage(state.current.sound.v)
        : 50,
    ),
    distinctUntilChanged(),
  )

  onVolumeOn = this.onState.pipe(
    map((state) => (state.current?.sound?.v || 0) > 0),
    distinctUntilChanged(),
  )

  setVolume(percentage: number) {
    this.update({
      current: {
        sound: {
          v: convertFromPercentage(percentage),
        },
      },
    })
  }

  // === Firmware ===

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo?.f))

  // === Routines API ===

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
