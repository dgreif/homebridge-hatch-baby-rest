import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HatchBabyRestPlatform } from '../platform.ts'
import type { API, Logging, PlatformConfig } from 'homebridge'
import type { ApiConfig } from '../api.ts'

function createPlatform() {
  const log = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as Logging,
    api = {
      on: vi.fn(),
      platformAccessory: class {},
      registerPlatformAccessories: vi.fn(),
      unregisterPlatformAccessories: vi.fn(),
    } as unknown as API,
    config = {} as PlatformConfig & ApiConfig

  return new HatchBabyRestPlatform(log, config, api)
}

describe('HatchBabyRestPlatform', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should retry a failed launch connection with backoff until it succeeds', async () => {
    const platform = createPlatform(),
      connectToApi = vi
        .fn()
        .mockRejectedValueOnce(new Error('429'))
        .mockRejectedValueOnce(new Error('503'))
        .mockResolvedValueOnce(undefined)

    // A failed connectToApi at launch was previously fatal - an HTTP error
    // response (e.g. a 429 from login) isn't retried by the rest client,
    // leaving cached accessories dead in HomeKit until restart.
    ;(platform as any).connectToApi = connectToApi

    const retryPromise = (platform as any).connectToApiWithRetry()

    await vi.advanceTimersByTimeAsync(0)
    expect(connectToApi).toHaveBeenCalledTimes(1)

    // first retry after the initial 30s delay
    await vi.advanceTimersByTimeAsync(30 * 1000)
    expect(connectToApi).toHaveBeenCalledTimes(2)

    // second retry after the doubled 60s delay
    await vi.advanceTimersByTimeAsync(60 * 1000)
    expect(connectToApi).toHaveBeenCalledTimes(3)

    await retryPromise
  })

  it('should never give up retrying, even after many consecutive failures', async () => {
    const platform = createPlatform(),
      connectToApi = vi.fn().mockRejectedValue(new Error('offline'))
    ;(platform as any).connectToApi = connectToApi

    void (platform as any).connectToApiWithRetry()

    // advance well past the point where the backoff would have hit its cap
    // (10 minutes) - the retry loop must still be running, not abandoned
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

    expect(connectToApi.mock.calls.length).toBeGreaterThan(5)
  })
})
