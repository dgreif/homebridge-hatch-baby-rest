import { RestPlusState, IotDeviceInfo } from '../shared/hatch-sleep-types.ts'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { BehaviorSubject, firstValueFrom, skip, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'
import { delay, logDebug, logError } from '../shared/util.ts'
import { DeepPartial } from 'ts-essentials'

function assignState<T = RestPlusState>(previousState: any, changes: any): T {
  const state = Object.assign({}, previousState)

  for (const key in changes) {
    if (typeof changes[key] === 'object') {
      state[key] = assignState(previousState[key] || {}, changes[key])
    } else {
      state[key] = changes[key]
    }
  }

  return state
}

export const MAX_IOT_VALUE = 65535

export function convertFromPercentage(percentage: number) {
  return Math.ceil((percentage / 100) * MAX_IOT_VALUE)
}

export function convertToPercentage(value: number) {
  return Math.floor((value * 100) / MAX_IOT_VALUE)
}

export class IotDevice<T> {
  private onCurrentState = new BehaviorSubject<T | null>(null)
  private get mqttClient() {
    return this.onIotClient.getValue()
  }
  private onStatusToken = new Subject<string>()
  private previousUpdatePromise: Promise<any> = Promise.resolve()
  // always the registration outcome of the newest client - assigned in the
  // constructor via registerMqttClient before anything can read it
  private latestRegistrationOutcome: Promise<boolean> = Promise.resolve(false)

  onState = this.onCurrentState.pipe(
    filter((state): state is T => state !== null),
  )

  get id() {
    return this.info.id
  }

  get name() {
    return this.info.name
  }

  get macAddress() {
    return this.info.macAddress
  }

  public readonly info
  public readonly onIotClient

  constructor(info: IotDeviceInfo, onIotClient: BehaviorSubject<AwsIotDevice>) {
    this.info = info
    this.onIotClient = onIotClient
    onIotClient
      .pipe(skip(1))
      .subscribe((client) => this.registerMqttClient(client))

    this.registerMqttClient(onIotClient.getValue())
  }

  private registerMqttClient(mqttClient: AwsIotDevice) {
    const { thingName } = this.info
    let getClientToken: string

    mqttClient.on('close', () => {
      logDebug('MQTT client closed')
    })

    mqttClient.on('offline', () => {
      logDebug('MQTT client offline')
    })

    mqttClient.on(
      'status',
      (
        topic,
        message,
        clientToken,
        status: { state: { desired: T; reported: T } },
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
      },
    )

    mqttClient.on('foreignStateChange', (topic, message, s) => {
      const currentState = this.onCurrentState.getValue()

      if (!currentState || topic !== thingName) {
        return
      }

      this.onCurrentState.next(
        assignState(
          assignState(currentState, s.state.reported),
          s.state.desired,
        ),
      )
    })

    const connectAndRegisterPromise = new Promise((resolve) => {
        mqttClient.on('connect', () => {
          mqttClient.register(thingName, {}, () => {
            getClientToken = mqttClient.get(thingName)!
            resolve(
              firstValueFrom(
                this.onStatusToken.pipe(
                  filter((token) => token === getClientToken),
                ),
              ),
            )
          })
        })
      }),
      // A client that never connects (e.g., created moments before a network
      // outage, then replaced with fresh credentials once the outage ends)
      // would otherwise leave connectAndRegisterPromise pending forever.
      // Because every command is chained through previousUpdatePromise, a
      // single such client permanently wedges the command queue while state
      // updates continue to flow. Once a newer client exists, stop waiting.
      supersededPromise = firstValueFrom(
        this.onIotClient.pipe(filter((client) => client !== mqttClient)),
      ),
      // true once this client is fully registered, false if it was replaced
      // first. update() uses this to wait for a client that can actually
      // accept commands - the sdk's update() returns null (dropping the
      // command) if called before registration completes
      registrationOutcome = Promise.race([
        connectAndRegisterPromise.then(() => true),
        supersededPromise.then(() => false),
      ])

    this.latestRegistrationOutcome = registrationOutcome

    this.previousUpdatePromise = this.previousUpdatePromise
      .catch((_) => {
        // ignore errors, they shouldn't be possible
        void _
      })
      .then(() => registrationOutcome)
  }

  getCurrentState() {
    return firstValueFrom(this.onState)
  }

  update(update: DeepPartial<T>) {
    this.previousUpdatePromise = this.previousUpdatePromise
      .catch((_) => {
        // ignore errors, they shouldn't be possible
        void _
      })
      .then(async () => {
        while (!(await this.latestRegistrationOutcome)) {
          // a false outcome means that client was replaced before it finished
          // registering. The replacement installed its own outcome before the
          // false resolved (the constructor's skip(1) subscription runs ahead
          // of supersededPromise's subscriber), so loop to await the
          // replacement's registration rather than dropping the command
        }

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
            } because another update was in progress: ${JSON.stringify(update)}`,
          )
        }

        const requestComplete = firstValueFrom(
          this.onStatusToken.pipe(filter((token) => token === updateToken)),
        )

        // wait a max of 30 seconds to finish request
        return Promise.race([requestComplete, delay(30000)])
      })
  }
}
