import {
  apiPath,
  EmailAuth,
  requestWithRetry,
  RestClient,
} from './rest-client.ts'
import {
  IotCredentialsResponse,
  IotDeviceInfo,
  IotTokenResponse,
  MemberResponse,
  Product,
} from '../shared/hatch-sleep-types.ts'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { logDebug, logError, logInfo } from '../shared/util.ts'
import { RestPlus } from './rest-plus.ts'
import { RestIot } from './rest-iot.ts'
import { RestMini } from './rest-mini.ts'
import { Restore } from './restore.ts'
import { BehaviorSubject } from 'rxjs'
import { IotDevice } from './iot-device.ts'

export interface ApiConfig extends EmailAuth {
  debug?: boolean
}

const knownProducts: Product[] = [
    Product.restPlus,
    Product.riot,
    Product.riotPlus,
    Product.restMini,
    Product.restore,
    Product.restoreIot,
    Product.restoreV4,
    Product.restoreV5,
    Product.restBaby,
  ],
  ignoredProducts: Product[] = [
    // Known, but not supported
    Product.rest,
    Product.alexa,
    Product.grow,
    Product.answeredReader,
  ],
  iotClientRefreshPeriod = 50 * 60 * 1000, // refresh client every 50 minutes (AWS Cognito credentials expire after ~1 hour)
  iotClientInitialRetryDelay = 30 * 1000,
  iotClientMaxRetryDelay = 5 * 60 * 1000,
  // How long a client may sit disconnected (close/offline without a
  // subsequent connect) before we stop trusting the SDK's built-in
  // reconnect - its retries reuse the original signed websocket URL,
  // whose Cognito credentials expire, so extended outages need a fresh
  // client with fresh credentials
  iotClientDeadConnectionTimeout = 10 * 60 * 1000

export class HatchBabyApi {
  public readonly config
  restClient

  constructor(config: ApiConfig) {
    this.config = config
    this.restClient = new RestClient(this.config)
  }

  getAccount() {
    return this.restClient.getAccount()
  }

  getMember() {
    return this.restClient.request<MemberResponse>({
      url: apiPath('service/app/v2/member'),
    })
  }

  async getIotDevices(...products: Product[]) {
    // Combine the user's products with the known products to ensure we get all devices
    const productFetchQueryString = products
        .map((product) => 'iotProducts=' + product)
        .join('&'),
      devices =
        (await this.restClient.request<IotDeviceInfo[] | null>({
          url: apiPath(
            'service/app/iotDevice/v2/fetch?' + productFetchQueryString,
          ),
        })) || []

    return devices
  }

  async createAwsIotClient() {
    const iotResponse = await this.restClient.request<IotTokenResponse>({
        url: apiPath('service/app/restPlus/token/v1/fetch'),
      }),
      { Credentials: credentials } =
        await requestWithRetry<IotCredentialsResponse>({
          url: `https://cognito-identity.${iotResponse.region}.amazonaws.com`,
          method: 'POST',
          headers: {
            'content-type': 'application/x-amz-json-1.1',
            'X-Amz-Target':
              'AWSCognitoIdentityService.GetCredentialsForIdentity',
          },
          json: {
            IdentityId: iotResponse.identityId,
            Logins: {
              'cognito-identity.amazonaws.com': iotResponse.token,
            },
          },
        }),
      mqttClient = new AwsIotDevice({
        protocol: 'wss',
        host: iotResponse.endpoint.replace('https://', ''),
        accessKeyId: credentials.AccessKeyId,
        secretKey: credentials.SecretKey,
        sessionToken: credentials.SessionToken,
      })

    return mqttClient
  }

  async getOnIotClient() {
    // eslint-disable-next-line prefer-const
    let onIotClient: BehaviorSubject<AwsIotDevice> | undefined,
      recreateInProgress = false,
      retryDelay = iotClientInitialRetryDelay,
      retryTimer: ReturnType<typeof setTimeout> | undefined,
      deadConnectionTimer: ReturnType<typeof setTimeout> | undefined

    const clearDeadConnectionTimer = () => {
        if (deadConnectionTimer) {
          clearTimeout(deadConnectionTimer)
          deadConnectionTimer = undefined
        }
      },
      attachLifecycleHandlers = (mqttClient: AwsIotDevice) => {
        // Events from an ended, replaced client must not drive recovery for
        // the current one. Before the subject exists this client is the one
        // being created, so treat it as current.
        const isCurrent = () =>
          !onIotClient || onIotClient.getValue() === mqttClient

        mqttClient.on('connect', () => {
          if (!isCurrent()) {
            return
          }
          clearDeadConnectionTimer()
          retryDelay = iotClientInitialRetryDelay
        })

        const armDeadConnectionTimer = (event: string) => {
          if (!isCurrent() || deadConnectionTimer) {
            return
          }
          deadConnectionTimer = setTimeout(() => {
            deadConnectionTimer = undefined
            logError(
              `MQTT connection still down ${Math.round(iotClientDeadConnectionTimeout / 60000)} minutes after '${event}', recreating client with fresh credentials`,
            )
            // eslint-disable-next-line no-use-before-define
            recreateIotClient()
          }, iotClientDeadConnectionTimeout)
        }

        mqttClient.on('close', () => armDeadConnectionTimer('close'))
        mqttClient.on('offline', () => armDeadConnectionTimer('offline'))

        mqttClient.on('error', (error) => {
          if (error.message.includes('(403)')) {
            logError('MQTT Client No Longer Authorized')
          } else {
            logError('MQTT Error:')
            logError(error)
          }

          if (isCurrent()) {
            // eslint-disable-next-line no-use-before-define
            recreateIotClient()
          }
        })
      },
      createNewIotClient = async (): Promise<AwsIotDevice> => {
        try {
          logDebug('Creating new MQTT Client')

          // Create the replacement BEFORE ending the previous client: if
          // creation fails mid-outage, the old client keeps the SDK's own
          // reconnect loop alive instead of leaving no client at all. The
          // old shape (end first, then create) is how the Feb 2026 outage
          // went silent for 5 days - creation failed after the only client
          // had already been ended, and nothing ever retried.
          const mqttClient = await this.createAwsIotClient()
          attachLifecycleHandlers(mqttClient)

          const previousMqttClient = onIotClient?.getValue()
          if (previousMqttClient) {
            try {
              previousMqttClient.end()
            } catch (e: unknown) {
              logError('Failed to end previous MQTT Client')
              logError(e)
            }
          }

          logDebug('Created new MQTT Client')
          return mqttClient
        } catch (e) {
          logError('Failed to Create an MQTT Client')
          logError(e)
          throw e
        }
      },
      recreateIotClient = async () => {
        if (recreateInProgress) {
          return
        }
        recreateInProgress = true
        if (retryTimer) {
          clearTimeout(retryTimer)
          retryTimer = undefined
        }
        clearDeadConnectionTimer()

        try {
          const client = await createNewIotClient()
          retryDelay = iotClientInitialRetryDelay
          onIotClient?.next(client)
        } catch (_) {
          // already logged; retry with backoff, forever - an extended outage
          // must not permanently kill the client
          logError(
            `Retrying MQTT client creation in ${Math.round(retryDelay / 1000)}s`,
          )
          retryTimer = setTimeout(() => {
            retryTimer = undefined
            recreateIotClient()
          }, retryDelay)
          retryDelay = Math.min(retryDelay * 2, iotClientMaxRetryDelay)
        } finally {
          recreateInProgress = false
        }
      }

    onIotClient = new BehaviorSubject<AwsIotDevice>(await createNewIotClient())

    // Proactive credential rotation. A plain interval (not debounceTime on
    // the subject) so one failed refresh cannot permanently end the cycle,
    // and recreateIotClient retries failures with backoff on its own.
    setInterval(() => {
      recreateIotClient()
    }, iotClientRefreshPeriod)

    return onIotClient
  }

  async getDevices() {
    const [devices, member, onIotClient] = await Promise.all([
        this.getIotDevices(...knownProducts),
        this.getMember(),
        this.getOnIotClient(),
      ]),
      createDevices = <T extends IotDevice<any>>(
        product: Product,
        Device: new (
          info: IotDeviceInfo,
          onClient: typeof onIotClient,
          restClient: RestClient,
        ) => T,
      ): T[] => {
        return devices
          .filter((device) => device.product === product)
          .map((info) => new Device(info, onIotClient, this.restClient))
      }

    for (const product of member.products) {
      if (
        !knownProducts.includes(product) &&
        !ignoredProducts.includes(product)
      ) {
        const debugMessage = this.config.debug
          ? ''
          : '. Set `"debug": true` in your config to see more device details.'
        logInfo('Unsupported Product Found: ' + product + debugMessage)

        if (this.config.debug) {
          this.getIotDevices(product)
            .then(async (unknownDevices) => {
              const debugDevices = unknownDevices.map(
                (device) => new IotDevice(device, onIotClient),
              )
              for (const device of debugDevices) {
                try {
                  logInfo(`Debug info for ${product} ${device.info.name}:`)
                  logInfo(
                    JSON.stringify(
                      {
                        ...device.info,
                        id: '***',
                        macAddress: '***',
                        thingName: '***',
                        memberId: '***',
                        email: '***',
                      },
                      null,
                      2,
                    ),
                  )
                  logInfo(`State for ${product} ${device.info.name}:`)
                  logInfo(
                    JSON.stringify(await device.getCurrentState(), null, 2),
                  )
                } catch (e) {
                  logError(
                    `Failed to get debug info for ${product} ${device.info.name}`,
                  )
                  logError(e)
                }
              }
            })
            .catch((error) => {
              logError('Failed to get debug info for ' + product)
              logError(error)
            })
        }
      }
    }

    return {
      restPluses: createDevices(Product.restPlus, RestPlus),
      restIots: createDevices(Product.riot, RestIot),
      restIotPluses: createDevices(Product.riotPlus, RestIot),
      restMinis: createDevices(Product.restMini, RestMini),
      restores: createDevices(Product.restore, Restore),
      restoreIots: createDevices(Product.restoreIot, RestIot),
      restoreV4s: createDevices(Product.restoreV4, RestIot),
      restoreV5s: createDevices(Product.restoreV5, RestIot),
      restBabies: createDevices(Product.restBaby, RestIot),
    }
  }
}
