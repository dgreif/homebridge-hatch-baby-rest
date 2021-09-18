import got, { Options as RequestOptions } from 'got'
import { delay, logError } from './util'
import { LoginResponse } from './hatch-sleep-types'

const apiBaseUrl = 'https://data.hatchbaby.com/',
  defaultRequestOptions: RequestOptions = {
    http2: true,
    responseType: 'json',
    method: 'GET',
  }

export function apiPath(path: string) {
  return apiBaseUrl + path
}

export async function requestWithRetry<T>(options: RequestOptions): Promise<T> {
  try {
    const response = (await got({ ...defaultRequestOptions, ...options })) as {
      body: T
    }
    return response.body
  } catch (e: any) {
    if (!e.response) {
      logError(
        `Failed to reach Hatch Baby server at ${options.url}.  ${e.message}.  Trying again in 5 seconds...`
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
        json: {
          email: this.authOptions.email,
          password: this.authOptions.password,
        },
        method: 'POST',
      })

      return resp
    } catch (requestError: any) {
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

  async request<T = void>(
    options: RequestOptions & { url: string }
  ): Promise<T> {
    try {
      const loginResponse = await this.loginPromise,
        headers: { [key: string]: string } = {
          ...options.headers,
          'X-HatchBaby-Auth': loginResponse.token,
        },
        response = await requestWithRetry<{ payload: T }>({
          ...options,
          headers,
        })

      return response.payload
    } catch (e: any) {
      const response = e.response || {},
        { url } = options

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
    return this.loginPromise.then((l) => l.payload)
  }
}
