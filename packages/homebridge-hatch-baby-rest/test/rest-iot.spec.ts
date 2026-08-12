import { describe, expect, it } from 'vitest'
import { BehaviorSubject } from 'rxjs'
import { RestIot } from '../rest-iot'
import { RestClient } from '../rest-client'
import { RestIotRoutine } from '../../shared/hatch-sleep-types'
import {
  asIotClient,
  createFakeIotClient,
  testDeviceInfo,
} from './fake-iot-client'

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 20))
}

function fakeRestClient(routines: Partial<RestIotRoutine>[]) {
  return {
    request: () => Promise.resolve(routines),
  } as unknown as RestClient
}

describe('RestIot', () => {
  it('should turn on the first touch ring routine', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      restIot = new RestIot(
        testDeviceInfo,
        onIotClient,
        fakeRestClient([
          { id: 20, displayOrder: 2, type: 'favorite' },
          { id: 10, displayOrder: 1, type: 'favorite' },
          { id: 30, displayOrder: 0, type: 'sleep' }, // not on the touch ring
        ]),
      )

    await client.simulateConnect()

    await restIot.turnOnRoutine()
    await flush()

    expect(client.updates).toEqual([
      {
        state: {
          desired: {
            current: { playing: 'routine', step: 1, srId: 10, paused: false },
          },
        },
      },
    ])
  })

  it('should log instead of throwing when there are no touch ring routines', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      restIot = new RestIot(testDeviceInfo, onIotClient, fakeRestClient([]))

    await client.simulateConnect()

    // previously threw `TypeError: Cannot read properties of undefined
    // (reading 'id')`, which reached HomeKit's set handler as an unhandled
    // rejection
    await expect(restIot.turnOnRoutine()).resolves.toBeUndefined()
    await flush()

    expect(client.updates).toEqual([])
  })
})
