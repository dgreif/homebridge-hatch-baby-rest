import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import type { API, Logging, PlatformConfig } from 'homebridge'
import { ApiConfig } from '../api'
import { HatchBabyRestPlatform } from '../platform'

function createPlatform() {
  const log = {
      info: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    } as unknown as Logging,
    api = new EventEmitter() as unknown as API,
    platform = new HatchBabyRestPlatform(
      log,
      { platform: 'HatchBabyRest' } as PlatformConfig & ApiConfig,
      api,
    )

  return { platform, api }
}

describe('HatchBabyRestPlatform', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should retry with backoff when connecting to the api fails at launch', async () => {
    const { platform, api } = createPlatform(),
      connectToApi = vi
        .spyOn(platform, 'connectToApi')
        // e.g. a 429 from login, which the rest client does not retry.
        // Previously this was fatal: the plugin stayed dead, with cached
        // accessories responding to nothing, until homebridge restarted
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValue(undefined)

    ;(api as unknown as EventEmitter).emit('didFinishLaunching')
    await vi.advanceTimersByTimeAsync(0)
    expect(connectToApi).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(30 * 1000)
    expect(connectToApi).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(60 * 1000)
    expect(connectToApi).toHaveBeenCalledTimes(3)

    // success - no further attempts
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(connectToApi).toHaveBeenCalledTimes(3)
  })
})
