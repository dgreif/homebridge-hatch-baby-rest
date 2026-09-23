import { describe, expect, it, vi } from 'vitest'
import { BehaviorSubject } from 'rxjs'
import { RestIot } from '../rest-iot.ts'
import { IotDeviceInfo, Product } from '../../shared/hatch-sleep-types.ts'
import type { RestClient } from '../rest-client.ts'
import { asIotClient, createFakeIotClient } from './fake-iot-client.ts'

const deviceInfo = {
  id: 1,
  createDate: '',
  updateDate: '',
  macAddress: 'aa:bb:cc:dd:ee:ff',
  owner: true,
  name: 'Test Rest Iot',
  hardwareVersion: '1',
  product: Product.riot,
  thingName: 'test-thing',
  email: '',
  memberId: 1,
} as IotDeviceInfo

function createRestIot(restClient: Partial<RestClient>) {
  const client = createFakeIotClient(),
    onIotClient = new BehaviorSubject(asIotClient(client)),
    restIot = new RestIot(
      deviceInfo,
      onIotClient,
      restClient as unknown as RestClient,
    )

  return { restIot, client }
}

describe('RestIot', () => {
  it('should sort routines by displayOrder and filter to touch-ring-eligible ones', async () => {
    const request = vi.fn().mockResolvedValue([
        {
          id: 3,
          displayOrder: 2,
          type: 'sleep',
          button0: true,
        },
        {
          id: 1,
          displayOrder: 0,
          type: 'favorite',
          button0: false,
        },
        {
          id: 2,
          displayOrder: 1,
          type: 'wake',
          button0: false,
        },
      ]),
      { restIot } = createRestIot({ request }),
      routines = await restIot.fetchRoutines()

    expect(routines.map((r) => r.id)).toEqual([1, 3])
  })

  it('should log an error and not send an update when there are no touch ring routines', async () => {
    const request = vi
        .fn()
        .mockResolvedValue([
          { id: 1, displayOrder: 0, type: 'wake', button0: false },
        ]),
      { restIot, client } = createRestIot({ request }),
      updateSpy = vi.spyOn(restIot, 'update')

    // an account with no touch ring routines previously threw on
    // `routines[0].id`, an unhandled rejection that could crash the process
    await expect(restIot.turnOnRoutine()).resolves.toBeUndefined()

    expect(updateSpy).not.toHaveBeenCalled()
    expect(client.updates).toEqual([])
  })

  it('should activate the first touch ring routine when one exists', async () => {
    const request = vi
        .fn()
        .mockResolvedValue([
          { id: 42, displayOrder: 0, type: 'favorite', button0: false },
        ]),
      { restIot, client } = createRestIot({ request })

    await client.simulateConnect()
    await restIot.turnOnRoutine()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(client.updates).toEqual([
      {
        state: {
          desired: {
            current: { playing: 'routine', step: 1, srId: 42, paused: false },
          },
        },
      },
    ])
  })
})
