import {
  IotDeviceInfo,
  RestIotFavorite,
  RestIotState,
} from './hatch-sleep-types'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { BaseDevice } from './accessories/base-accessory'
import { IotDevice } from './iot-device'
import { BehaviorSubject } from 'rxjs'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { apiPath, RestClient } from './rest-client'

export class RestIot extends IotDevice<RestIotState> implements BaseDevice {
  readonly model = 'Rest 2nd Gen'

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
    playing: RestIotState['current']['playing'],
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
    const favorites = await this.fetchFavorites()
    this.setCurrent('routine', 1, favorites[0].id)
  }

  turnOff() {
    this.setCurrent('none', 0, 0)
  }

  async fetchFavorites() {
    const favoritesPath = apiPath(
        `service/app/routine/v2/fetch?macAddress=${encodeURIComponent(
          this.info.macAddress
        )}&types=favorite`
      ),
      favorites = await this.restClient.request<RestIotFavorite[]>({
        url: favoritesPath,
        method: 'GET',
      })

    return favorites.sort((a, b) => a.displayOrder - b.displayOrder)
  }
}
