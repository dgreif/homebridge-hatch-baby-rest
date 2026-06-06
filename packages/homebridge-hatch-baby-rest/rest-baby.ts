import { distinctUntilChanged, map } from 'rxjs/operators'
import { RestIot } from './rest-iot.ts'
import { HsbColor, hsbToRgb, rgbToHsb } from '../shared/colors.ts'
import {
  convertFromPercentage,
  convertToPercentage,
  MAX_IOT_VALUE,
} from './iot-device.ts'

export class RestBaby extends RestIot {
  onBrightness = this.onState.pipe(
    map(({ current }) => {
      if (
        current.color.r === 0 &&
        current.color.g === 0 &&
        current.color.b === 0 &&
        current.color.w === 0
      ) {
        return 0
      }
      return convertToPercentage(current.color.i)
    }),
    distinctUntilChanged(),
  )

  onHsb = this.onState.pipe(
    map(({ current }) => rgbToHsb(current.color, MAX_IOT_VALUE)),
  )

  onHue = this.onHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged(),
  )

  onSaturation = this.onHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged(),
  )

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.current.sound.v)),
    distinctUntilChanged(),
  )

  setHsb({ h, s, b }: HsbColor) {
    const rgb = hsbToRgb({ h, s, b: 100 }, MAX_IOT_VALUE)

    this.update({
      current: {
        playing: 'remote',
        color: {
          ...rgb,
          w: 0,
          i: convertFromPercentage(b),
        },
      },
    })
  }

  setVolume(percentage: number) {
    this.update({
      current: {
        sound: {
          v: convertFromPercentage(percentage),
        },
      },
    })
  }
}
