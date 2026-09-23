import { EventEmitter } from 'node:events'
import { thingShadow as AwsIotDevice } from 'aws-iot-device-sdk'
import { IotDeviceInfo } from '../../shared/hatch-sleep-types.ts'

export const testThingName = 'test-thing'

export const testDeviceInfo = {
  id: 'test-id',
  name: 'Test Device',
  macAddress: 'aa:bb:cc:dd:ee:ff',
  thingName: testThingName,
} as unknown as IotDeviceInfo

export interface FakeIotClient extends EventEmitter {
  updates: unknown[]
  ended: boolean
  simulateConnect: () => Promise<void>
  end: () => void
  register: (thingName: string, options: unknown, callback: () => void) => void
  get: (thingName: string) => string
  update: (thingName: string, payload: unknown) => string | null
}

let clientCount = 0

/**
 * Minimal stand-in for aws-iot-device-sdk's thingShadow: enough surface for
 * IotDevice's register/get/update flow and IotClientLifecycle's connection
 * events, driven manually via simulateConnect / emit('close') / etc.
 */
export function createFakeIotClient() {
  const id = ++clientCount,
    getToken = `get-token-${id}`
  let updateCount = 0,
    registered = false

  const client = new EventEmitter() as FakeIotClient

  client.updates = []
  client.ended = false
  client.end = () => {
    client.ended = true
  }
  client.register = (thingName, options, callback) => {
    registered = true
    callback()
  }
  client.get = () => getToken
  client.update = (thingName, payload) => {
    if (!registered) {
      // matches the real sdk: thingShadow.update() returns null (and drops
      // the command) when the thing has not been registered on this client
      return null
    }

    client.updates.push(payload)
    return `update-token-${id}-${++updateCount}`
  }
  client.simulateConnect = () => {
    // defer the connect event a tick, like a real wss handshake, then deliver
    // the shadow-get status so the registration promise settles
    return new Promise((resolve) => {
      setTimeout(() => {
        client.emit('connect')
        setTimeout(() => {
          client.emit('status', testThingName, '', getToken, {
            state: { reported: {}, desired: {} },
          })
          setTimeout(resolve, 0)
        }, 0)
      }, 0)
    })
  }

  return client
}

export function asIotClient(client: FakeIotClient) {
  return client as unknown as AwsIotDevice
}
