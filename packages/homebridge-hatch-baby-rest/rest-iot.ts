import {
  IotDeviceInfo,
  Product,
  RestIotRoutine,
  RestIotState,
} from '../shared/hatch-sleep-types.ts'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { BaseDevice } from '../shared/base-accessory.ts'
import { IotDevice } from './iot-device.ts'
import { BehaviorSubject } from 'rxjs'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { apiPath, RestClient } from './rest-client.ts'

export class RestIot extends IotDevice<RestIotState> implements BaseDevice {
  public readonly info
  public readonly onIotClient
  public readonly restClient

  get model() {
    return this.info.product === Product.restoreIot
      ? 'Restore IoT'
      : Product.riotPlus
        ? 'Rest+ 2nd Gen'
        : 'Rest 2nd Gen'
  }

  constructor(
    info: IotDeviceInfo,
    onIotClient: BehaviorSubject<AwsIotDevice>,
    restClient: RestClient,
  ) {
    super(info, onIotClient)
    this.info = info
    this.onIotClient = onIotClient
    this.restClient = restClient
  }

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  private setCurrent(
    playing: RestIotState['current']['playing'],
    step: number,
    srId: number,
  ) {
    this.update({
      current: {
        playing,
        step,
        srId,
        paused: false, // Must explicitly unpause or device ignores the command
      },
    })
  }

  async turnOnRoutine() {
    const routines = await this.fetchRoutines()
    this.setCurrent('routine', 1, routines[0].id)
  }

  turnOff() {
    this.setCurrent('none', 0, 0)
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
