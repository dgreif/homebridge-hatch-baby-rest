import { RestIotState } from './hatch-sleep-types'
import { distinctUntilChanged, map } from 'rxjs/operators'
import { BaseDevice } from './accessories/base-accessory'
import { IotDevice } from './iot-device'

export class RestIot extends IotDevice<RestIotState> implements BaseDevice {
  readonly model = 'Rest 2nd Gen'

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged()
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  private setCurrent(
    playing: RestIotState['current']['playing'],
    step: number
  ) {
    this.update({
      current: {
        playing,
        step,
      },
    })
  }

  turnOnRoutine(step = 1) {
    this.setCurrent('routine', step)
  }

  turnOff() {
    this.setCurrent('none', 0)
  }
}
