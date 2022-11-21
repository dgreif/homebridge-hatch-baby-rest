import { hap, isTestHomebridge } from '../shared/hap'
import { useLogger } from '../shared/util'
import { stripMacAddress } from './util'
import { LightAndSoundMachineAccessory } from '../shared/light-and-sound-machine'
import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge'
import { Rest } from './rest'

export const pluginName = 'homebridge-hatch-rest-bluetooth'
export const platformName = 'HatchRestBluetooth'

interface RestLightConfig {
  name: string
  macAddress: string
}

export interface HatchRestBluetoothPlatformOptions {
  restLights?: RestLightConfig[]
}

export class HatchRestBluetoothPlatform implements DynamicPlatformPlugin {
  private readonly homebridgeAccessories: {
    [uuid: string]: PlatformAccessory
  } = {}

  constructor(
    public log: Logging,
    public config: PlatformConfig & HatchRestBluetoothPlatformOptions,
    public api: API
  ) {
    useLogger({
      logInfo(message) {
        log.info(message)
      },
      logError(message) {
        log.error(message)
      },
    })

    if (!config) {
      this.log.info('No configuration found for platform HatchBabyRest')
      return
    }

    this.api.on('didFinishLaunching', () => {
      this.log.debug('didFinishLaunching')
      this.loadDevices()
    })

    this.homebridgeAccessories = {}
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info(
      `Configuring cached accessory ${accessory.UUID} ${accessory.displayName}`
    )
    this.log.debug('%j', accessory)
    this.homebridgeAccessories[accessory.UUID] = accessory
  }

  loadDevices() {
    const restLights =
        this.config.restLights?.map(
          (lightConfig) => new Rest(lightConfig.name, lightConfig.macAddress)
        ) || [],
      { api } = this,
      cachedAccessoryIds = Object.keys(this.homebridgeAccessories),
      platformAccessories: PlatformAccessory[] = [],
      activeAccessoryIds: string[] = [],
      debugPrefix = isTestHomebridge ? 'TEST ' : '',
      devices = restLights

    this.log.info(`Configuring ${restLights.length} Rest Sound Machines`)

    devices.forEach((device) => {
      const id = stripMacAddress(device.macAddress),
        uuid = hap.uuid.generate(debugPrefix + id),
        displayName = debugPrefix + device.name,
        createHomebridgeAccessory = () => {
          const accessory = new api.platformAccessory(
            displayName,
            uuid,
            hap.Categories.LIGHTBULB
          )

          this.log.info(`Adding new Hatch ${device.model} - ${displayName}`)
          platformAccessories.push(accessory)

          return accessory
        },
        homebridgeAccessory =
          this.homebridgeAccessories[uuid] || createHomebridgeAccessory()

      new LightAndSoundMachineAccessory(device, homebridgeAccessory)

      this.homebridgeAccessories[uuid] = homebridgeAccessory
      activeAccessoryIds.push(uuid)
    })

    if (platformAccessories.length) {
      api.registerPlatformAccessories(
        pluginName,
        platformName,
        platformAccessories
      )
    }

    const staleAccessories = cachedAccessoryIds
      .filter((cachedId) => !activeAccessoryIds.includes(cachedId))
      .map((id) => this.homebridgeAccessories[id])

    staleAccessories.forEach((staleAccessory) => {
      this.log.info(
        `Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`
      )
    })

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(
        pluginName,
        platformName,
        staleAccessories
      )
    }
  }
}
