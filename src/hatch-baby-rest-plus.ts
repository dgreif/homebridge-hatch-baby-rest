import { AudioTrack, LightState, RestPlusInfo } from './hatch-baby-types'
import { RestClient } from './rest-client'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, filter, map, take } from 'rxjs/operators'
import { logError } from './util'
import { DeepPartial } from 'ts-essentials'
import { Color } from './rest-commands'

const MAX_VALUE = 65535

function convertFromPercentage(percentage: number) {
  return Math.floor((percentage / 100) * MAX_VALUE)
}

function convertToPercentage(value: number) {
  return Math.floor((value * 100) / MAX_VALUE)
}

export class HatchBabyRestPlus {
  private onCurrentState = new BehaviorSubject<LightState | null>(null)
  onState = this.onCurrentState.pipe(
    filter((state): state is LightState => state !== null)
  )

  onVolume = this.onState.pipe(
    map(state => convertToPercentage(state.a.v)),
    distinctUntilChanged()
  )

  onAudioTrack = this.onState.pipe(
    map(state => state.a.t),
    distinctUntilChanged()
  )

  onIsPowered = this.onState.pipe(
    map(state => state.isPowered),
    distinctUntilChanged()
  )

  onBrightness = this.onState.pipe(
    map(state => convertToPercentage(state.c.i)),
    distinctUntilChanged()
  )

  onBatteryLevel = this.onState.pipe(
    map(state => state.deviceInfo.b),
    distinctUntilChanged()
  )

  get id() {
    return this.info.id
  }
  get name() {
    return this.info.name
  }

  constructor(
    public info: RestPlusInfo,
    private restClient: RestClient,
    private mqttClient: AwsIotDevice
  ) {
    const { thingName } = info
    let getClientToken: string

    mqttClient.on(
      'status',
      (
        topic,
        message,
        clientToken,
        status: { state: { desired: LightState; reported: LightState } }
      ) => {
        if (clientToken !== getClientToken) {
          return
        }

        const { state } = status

        this.onCurrentState.next(
          Object.assign({}, state.reported, state.desired)
        )
      }
    )

    mqttClient.on('foreignStateChange', (topic, message, s) => {
      const currentState = this.onCurrentState.getValue()
      if (!currentState) {
        return
      }

      this.onCurrentState.next(
        Object.assign(currentState, s.state.reported, s.state.desired)
      )
    })

    mqttClient.on('timeout', (topic, message) => {
      logError('AWS Iot Timeout')
      logError(message)
    })
    mqttClient.on('error', e => {
      logError('AWS Iot Error')
      logError(e)
    })
    mqttClient.on('connect', () => {
      mqttClient.register(thingName, {}, () => {
        getClientToken = mqttClient.get(thingName)!
      })
    })
  }

  getCurrentState() {
    return this.onState.pipe(take(1)).toPromise()
  }

  update(update: DeepPartial<LightState>) {
    this.mqttClient.update(this.info.thingName, {
      state: {
        desired: update
      }
    })
  }

  setVolume(percentage: number) {
    this.update({
      a: {
        v: convertFromPercentage(percentage)
      }
    })
  }

  setAudioTrack(audioTrack: AudioTrack) {
    this.update({
      a: {
        t: audioTrack
      }
    })
  }

  setColor(color: Partial<Color>) {
    this.update({
      c: color
    })
  }

  setBrightness(percentage: number) {
    this.update({
      c: {
        i: convertFromPercentage(percentage)
      }
    })
  }

  setPower(on: boolean) {
    this.update({
      isPowered: on
    })
  }
}
