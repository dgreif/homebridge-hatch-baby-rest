import { apiPath, EmailAuth, requestWithRetry, RestClient } from './rest-client'
import {
  IotCredentialsResponse,
  IotTokenResponse,
  MemberResponse,
  RestPlusInfo,
} from './hatch-baby-types'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { logDebug, logError } from './util'
import { HatchBabyRestPlus } from './hatch-baby-rest-plus'

export interface ApiConfig extends EmailAuth {}

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

  async getRestPlusLightsInfo() {
    const hbrps = await this.restClient.request<RestPlusInfo[]>({
      url: apiPath('service/app/restPlus/v1/fetch'),
    })

    return hbrps
  }

  async createAwsIotClient() {
    const iotResponse = await this.restClient.request<IotTokenResponse>({
        url: apiPath('service/app/restPlus/token/v1/fetch'),
      }),
      { Credentials: credentials } = await requestWithRetry<
        IotCredentialsResponse
      >({
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

  async getRestPlusLights() {
    const lightsInfo = await this.getRestPlusLightsInfo(),
      lights = lightsInfo.map((info) => {
        return new HatchBabyRestPlus(info)
      })

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

        lights.forEach((light) => light.registerMqttClient(mqttClient))
        logDebug('Created new MQTT Client')
      } catch (e) {
        logError('Failed to Create an MQTT Client')
        logError(e)
      } finally {
        bindingNewIotClient = false
      }
    }

    createNewIotClient().catch()

    return lights
  }
}
