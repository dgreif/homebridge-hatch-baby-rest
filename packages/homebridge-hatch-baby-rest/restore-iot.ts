import {
  IotDeviceInfo,
  RestoreIotState,
  RestIotFavorite,
} from '../shared/hatch-sleep-types'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { BaseDevice } from '../shared/base-accessory'
import { IotDevice } from './iot-device'
import { BehaviorSubject } from 'rxjs'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { apiPath, RestClient } from './rest-client'

export class RestoreIot extends IotDevice<RestoreIotState> implements BaseDevice {
  readonly model = 'RestoreIot'

  constructor(
    public readonly info: IotDeviceInfo,
    public readonly onIotClient: BehaviorSubject<AwsIotDevice>,
    public readonly restClient: RestClient
  ) {
    super(info, onIotClient)
  }

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged()
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  private setCurrent(
    playing: RestoreIotState['current']['playing'],
    step: number,
    srId: number
  ) {
    this.update({
      current: {
        playing,
        step,
        srId,
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
    const routinePath = apiPath(
        `service/app/routine/v2/fetch?macAddress=${encodeURIComponent(
          this.info.macAddress
        )}&types=routine`
      ),
      routines = await this.restClient.request<RestIotFavorite[]>({
        url: routinePath,
        method: 'GET',
      })
    return routines.sort((a, b) => a.displayOrder - b.displayOrder)
  }
}
