/**
 * If you are viewing this code and considering extracting it for another use,
 * please let me know with a GitHub issue!  I would be happy to provide an API that
 * can be used by other projects, but didn't want to go to the work until there was a need.
 */

import {
  BehaviorSubject,
  firstValueFrom,
  fromEvent,
  Subject,
  Subscription,
} from 'rxjs'
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  take,
  tap,
} from 'rxjs/operators'
import { logError, logInfo } from '../shared/util'
import { stripMacAddress, stripUuid } from './util'
import {
  formatRestCommand,
  RestColorAndBrightness,
  RestCommand,
  RestCommandValue,
} from '../shared/rest-commands'
import { Peripheral, Service } from '@abandonware/noble'
import { promisify } from 'util'
import { colorsMatch, Feedback, parseFeedbackBuffer } from './feedback'
import { AudioTrack, audioTracks } from '../shared/hatch-sleep-types'
import { LightAndSoundMachine } from '../shared/light-and-sound-machine'
import {
  rgbToHsb,
  convertToHexRange,
  hsbToRgb,
  HsbColor,
  convertFromHexRange,
} from '../shared/colors'

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

export class Rest implements LightAndSoundMachine {
  readonly model = 'Rest'
  audioTracks = audioTracks
  noble = require('@abandonware/noble')
  peripheralPromise = this.getPeripheralByAddress(this.macAddress)

  onFeedback = new BehaviorSubject<Feedback>({
    time: 0,
    power: false,
    volume: 0,
    color: { r: 0, g: 0, b: 0, a: 0 },
    audioTrack: AudioTrack.None,
  })

  private fromFeedback<T>(
    retrieveProperty: (feedback: Feedback) => T,
    distinctCheck?: (a: any, b: any) => boolean,
  ) {
    return this.onFeedback.pipe(
      map(retrieveProperty),
      distinctUntilChanged(distinctCheck),
    )
  }

  onIsPowered = this.fromFeedback((feedback) => feedback.power)
  onVolume = this.fromFeedback((feedback) => feedback.volume)
  onColor = this.fromFeedback((feedback) => feedback.color, colorsMatch)
  onBrightness = this.fromFeedback((feedback) =>
    convertFromHexRange(feedback.color.a, 100),
  )
  onHsb = this.onColor.pipe(map((color) => rgbToHsb(color, 255)))
  onHue = this.onHsb.pipe(
    map((hsb) => hsb.h),
    distinctUntilChanged(),
  )
  onSaturation = this.onHsb.pipe(
    map((hsb) => hsb.s),
    distinctUntilChanged(),
  )
  onAudioTrack = this.fromFeedback((feedback) => feedback.audioTrack)
  onAudioPlaying = this.onAudioTrack.pipe(
    map((track) => track !== AudioTrack.None),
    distinctUntilChanged(),
  )
  onUsingConnection = new Subject()

  reconnectSubscription?: Subscription

  constructor(
    public readonly name: string,
    public readonly macAddress: string,
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
    logInfo('Waiting for bluetooth to power on')

    await firstValueFrom(
      fromEvent(this.noble, 'stateChange').pipe(
        startWith(this.noble.state),
        filter((state) => state === 'poweredOn'),
      ),
    )

    const stripedAddress = stripMacAddress(address),
      peripheralPromise = firstValueFrom(
        fromEvent<Peripheral>(this.noble, 'discover').pipe(
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
            logInfo(
              `Found device ${
                peripheral.advertisement.localName
              } with address ${peripheral.address || peripheral.addressType}`,
            )

            if (peripheral.addressType === 'unknown') {
              logInfo(
                `${peripheral.advertisement.localName} has an unknown address.  This happens on OSX when you discover a device which you have never connected to.  Once connected, OSX will remember the address of this device.  If this is not the correct device, please restart homebridge and this device should be skipped over.`,
              )

              // Force the device to connect, which will load the address into OSX for the next run
              this.getCharacteristic(
                CharacteristicUuid.CurrentFeedback,
                ServiceUuid.Advertising,
              )
            }
          }),
        ),
      )

    logInfo('Scanning for ' + this.name)
    this.noble.startScanning(['180a'])

    return peripheralPromise
  }

  async connect() {
    const device = await this.getDevice()

    if (device.state === 'connected') {
      return device
    }

    logInfo(`Connecting to ${device.advertisement.localName}...`)
    await promisify(device.connect.bind(device) as any)()
    logInfo(`Connected to ${device.advertisement.localName}`)
    return device
  }

  disconnect() {
    if (this.reconnectSubscription) {
      this.reconnectSubscription.unsubscribe()
      this.reconnectSubscription = undefined
    }

    if (this.device) {
      this.device.disconnect()
      logInfo(`Disconnected from ${this.device.advertisement.localName}`)
    }
    this.discoverServicesPromise = undefined
  }

  discoverServicesPromise?: Promise<Service[]>
  getServices() {
    if (!this.discoverServicesPromise) {
      this.discoverServicesPromise = this.connect().then((device) =>
        promisify(
          device.discoverAllServicesAndCharacteristics.bind(device) as any,
        )(),
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
    this.onUsingConnection.next(null)

    const service = await this.getService(serviceUuid),
      targetUuid = stripUuid(characteristicUuid),
      characteristic = service.characteristics.find(
        (c) => stripUuid(c.uuid) === targetUuid,
      )

    if (!characteristic) {
      this.disconnect()
      throw new Error(`Characteristic ${characteristicUuid} not found!`)
    }

    this.onUsingConnection.next(null)
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
        ServiceUuid.Rest,
      ),
      restCommand = formatRestCommand(command, value)

    await promisify(writeCharacteristic.write.bind(writeCharacteristic) as any)(
      restCommand,
      false,
    )

    this.onUsingConnection.next(null)
  }

  setAudioTrack(track: AudioTrack) {
    return this.setCommand(RestCommand.SetTrackNumber, track)
  }

  setAudioPlaying(playing: boolean) {
    if (!playing) {
      return this.setAudioTrack(AudioTrack.None)
    }

    // do nothing for other audio tracks.  They will be handed to `setAudioTrack` directly
  }

  setColorAndBrightness(color: RestColorAndBrightness) {
    return this.setCommand(RestCommand.SetColor, color)
  }

  setHsb({ h, s, b }: HsbColor) {
    // NOTE: lights assume 100% brightness in color calculations
    const rgb = hsbToRgb({ h, s, b: 100 })

    return this.setColorAndBrightness({
      ...rgb,
      a: convertToHexRange(b, 100),
    })
  }

  setVolume(volume: number) {
    if (volume < 0 || volume > 100) {
      throw new Error('Volume must be between 0 and 100.  Received ' + volume)
    }

    return this.setCommand(
      RestCommand.SetVolume,
      convertToHexRange(volume, 100),
    )
  }

  setPower(on: boolean) {
    return this.setCommand(RestCommand.SetPower, on ? 1 : 0)
  }

  async subscribeToFeedback() {
    const feedbackCharacteristic = await this.getCharacteristic(
      CharacteristicUuid.CurrentFeedback,
      ServiceUuid.Advertising,
    )

    feedbackCharacteristic.on('read', (data: Buffer) => {
      this.onFeedback.next(parseFeedbackBuffer(data))
    })

    feedbackCharacteristic.subscribe((err) => {
      if (err) {
        logError('Failed to subscribe to feedback events')
        logError(err)
      }
    })
  }

  get currentFeedback() {
    return this.onFeedback.getValue()
  }
}
