import { delay, logError } from '../shared/util.ts'
import {
  LoginFailureResponse,
  LoginResponse,
} from '../shared/hatch-sleep-types.ts'

const apiBaseUrl = 'https://prod-sleep.hatchbaby.com/',
  defaultRequestOptions: RequestInit = {
    method: 'GET',
  },
  defaultHeaders: HeadersInit = {
    USER_AGENT: 'hatch_rest_api',
    'content-type': 'application/json',
  }

export function apiPath(path: string) {
  return apiBaseUrl + path
}

export async function requestWithRetry<T>(
  options: RequestInit & { url: string; json?: object },
): Promise<T> {
  try {
    const optionsWithDefaults: RequestInit = {
      ...defaultRequestOptions,
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    if (options.json) {
      optionsWithDefaults.body = JSON.stringify(options.json)
    }

    const response = await fetch(new Request(options.url, optionsWithDefaults))

    if (!response.ok) {
      const errorWithResponse = new Error(
        `Failed to fetch ${options.url}.  Response: ${response.status} ${response.statusText}. ${await response.text()}`,
      )

      ;(errorWithResponse as any).response = response
      throw errorWithResponse
    }

    const responseJson = await response.json()

    return responseJson as T
  } catch (e: any) {
    if (!e.response) {
      logError(
        `Failed to reach Hatch Baby server at ${options.url}.  ${e.message}.  Trying again in 5 seconds...`,
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
  private readonly authOptions
  private loginPromise

  constructor(authOptions: EmailAuth) {
    this.authOptions = authOptions
    this.loginPromise = this.logIn()
  }

  async logIn(): Promise<LoginResponse> {
    try {
      const resp = await requestWithRetry<LoginResponse | LoginFailureResponse>(
        {
          url: apiPath('public/v1/login'),
          json: {
            email: this.authOptions.email,
            password: this.authOptions.password,
          },
          method: 'POST',
        },
      )

      if ('status' in resp && resp.status === 'failure') {
        throw new Error(resp.message)
      }

      return resp as LoginResponse
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

  async request<T = void>(options: RequestInit & { url: string }): Promise<T> {
    try {
      const loginResponse = await this.loginPromise,
        headers: HeadersInit = {
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
          'Not found with response: ' + JSON.stringify(response.data),
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
