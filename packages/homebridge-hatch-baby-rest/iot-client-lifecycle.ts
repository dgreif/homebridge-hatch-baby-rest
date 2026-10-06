import { BehaviorSubject } from 'rxjs'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { logDebug, logError } from '../shared/util.ts'

export interface IotClientLifecycleOptions {
  /** Creates a new, not-yet-connected IoT client with fresh credentials */
  createClient: () => Promise<AwsIotDevice>
  /** Initial delay before retrying a failed client creation */
  initialRetryDelay?: number
  /** Cap for the exponential retry backoff */
  maxRetryDelay?: number
  /**
   * How long a client may sit disconnected (close/offline without a
   * subsequent connect) before we stop trusting the SDK's built-in
   * reconnect - its retries reuse the original signed websocket URL, whose
   * Cognito credentials expire, so extended outages need a fresh client
   * with fresh credentials
   */
  deadConnectionTimeout?: number
  /** Interval on which to proactively rotate credentials */
  refreshPeriod?: number
}

const defaultOptions = {
  initialRetryDelay: 30 * 1000,
  maxRetryDelay: 5 * 60 * 1000,
  deadConnectionTimeout: 10 * 60 * 1000,
  refreshPeriod: 50 * 60 * 1000, // AWS Cognito credentials expire after ~1 hour
}

/**
 * Owns the lifecycle of a single AWS IoT MQTT client: creating it, retrying a
 * failed creation forever with exponential backoff, recreating it with fresh
 * credentials when the connection has been down too long for the SDK's own
 * reconnect to be trusted, and proactively rotating credentials on an
 * interval. Exposes the current client as a `BehaviorSubject` so consumers
 * always see the latest client, including across recreations.
 *
 * This is extracted as its own class (rather than a tangle of closures) so
 * the state machine can be unit tested with a fake `createClient` and fake
 * timers, independent of the real AWS SDK and network.
 */
export class IotClientLifecycle {
  private readonly createClient: () => Promise<AwsIotDevice>
  private readonly initialRetryDelay: number
  private readonly maxRetryDelay: number
  private readonly deadConnectionTimeout: number
  private readonly refreshPeriod: number

  private onClientSubject: BehaviorSubject<AwsIotDevice> | undefined
  private onFirstClientReady: (() => void) | undefined
  private recreateInProgress = false
  private disposed = false
  private retryDelay: number
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private deadConnectionTimer: ReturnType<typeof setTimeout> | undefined
  private refreshInterval: ReturnType<typeof setInterval> | undefined
  private floorWaiters: Array<() => void> = []

  constructor(options: IotClientLifecycleOptions) {
    this.createClient = options.createClient
    this.initialRetryDelay =
      options.initialRetryDelay ?? defaultOptions.initialRetryDelay
    this.maxRetryDelay = options.maxRetryDelay ?? defaultOptions.maxRetryDelay
    this.deadConnectionTimeout =
      options.deadConnectionTimeout ?? defaultOptions.deadConnectionTimeout
    this.refreshPeriod = options.refreshPeriod ?? defaultOptions.refreshPeriod
    this.retryDelay = this.initialRetryDelay
  }

  /** The current client, once the lifecycle has produced one */
  get current(): AwsIotDevice | undefined {
    return this.onClientSubject?.getValue()
  }

  /**
   * Starts the lifecycle: creates the first client - retrying forever with
   * backoff if creation fails, so an outage at boot is never fatal - and
   * begins proactive credential rotation. Resolves once the first client is
   * available.
   */
  async start(): Promise<BehaviorSubject<AwsIotDevice>> {
    await new Promise<void>((resolve) => {
      this.onFirstClientReady = resolve
      this.recreate()
    })
    this.onFirstClientReady = undefined

    if (this.disposed) {
      // stop() already ended any client we published. Do not arm refresh.
      return (
        this.onClientSubject ??
        new Promise<BehaviorSubject<AwsIotDevice>>(() => {})
      )
    }

    // Proactive credential rotation. A plain interval (not debounced on the
    // subject) so one failed refresh cannot permanently end the cycle -
    // recreate() retries its own failures with backoff.
    this.refreshInterval = setInterval(() => {
      this.recreate()
    }, this.refreshPeriod)

    return this.onClientSubject!
  }

  /**
   * Abandons this lifecycle. Cancels timers, ends the current client, and
   * ignores a create that is still in flight: that client is ended when it
   * arrives and is not published. `getDevices()` calls this when a sibling
   * request fails so the platform launch retry does not leave another
   * session behind. Safe to call more than once.
   */
  stop() {
    this.disposed = true
    this.clearRetryTimer()
    this.clearDeadConnectionTimer()
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = undefined
    }

    const waiters = this.floorWaiters
    this.floorWaiters = []
    for (const resume of waiters) {
      resume()
    }

    const client = this.current
    if (client) {
      this.endClient(client)
    }
  }

  private isCurrent(client: AwsIotDevice) {
    // Before the subject exists, the client being created is the current
    // one. Events from an ended, replaced client must not drive recovery.
    return !this.onClientSubject || this.onClientSubject.getValue() === client
  }

  private clearDeadConnectionTimer() {
    if (this.deadConnectionTimer) {
      clearTimeout(this.deadConnectionTimer)
      this.deadConnectionTimer = undefined
    }
  }

  private clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private endClient(client: AwsIotDevice) {
    try {
      client.end()
    } catch (e: unknown) {
      logError('Failed to end previous MQTT Client')
      logError(e)
    }
  }

  private armDeadConnectionTimer(client: AwsIotDevice, event: string) {
    if (this.disposed || !this.isCurrent(client) || this.deadConnectionTimer) {
      return
    }
    this.deadConnectionTimer = setTimeout(() => {
      this.deadConnectionTimer = undefined
      logError(
        `MQTT connection still down ${Math.round(this.deadConnectionTimeout / 60000)} minutes after '${event}', recreating client with fresh credentials`,
      )
      this.recreate()
    }, this.deadConnectionTimeout)
  }

  private attachHandlers(client: AwsIotDevice) {
    client.on('connect', () => {
      if (this.disposed || !this.isCurrent(client)) {
        return
      }
      this.clearDeadConnectionTimer()
      this.retryDelay = this.initialRetryDelay
    })

    client.on('close', () => this.armDeadConnectionTimer(client, 'close'))
    client.on('offline', () => this.armDeadConnectionTimer(client, 'offline'))

    client.on('error', (error: Error) => {
      if (error.message.includes('(403)')) {
        logError('MQTT Client No Longer Authorized')
      } else {
        logError('MQTT Error:')
        logError(error)
      }

      if (!this.disposed && this.isCurrent(client)) {
        // floorDelay so a persistent 403 cannot tight-loop token fetches.
        // Creation failures take the backoff path in recreate() instead.
        this.recreate({ floorDelay: true })
      }
    })
  }

  private async createReplacement(): Promise<AwsIotDevice> {
    try {
      logDebug('Creating new MQTT Client')

      // Create the replacement BEFORE ending the previous client: if
      // creation fails mid-outage, the old client keeps the SDK's own
      // reconnect loop alive instead of leaving no client at all. The old
      // shape (end first, then create) is how a prior outage went silent
      // for days - creation failed after the only client had already been
      // ended, and nothing ever retried.
      const client = await this.createClient()
      this.attachHandlers(client)

      const previousClient = this.current
      if (previousClient) {
        this.endClient(previousClient)
      }

      logDebug('Created new MQTT Client')
      return client
    } catch (e) {
      logError('Failed to Create an MQTT Client')
      logError(e)
      throw e
    }
  }

  private waitForFloor() {
    return new Promise<void>((resolve) => {
      const resume = () => {
        this.floorWaiters = this.floorWaiters.filter(
          (waiter) => waiter !== resume,
        )
        resolve()
      }
      this.floorWaiters.push(resume)
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined
        resume()
      }, this.initialRetryDelay)
    })
  }

  private async recreate(options?: { floorDelay?: boolean }) {
    if (this.disposed || this.recreateInProgress) {
      return
    }
    this.recreateInProgress = true
    this.clearRetryTimer()
    this.clearDeadConnectionTimer()

    try {
      if (options?.floorDelay) {
        await this.waitForFloor()
        if (this.disposed) {
          return
        }
      }

      const client = await this.createReplacement()
      if (this.disposed) {
        // In-flight create finished after stop(). Do not publish it and do
        // not leave the socket up.
        this.endClient(client)
        return
      }

      this.retryDelay = this.initialRetryDelay

      if (this.onClientSubject) {
        this.onClientSubject.next(client)
      } else {
        this.onClientSubject = new BehaviorSubject(client)
        this.onFirstClientReady?.()
      }
    } catch (_) {
      if (this.disposed) {
        return
      }
      // already logged; retry with backoff, forever - an extended outage
      // must not permanently kill the client
      logError(
        `Retrying MQTT client creation in ${Math.round(this.retryDelay / 1000)}s`,
      )
      this.retryTimer = setTimeout(() => {
        this.retryTimer = undefined
        if (!this.disposed) {
          this.recreate()
        }
      }, this.retryDelay)
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay)
    } finally {
      this.recreateInProgress = false
    }
  }
}
