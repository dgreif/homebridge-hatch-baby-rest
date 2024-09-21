import { distinctUntilChanged, map } from 'rxjs/operators'
import { BaseDevice } from '../shared/base-accessory'
import { Restore2State } from '../shared/hatch-sleep-types'
import { IotDevice } from './iot-device'

export class Restore2 extends IotDevice<Restore2State> implements BaseDevice {
  readonly model = 'RestoreV4'

  onSomeContentPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  private setContent(
    playing: Restore2State['current']['playing'],
    step: number,
  ) {
    this.update({
      current: {
        playing,
        paused: false,
        step,
      },
    })
  }

  turnOnRoutine(step = 1) {
    this.setContent('routine', step)
  }

  turnOff() {
    this.setContent('none', 0)
  }
}
