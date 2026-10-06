import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IotClientLifecycle } from '../iot-client-lifecycle.ts'
import { asIotClient, createFakeIotClient } from './fake-iot-client.ts'

describe('IotClientLifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should create a client on start', async () => {
    const client = createFakeIotClient(),
      createClient = vi.fn().mockResolvedValue(asIotClient(client)),
      lifecycle = new IotClientLifecycle({ createClient }),
      onClient = await lifecycle.start()

    expect(createClient).toHaveBeenCalledTimes(1)
    expect(onClient.getValue()).toBe(asIotClient(client))
    lifecycle.stop()
  })

  it('should retry a failed initial creation forever with backoff', async () => {
    const goodClient = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(asIotClient(goodClient)),
      lifecycle = new IotClientLifecycle({
        createClient,
        initialRetryDelay: 1000,
        maxRetryDelay: 5000,
      }),
      startPromise = lifecycle.start()

    // first attempt happens synchronously inside start(); let it reject
    await vi.advanceTimersByTimeAsync(0)
    expect(createClient).toHaveBeenCalledTimes(1)

    // second attempt fires after the first backoff (1000ms)
    await vi.advanceTimersByTimeAsync(1000)
    expect(createClient).toHaveBeenCalledTimes(2)

    // third attempt fires after the doubled backoff (2000ms) and succeeds
    await vi.advanceTimersByTimeAsync(2000)
    expect(createClient).toHaveBeenCalledTimes(3)

    const onClient = await startPromise
    expect(onClient.getValue()).toBe(asIotClient(goodClient))
    lifecycle.stop()
  })

  it('should create the replacement before ending the previous client, and only end it on success', async () => {
    const first = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockRejectedValueOnce(new Error('offline')),
      lifecycle = new IotClientLifecycle({
        createClient,
        initialRetryDelay: 1000,
      })

    await lifecycle.start()
    expect(first.ended).toBe(false)

    // force a recreate that fails; the still-current `first` client must not
    // be ended when the replacement fails to get created. Error-triggered
    // recreate waits out the initial retry delay first.
    first.emit('error', new Error('boom'))
    await vi.advanceTimersByTimeAsync(1000)

    expect(createClient).toHaveBeenCalledTimes(2)
    expect(first.ended).toBe(false)
    lifecycle.stop()
  })

  it('should recreate with a fresh client after the dead-connection timeout', async () => {
    const first = createFakeIotClient(),
      second = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockResolvedValueOnce(asIotClient(second)),
      lifecycle = new IotClientLifecycle({
        createClient,
        deadConnectionTimeout: 10000,
      }),
      onClient = await lifecycle.start()

    first.emit('close')
    // short of the timeout - must not have recreated yet
    await vi.advanceTimersByTimeAsync(9000)
    expect(createClient).toHaveBeenCalledTimes(1)

    // past the timeout - the dead connection now forces a fresh client
    await vi.advanceTimersByTimeAsync(1500)
    expect(createClient).toHaveBeenCalledTimes(2)
    expect(onClient.getValue()).toBe(asIotClient(second))
    expect(first.ended).toBe(true)
    lifecycle.stop()
  })

  it('should not recreate if connect fires before the dead-connection timeout', async () => {
    const first = createFakeIotClient(),
      createClient = vi.fn().mockResolvedValueOnce(asIotClient(first)),
      lifecycle = new IotClientLifecycle({
        createClient,
        deadConnectionTimeout: 10000,
      })

    await lifecycle.start()

    first.emit('close')
    await vi.advanceTimersByTimeAsync(5000)
    first.emit('connect')
    await vi.advanceTimersByTimeAsync(10000)

    expect(createClient).toHaveBeenCalledTimes(1)
    lifecycle.stop()
  })

  it('should ignore close/offline/error events from a client that has already been superseded', async () => {
    const first = createFakeIotClient(),
      second = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockResolvedValueOnce(asIotClient(second)),
      lifecycle = new IotClientLifecycle({
        createClient,
        deadConnectionTimeout: 5000,
        initialRetryDelay: 1000,
      })

    await lifecycle.start()

    // force a recreation via error, superseding `first`
    first.emit('error', new Error('boom'))
    await vi.advanceTimersByTimeAsync(1000)
    expect(createClient).toHaveBeenCalledTimes(2)

    // stale events from the now-replaced first client must not trigger a
    // third, unnecessary recreation
    first.emit('close')
    first.emit('error', new Error('stale'))
    await vi.advanceTimersByTimeAsync(10000)

    expect(createClient).toHaveBeenCalledTimes(2)
    lifecycle.stop()
  })

  it('should proactively rotate the client on the refresh interval', async () => {
    const first = createFakeIotClient(),
      second = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockResolvedValueOnce(asIotClient(second)),
      lifecycle = new IotClientLifecycle({
        createClient,
        refreshPeriod: 60000,
      }),
      onClient = await lifecycle.start()

    await vi.advanceTimersByTimeAsync(60000)

    expect(createClient).toHaveBeenCalledTimes(2)
    expect(onClient.getValue()).toBe(asIotClient(second))
    lifecycle.stop()
  })

  it('should retry with backoff and forever if a proactive refresh fails, without ending the cycle', async () => {
    const first = createFakeIotClient(),
      second = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(asIotClient(second)),
      lifecycle = new IotClientLifecycle({
        createClient,
        refreshPeriod: 60000,
        initialRetryDelay: 1000,
      }),
      onClient = await lifecycle.start()

    // refresh interval fires and fails
    await vi.advanceTimersByTimeAsync(60000)
    expect(createClient).toHaveBeenCalledTimes(2)
    expect(onClient.getValue()).toBe(asIotClient(first))

    // the failed refresh retries on its own backoff rather than waiting for
    // the next full refresh period
    await vi.advanceTimersByTimeAsync(1000)
    expect(createClient).toHaveBeenCalledTimes(3)
    expect(onClient.getValue()).toBe(asIotClient(second))
    lifecycle.stop()
  })

  it('should wait the initial retry delay before recreating after an MQTT error', async () => {
    const first = createFakeIotClient(),
      second = createFakeIotClient(),
      createClient = vi
        .fn()
        .mockResolvedValueOnce(asIotClient(first))
        .mockResolvedValueOnce(asIotClient(second)),
      lifecycle = new IotClientLifecycle({
        createClient,
        initialRetryDelay: 1000,
      }),
      onClient = await lifecycle.start()

    first.emit('error', new Error('MQTT connect failed (403)'))
    await vi.advanceTimersByTimeAsync(999)
    expect(createClient).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(createClient).toHaveBeenCalledTimes(2)
    expect(onClient.getValue()).toBe(asIotClient(second))
    lifecycle.stop()
  })

  it('should end a published client and not refresh after stop', async () => {
    const client = createFakeIotClient(),
      createClient = vi.fn().mockResolvedValue(asIotClient(client)),
      lifecycle = new IotClientLifecycle({
        createClient,
        refreshPeriod: 1000,
      }),
      onClient = await lifecycle.start()

    lifecycle.stop()

    expect(client.ended).toBe(true)
    expect(onClient.getValue()).toBe(asIotClient(client))

    await vi.advanceTimersByTimeAsync(10_000)
    expect(createClient).toHaveBeenCalledTimes(1)
  })

  it('should not keep retrying after stop when a sibling request already failed', async () => {
    const createClient = vi.fn().mockRejectedValue(new Error('offline')),
      lifecycle = new IotClientLifecycle({
        createClient,
        initialRetryDelay: 1000,
        maxRetryDelay: 5000,
        refreshPeriod: 1000,
      }),
      attempt = Promise.all([
        Promise.reject(new Error('429')),
        lifecycle.start(),
      ])

    await expect(attempt).rejects.toThrow('429')
    lifecycle.stop()

    const callsAfterFailure = createClient.mock.calls.length
    await vi.advanceTimersByTimeAsync(60_000)
    expect(createClient).toHaveBeenCalledTimes(callsAfterFailure)
  })

  it('should not publish or refresh if stopped during create, and should end the late client', async () => {
    const client = createFakeIotClient()
    let resolveCreate: (value: ReturnType<typeof asIotClient>) => void = () => {
      throw new Error('create was not started')
    }
    const createClient = vi.fn(
        () =>
          new Promise<ReturnType<typeof asIotClient>>((resolve) => {
            resolveCreate = resolve
          }),
      ),
      lifecycle = new IotClientLifecycle({
        createClient,
        refreshPeriod: 1000,
        initialRetryDelay: 1000,
      })
    let published = false
    void lifecycle.start().then(() => {
      published = true
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(createClient).toHaveBeenCalledTimes(1)

    lifecycle.stop()
    resolveCreate(asIotClient(client))
    await vi.advanceTimersByTimeAsync(0)

    expect(published).toBe(false)
    expect(client.ended).toBe(true)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(published).toBe(false)
  })
})
