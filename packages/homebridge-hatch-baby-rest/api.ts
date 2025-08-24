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
import { debounceTime } from 'rxjs/operators'

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
  ],
  ignoredProducts: Product[] = [
    // Known, but not supported
    Product.rest,
    Product.alexa,
    Product.grow,
    Product.answeredReader,
  ],
  iotClientRefreshPeriod = 8 * 60 * 60 * 1000 // refresh client every 8 hours

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
    let onIotClient: BehaviorSubject<AwsIotDevice> | undefined

    const createNewIotClient = async (): Promise<AwsIotDevice> => {
      try {
        const previousMqttClient = onIotClient?.getValue()
        if (previousMqttClient) {
          try {
            previousMqttClient.end()
          } catch (e: unknown) {
            logError('Failed to end previous MQTT Client')
            logError(e)
          }
        }

        logDebug('Creating new MQTT Client')

        const mqttClient = await this.createAwsIotClient()

        mqttClient.on('error', async (error) => {
          if (error.message.includes('(403)')) {
            logError('MQTT Client No Longer Authorized')
          } else {
            logError('MQTT Error:')
            logError(error)
          }

          try {
            onIotClient?.next(await createNewIotClient())
          } catch (_) {
            // ignore, already logged
          }
        })

        logDebug('Created new MQTT Client')
        return mqttClient
      } catch (e) {
        logError('Failed to Create an MQTT Client')
        logError(e)
        throw e
      }
    }

    onIotClient = new BehaviorSubject<AwsIotDevice>(await createNewIotClient())

    onIotClient.pipe(debounceTime(iotClientRefreshPeriod)).subscribe(() => {
      createNewIotClient()
        .then((client) => onIotClient?.next(client))
        .catch(logError)
    })

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
    }
  }
}
