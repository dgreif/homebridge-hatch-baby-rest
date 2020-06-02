/**
 * If you are viewing this code and considering extracting it for another use,
 * please let me know with a GitHub issue!  I would be happy to provide an API that
 * can be used by other projects, but didn't want to go to the work until there was a need.
 */

import { BehaviorSubject, fromEvent, Subject, Subscription } from 'rxjs'
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  share,
  startWith,
  take,
  tap,
} from 'rxjs/operators'
import { stripMacAddress, stripUuid } from './util'
import {
  Color,
  formatRestCommand,
  RestCommand,
  RestCommandValue,
} from './rest-commands'
import { Peripheral, Service } from '@abandonware/noble'
import { promisify } from 'util'
import { colorsMatch, Feedback, parseFeedbackBuffer } from './feedback'
import { AudioTrack } from './hatch-baby-types'
import { Logging } from 'homebridge'

const usedPeripheralIds: string[] = []

const enum ServiceUuid {
  Advertising = '02260001-5efd-47eb-9c1a-de53f7a2b232',
  Rest = '02240001-5efd-47eb-9c1a-de53f7a2b232',
}

const enum CharacteristicUuid {
  Tx = '02240002-5efd-47eb-9c1a-de53f7a2b232',
  Rx = '02240003-5efd-47eb-9c1a-de53f7a2b232',
  CurrentFeedback = '02260002-5efd-47eb-9c1a-de53f7a2b232',
}

export class HatchBabyRest {
  noble = require('@abandonware/noble')
  peripheralPromise = this.getPeripheralByAddress(this.macAddress)

  onFeedback = new BehaviorSubject<Feedback>({
    time: 0,
    power: false,
    volume: 0,
    color: { r: 0, g: 0, b: 0, a: 0 },
    audioTrack: AudioTrack.None,
  })
  onPower = this.onFeedback.pipe(
    map((feedback) => feedback.power),
    distinctUntilChanged(),
    share()
  )
  onVolume = this.onFeedback.pipe(
    map((feedback) => feedback.volume),
    distinctUntilChanged(),
    share()
  )
  onColor = this.onFeedback.pipe(
    map((feedback) => feedback.color),
    distinctUntilChanged(colorsMatch),
    share()
  )
  onAudioTrack = this.onFeedback.pipe(
    map((feedback) => feedback.audioTrack),
    distinctUntilChanged(),
    share()
  )
  onUsingConnection = new Subject()

  reconnectSubscription?: Subscription

  constructor(
    private name: string,
    private macAddress: string,
    private logger: Logging
  ) {
    this.getDevice().then((device) => {
      device.on('connect', () => {
        return this.subscribeToFeedback()
      })
    })

    process.on('SIGINT', () => {
      this.disconnect()
      process.exit()
    })

    this.onUsingConnection.pipe(debounceTime(5000)).subscribe(() => {
      this.disconnect()
    })
  }

  async getPeripheralByAddress(address: string) {
    this.logger.info('Waiting for bluetooth to power on')

    await fromEvent(this.noble, 'stateChange')
      .pipe(
        startWith(this.noble.state),
        filter((state) => state === 'poweredOn'),
        take(1)
      )
      .toPromise()

    const stripedAddress = stripMacAddress(address),
      peripheralPromise = fromEvent<Peripheral>(this.noble, 'discover')
        .pipe(
          filter((peripheral) => {
            return (
              stripMacAddress(peripheral.address) === stripedAddress ||
              (peripheral.addressType === 'unknown' &&
                !usedPeripheralIds.includes(peripheral.id))
            )
          }),
          take(1),
          tap((peripheral) => {
            usedPeripheralIds.push(peripheral.id)
            this.logger.info(
              `Found device ${
                peripheral.advertisement.localName
              } with address ${peripheral.address || peripheral.addressType}`
            )

            if (peripheral.addressType === 'unknown') {
              this.logger.info(
                `${peripheral.advertisement.localName} has an unknown address.  This happens on OSX when you discover a device which you have never connected to.  Once connected, OSX will remember the address of this device.  If this is not the correct device, please restart homebridge and this device should be skipped over.`
              )

              // Force the device to connect, which will load the address into OSX for the next run
              this.getCharacteristic(
                CharacteristicUuid.CurrentFeedback,
                ServiceUuid.Advertising
              )
            }
          })
        )
        .toPromise()

    this.logger.info('Scanning for device')
    this.noble.startScanning(['180a'])

    return peripheralPromise
  }

  async connect() {
    const device = await this.getDevice()

    if (device.state === 'connected') {
      return device
    }

    this.logger.info(`Connecting to ${device.advertisement.localName}...`)
    await promisify(device.connect.bind(device) as any)()
    this.logger.info(`Connected to ${device.advertisement.localName}`)
    return device
  }

  disconnect() {
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe()
      this.reconnectSubscription = undefined
    }

    if (this.device) {
      this.device.disconnect()
      this.logger.info(
        `Disconnected from ${this.device.advertisement.localName}`
      )
    }
    this.discoverServicesPromise = undefined
  }

  discoverServicesPromise?: Promise<Service[]>
  getServices() {
    if (!this.discoverServicesPromise) {
      this.discoverServicesPromise = this.connect().then((device) =>
        promisify(
          device.discoverAllServicesAndCharacteristics.bind(device) as any
        )()
      )
    }

    return this.discoverServicesPromise
  }

  async getService(serviceUuid: string) {
    const services = await this.getServices(),
      targetUuid = stripUuid(serviceUuid),
      service = services.find((s) => stripUuid(s.uuid) === targetUuid)

    if (!service) {
      this.disconnect()
      throw new Error(`Service ${serviceUuid} not found!`)
    }

    return service
  }

  async getCharacteristic(characteristicUuid: string, serviceUuid: string) {
    this.onUsingConnection.next()

    const service = await this.getService(serviceUuid),
      targetUuid = stripUuid(characteristicUuid),
      characteristic = service.characteristics.find(
        (c) => stripUuid(c.uuid) === targetUuid
      )

    if (!characteristic) {
      this.disconnect()
      throw new Error(`Characteristic ${characteristicUuid} not found!`)
    }

    this.onUsingConnection.next()
    return characteristic
  }

  private device?: Peripheral
  async getDevice() {
    if (this.device) {
      return this.device
    }

    return (this.device = await this.peripheralPromise)
  }

  async getName() {
    const device = await this.getDevice()
    return device.advertisement.localName
  }

  async setCommand(command: RestCommand, value: RestCommandValue) {
    await this.connect()

    const writeCharacteristic = await this.getCharacteristic(
        CharacteristicUuid.Tx,
        ServiceUuid.Rest
      ),
      restCommand = formatRestCommand(command, value)

    await promisify(writeCharacteristic.write.bind(writeCharacteristic) as any)(
      restCommand,
      false
    )

    this.onUsingConnection.next()
  }

  setAudioTrack(track: AudioTrack) {
    return this.setCommand(RestCommand.SetTrackNumber, track)
  }

  setColor(color: Color) {
    return this.setCommand(RestCommand.SetColor, color)
  }

  setVolume(volume: number) {
    if (volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0 and 100.  Received ' + volume)
    }

    return this.setCommand(
      RestCommand.SetVolume,
      Math.floor((volume / 100) * 255)
    )
  }

  setPower(on: boolean) {
    return this.setCommand(RestCommand.SetPower, on ? 1 : 0)
  }

  async subscribeToFeedback() {
    const feedbackCharacteristic = await this.getCharacteristic(
      CharacteristicUuid.CurrentFeedback,
      ServiceUuid.Advertising
    )

    feedbackCharacteristic.on('read', (data: Buffer) => {
      this.onFeedback.next(parseFeedbackBuffer(data))
    })

    feedbackCharacteristic.subscribe((err) => {
      if (err) {
        this.logger.error('Failed to subscribe to feedback events', err)
      }
    })
  }

  get currentFeedback() {
    return this.onFeedback.getValue()
  }
}
