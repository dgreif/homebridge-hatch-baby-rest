import {
  RestMiniAudioTrack,
  restMiniAudioTracks,
  RestMiniState,
} from '../shared/hatch-sleep-types'
import { distinctUntilChanged, map } from 'rxjs/operators'
import {
  convertFromPercentage,
  convertToPercentage,
  IotDevice,
} from './iot-device'
import { SoundMachine } from '../shared/sound-machine'

export class RestMini extends IotDevice<RestMiniState> implements SoundMachine {
  readonly model = 'Rest Mini'
  audioTracks = restMiniAudioTracks

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.current.sound.v)),
    distinctUntilChanged(),
  )

  onAudioPlaying = this.onState.pipe(
    map((state) => state.current.playing !== 'none'),
    distinctUntilChanged(),
  )

  onAudioTrack = this.onState.pipe(
    map((state) => state.current.sound.id),
    distinctUntilChanged(),
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  setVolume(percentage: number) {
    this.update({
      current: {
        sound: {
          v: convertFromPercentage(percentage),
        },
      },
    })
  }

  setAudioPlaying(playing: boolean) {
    if (playing) {
      this.update({
        current: {
          playing: 'remote',
          step: 1,
        },
      })
    } else {
      this.update({
        current: {
          playing: 'none',
          step: 0,
        },
      })
    }
  }

  setAudioTrack(audioTrack: number) {
    if (audioTrack === RestMiniAudioTrack.None) {
      return
    }

    this.update({
      current: {
        playing: 'remote',
        step: 1,
        sound: {
          id: audioTrack as RestMiniAudioTrack,
          until: 'indefinite',
        },
      },
    })
  }
}
