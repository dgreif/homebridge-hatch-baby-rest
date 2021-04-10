import { apiPath, EmailAuth, requestWithRetry, RestClient } from './rest-client'
import {
  IotCredentialsResponse,
  IotTokenResponse,
  MemberResponse,
  IotDeviceInfo,
} from './hatch-sleep-types'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { logDebug, logError, logInfo } from './util'
import { RestPlus } from './rest-plus'
import { RestMini } from './rest-mini'
import { Restore } from './restore'

export interface ApiConfig extends EmailAuth {}

const productMap = {
    restPlus: RestPlus,
    restMini: RestMini,
    restore: Restore,
  },
  knownProducts = Object.keys(productMap),
  productFetchQueryString = knownProducts
    .map((product) => 'iotProducts=' + product)
    .join('&')

export class HatchBabyApi {
  restClient = new RestClient(this.config)
  constructor(private config: ApiConfig) {}

  getAccount() {
    return this.restClient.getAccount()
  }

  getMember() {
    return this.restClient.request<MemberResponse>({
      url: apiPath('service/app/v2/member'),
    })
  }

  async getIotDevices() {
    const devices =
      (await this.restClient.request<IotDeviceInfo[] | null>({
        url: apiPath(
          'service/app/iotDevice/v2/fetch?' + productFetchQueryString
        ),
      })) || []

    devices.forEach((device) => {
      if (!knownProducts.includes(device.product)) {
        logInfo('Unsupported Light Found: ' + JSON.stringify(device))
      }
    })

    return devices
  }

  async createAwsIotClient() {
    const iotResponse = await this.restClient.request<IotTokenResponse>({
        url: apiPath('service/app/restPlus/token/v1/fetch'),
      }),
      {
        Credentials: credentials,
      } = await requestWithRetry<IotCredentialsResponse>({
        url: `https://cognito-identity.${iotResponse.region}.amazonaws.com`,
        method: 'POST',
        headers: {
          'content-type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityService.GetCredentialsForIdentity',
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

  async getDevices() {
    const devices = await this.getIotDevices(),
      restPluses = devices
        .filter((device) => device.product === 'restPlus')
        .map((info) => new RestPlus(info)),
      restMinis = devices
        .filter((device) => device.product === 'restMini')
        .map((info) => new RestMini(info)),
      restores = devices
        .filter((device) => device.product === 'restore')
        .map((info) => new Restore(info))

    let bindingNewIotClient = false,
      previousMqttClient: AwsIotDevice | null = null
    const createNewIotClient = async () => {
      try {
        if (bindingNewIotClient) {
          return
        }
        bindingNewIotClient = true

        if (previousMqttClient) {
          previousMqttClient.end()
          previousMqttClient = null
        }

        logDebug('Creating new MQTT Client')

        const mqttClient = await this.createAwsIotClient()
        previousMqttClient = mqttClient

        mqttClient.on('error', (error) => {
          if (error.message.includes('(403)')) {
            logError('MQTT Client No Longer Authorized')
          } else {
            logError('MQTT Error:')
            logError(error)
          }

          createNewIotClient()
        })

        restPluses.forEach((restPlus) =>
          restPlus.registerMqttClient(mqttClient)
        )
        restMinis.forEach((restMini) => restMini.registerMqttClient(mqttClient))
        restores.forEach((restore) => restore.registerMqttClient(mqttClient))

        logDebug('Created new MQTT Client')
      } catch (e) {
        logError('Failed to Create an MQTT Client')
        logError(e)
      } finally {
        bindingNewIotClient = false
      }
    }

    createNewIotClient().catch()

    return {
      restPluses,
      restMinis,
      restores,
    }
  }
}
