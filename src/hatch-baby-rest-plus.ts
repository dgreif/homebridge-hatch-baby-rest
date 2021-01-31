import { AudioTrack, Color, LightState, RestPlusInfo } from './hatch-baby-types'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject, Subject } from 'rxjs'
import { distinctUntilChanged, filter, map, take } from 'rxjs/operators'
import { delay, logError } from './util'
import { DeepPartial } from 'ts-essentials'
import { LightAndSoundMachine } from './accessories/light-and-sound-machine'

const rgb2hsv = require('pure-color/convert/rgb2hsv'),
  hsv2rgb = require('pure-color/convert/hsv2rgb')

const MAX_VALUE = 65535

function convertFromPercentage(percentage: number) {
  return Math.floor((percentage / 100) * MAX_VALUE)
}

function convertToPercentage(value: number) {
  return Math.floor((value * 100) / MAX_VALUE)
}

function convertToHexRange(value: number) {
  return Math.floor((value / MAX_VALUE) * 255)
}

function convertFromHexRange(value: number) {
  return Math.floor((value * MAX_VALUE) / 255)
}

function colorToHsb({ r, g, b }: Color) {
  const [h, s, v] = rgb2hsv([r, g, b].map(convertToHexRange))
  return { h, s, b: v } as { h: number; s: number; b: number }
}

function assignState(previousState: any, changes: any): LightState {
  const state = Object.assign({}, previousState)

  for (const key in changes) {
    if (typeof changes[key] === 'object') {
      state[key] = Object.assign(previousState[key] || {}, changes[key])
    } else {
      state[key] = changes[key]
    }
  }

  return state
}

export class HatchBabyRestPlus implements LightAndSoundMachine {
  private onCurrentState = new BehaviorSubject<LightState | null>(null)
  private mqttClient?: AwsIotDevice
  private onStatusToken = new Subject<string>()
  private previousUpdatePromise: Promise<any> = Promise.resolve()

  onState = this.onCurrentState.pipe(
    filter((state): state is LightState => state !== null)
  )

  onVolume = this.onState.pipe(
    map((state) => convertToPercentage(state.a.v)),
    distinctUntilChanged()
  )

  onAudioTrack = this.onState.pipe(
    map((state) => state.a.t),
    distinctUntilChanged()
  )

  onIsPowered = this.onState.pipe(
    map((state) => state.isPowered),
    distinctUntilChanged()
  )

  onBrightness = this.onState.pipe(
    map((state) => convertToPercentage(state.c.i)),
    distinctUntilChanged()
  )

  onHsb = this.onState.pipe(map((state) => colorToHsb(state.c)))

  onHue = this.onHsb.pipe(
    map(({ h }) => h),
    distinctUntilChanged()
  )

  onSaturation = this.onHsb.pipe(
    map(({ s }) => s),
    distinctUntilChanged()
  )

  onBatteryLevel = this.onState.pipe(
    map((state) => state.deviceInfo.b),
    distinctUntilChanged()
  )

  onFirmwareVersion = this.onState.pipe(map((state) => state.deviceInfo.f))

  get id() {
    return this.info.id
  }

  get name() {
    return this.info.name
  }

  get macAddress() {
    return this.info.macAddress
  }

  constructor(public readonly info: RestPlusInfo) {}

  registerMqttClient(mqttClient: AwsIotDevice) {
    const { thingName } = this.info
    let getClientToken: string

    this.mqttClient = mqttClient

    mqttClient.on(
      'status',
      (
        topic,
        message,
        clientToken,
        status: { state: { desired: LightState; reported: LightState } }
      ) => {
        if (topic !== thingName) {
          // status for a different thing
          return
        }

        this.onStatusToken.next(clientToken)

        if (clientToken === getClientToken) {
          const { state } = status

          this.onCurrentState.next(assignState(state.reported, state.desired))
        }
      }
    )

    mqttClient.on('foreignStateChange', (topic, message, s) => {
      const currentState = this.onCurrentState.getValue()
      if (!currentState || topic !== thingName) {
        return
      }

      this.onCurrentState.next(
        assignState(
          assignState(currentState, s.state.reported),
          s.state.desired
        )
      )
    })

    mqttClient.on('connect', () => {
      mqttClient.register(thingName, {}, () => {
        getClientToken = mqttClient.get(thingName)!
        this.previousUpdatePromise = this.onStatusToken
          .pipe(
            filter((token) => token === getClientToken),
            take(1)
          )
          .toPromise()
      })
    })
  }

  getCurrentState() {
    return this.onState.pipe(take(1)).toPromise()
  }

  update(update: DeepPartial<LightState>) {
    this.previousUpdatePromise = this.previousUpdatePromise
      .catch((_) => {
        // ignore errors, they shouldn't be possible
        void _
      })
      .then(() => {
        if (!this.mqttClient) {
          logError(`Unable to Update ${this.name} - No MQTT Client Registered`)
          return
        }

        const updateToken = this.mqttClient.update(this.info.thingName, {
          state: {
            desired: update,
          },
        })

        if (!updateToken) {
          logError(
            `Failed to apply update to ${
              this.name
            } because another update was in progress: ${JSON.stringify(update)}`
          )
        }

        const requestComplete = this.onStatusToken
          .pipe(
            filter((token) => token === updateToken),
            take(1)
          )
          .toPromise()

        // wait a max of 30 seconds to finish request
        return Promise.race([requestComplete, delay(30000)])
      })
  }

  setVolume(percentage: number) {
    this.update({
      a: {
        v: convertFromPercentage(percentage),
      },
    })
  }

  setAudioTrack(audioTrack: AudioTrack) {
    this.update({
      a: {
        t: audioTrack,
      },
    })
  }

  setColor(color: Partial<Color>) {
    this.update({
      c: color,
    })
  }

  setColorFromHueAndSaturation(hue: number, saturation: number) {
    const [r, g, b] = hsv2rgb([hue, saturation, 100]).map(convertFromHexRange)
    this.setColor({ r, g, b, R: false, W: false })
  }

  setBrightness(percentage: number) {
    this.update({
      c: {
        i: convertFromPercentage(percentage),
      },
    })
  }

  setPower(on: boolean) {
    this.update({
      isPowered: on,
    })
  }
}
