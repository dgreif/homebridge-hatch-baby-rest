import axios, { AxiosRequestConfig, ResponseType } from 'axios'
import { delay, logError } from './util'
import { LoginResponse } from './hatch-baby-types'

const apiBaseUrl = 'https://data.hatchbaby.com/'

export function apiPath(path: string) {
  return apiBaseUrl + path
}

export async function requestWithRetry<T>(
  options: AxiosRequestConfig
): Promise<T> {
  try {
    const { data } = await axios(options)
    return data as T
  } catch (e) {
    if (!e.response) {
      logError(
        `Failed to reach Hatch Baby server at ${options.url}.  Trying again in 5 seconds...`
      )
      await delay(5000)
      return requestWithRetry(options)
    }

    throw e
  }
}

export interface EmailAuth {
  email: string
  password: string
}

export class RestClient {
  private loginPromise = this.logIn()

  constructor(private authOptions: EmailAuth) {}

  async logIn(): Promise<LoginResponse> {
    try {
      const resp = await requestWithRetry<LoginResponse>({
        url: apiPath('public/v1/login'),
        data: {
          email: this.authOptions.email,
          password: this.authOptions.password
        },
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        }
      })

      return resp
    } catch (requestError) {
      const errorMessage =
        'Failed to fetch oauth token from Hatch Baby. Verify that your email and password are correct.'
      logError(requestError.response || requestError)
      logError(errorMessage)
      throw new Error(errorMessage)
    }
  }

  private refreshAuth() {
    this.loginPromise = this.logIn()
  }

  async request<T = void>(options: {
    method?: 'GET' | 'POST' | 'PUT'
    url: string
    data?: any
    responseType?: ResponseType
  }): Promise<T> {
    const { method, url, data } = options

    try {
      const loginResponse = await this.loginPromise,
        headers: { [key: string]: string } = {
          'content-type': 'application/json',
          'X-HatchBaby-Auth': loginResponse.token
        },
        response = await requestWithRetry<{ payload: T }>({
          method: method || 'GET',
          url,
          data,
          headers
        })

      return response.payload
    } catch (e) {
      const response = e.response || {}

      if (response.status === 401) {
        this.refreshAuth()
        return this.request(options)
      }

      if (response.status === 404 && url.startsWith(apiBaseUrl)) {
        logError('404 from endpoint ' + url)

        throw new Error(
          'Not found with response: ' + JSON.stringify(response.data)
        )
      }

      logError(`Request to ${url} failed`)

      throw e
    }
  }

  getAccount() {
    return this.loginPromise.then(l => l.payload)
  }
}
