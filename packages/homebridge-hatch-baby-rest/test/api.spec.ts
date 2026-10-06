import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HatchBabyApi } from '../api.ts'

describe('HatchBabyApi.getDevices', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('no', { status: 500 }))),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('should dispose the iot lifecycle when a sibling request fails', async () => {
    const api = new HatchBabyApi({
        email: 'a@example.com',
        password: 'secret',
      }),
      createAwsIotClient = vi
        .spyOn(api, 'createAwsIotClient')
        .mockRejectedValue(new Error('offline'))
    void api.getAccount().catch(() => {})
    vi.spyOn(api, 'getIotDevices').mockResolvedValue([])
    vi.spyOn(api, 'getMember').mockRejectedValue(new Error('429'))

    await expect(api.getDevices()).rejects.toThrow('429')

    const callsAfterFailure = createAwsIotClient.mock.calls.length
    expect(callsAfterFailure).toBeGreaterThan(0)

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(createAwsIotClient).toHaveBeenCalledTimes(callsAfterFailure)
  })
})
