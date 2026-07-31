import { describe, expect, it } from 'vitest'
import { BehaviorSubject } from 'rxjs'
import { IotDevice } from '../iot-device'
import {
  asIotClient,
  createFakeIotClient,
  testDeviceInfo,
} from './fake-iot-client'

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 20))
}

describe('IotDevice', () => {
  it('should send updates through the current client', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      device = new IotDevice<{ isPowered: boolean }>(
        testDeviceInfo,
        onIotClient,
      )

    await client.simulateConnect()

    device.update({ isPowered: true })
    await flush()

    expect(client.updates).toEqual([
      { state: { desired: { isPowered: true } } },
    ])
  })

  it('should send updates through a replacement client', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      device = new IotDevice<{ isPowered: boolean }>(
        testDeviceInfo,
        onIotClient,
      )

    await client.simulateConnect()

    const replacement = createFakeIotClient()
    onIotClient.next(asIotClient(replacement))
    await replacement.simulateConnect()

    device.update({ isPowered: true })
    await flush()

    expect(client.updates).toEqual([])
    expect(replacement.updates).toEqual([
      { state: { desired: { isPowered: true } } },
    ])
  })

  it('should deliver commands queued while a never-connecting client was current', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      device = new IotDevice<{ isPowered: boolean }>(
        testDeviceInfo,
        onIotClient,
      )

    await client.simulateConnect()

    const neverConnects = createFakeIotClient()
    onIotClient.next(asIotClient(neverConnects))

    // queued while the dead client is current - must not be dropped, and must
    // not be sent to the replacement before the replacement has registered
    // (the sdk drops updates on unregistered things)
    device.update({ isPowered: true })

    const replacement = createFakeIotClient()
    onIotClient.next(asIotClient(replacement))
    await replacement.simulateConnect()
    await flush()

    expect(neverConnects.updates).toEqual([])
    expect(replacement.updates).toEqual([
      { state: { desired: { isPowered: true } } },
    ])
  })

  it('should not wedge the update queue on a client that never connects', async () => {
    const client = createFakeIotClient(),
      onIotClient = new BehaviorSubject(asIotClient(client)),
      device = new IotDevice<{ isPowered: boolean }>(
        testDeviceInfo,
        onIotClient,
      )

    await client.simulateConnect()

    // e.g. created moments before a network outage began, then replaced with
    // fresh credentials once the outage ended.  Its connect event never fires,
    // so its registration must not block commands for the healthy replacement
    const neverConnects = createFakeIotClient()
    onIotClient.next(asIotClient(neverConnects))

    const replacement = createFakeIotClient()
    onIotClient.next(asIotClient(replacement))
    await replacement.simulateConnect()

    device.update({ isPowered: true })
    await flush()

    expect(replacement.updates).toEqual([
      { state: { desired: { isPowered: true } } },
    ])
  })
})
