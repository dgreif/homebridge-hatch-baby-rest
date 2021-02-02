import { HatchBabyApi } from './api'
import { hap, isTestHomebridge, platformName, pluginName } from './hap'
import { stripMacAddress, useLogger } from './util'
import { HatchBabyRestPlusAccessory } from './accessories/light-and-sound-machine'
import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge'
import { HatchBabyPlatformOptions } from './hatch-baby-types'
import { HatchBabyRest } from './hatch-baby-rest'

export class HatchBabyRestPlatform implements DynamicPlatformPlugin {
  private readonly homebridgeAccessories: {
    [uuid: string]: PlatformAccessory
  } = {}

  constructor(
    public log: Logging,
    public config: PlatformConfig & HatchBabyPlatformOptions,
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
      this.connectToApi().catch((e) => {
        this.log.error('Error connecting to API')
        this.log.error(e)
      })
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

  async connectToApi() {
    const hatchBabyApi =
        this.config.email && this.config.password
          ? new HatchBabyApi(this.config)
          : undefined,
      restLights =
        this.config.restLights?.map(
          (lightConfig) =>
            new HatchBabyRest(lightConfig.name, lightConfig.macAddress)
        ) || [],
      restPlusLights = hatchBabyApi
        ? await hatchBabyApi.getRestPlusLights()
        : [],
      lights = [...restLights, ...restPlusLights],
      { api } = this,
      cachedAccessoryIds = Object.keys(this.homebridgeAccessories),
      platformAccessories: PlatformAccessory[] = [],
      activeAccessoryIds: string[] = [],
      debugPrefix = isTestHomebridge ? 'TEST ' : ''

    this.log.info(
      `Configuring ${restLights.length} Rest and ${restPlusLights.length} Rest+ lights`
    )

    lights.forEach((light) => {
      const id = 'id' in light ? light.id : stripMacAddress(light.macAddress),
        uuid = hap.uuid.generate(debugPrefix + id),
        displayName = debugPrefix + light.name,
        createHomebridgeAccessory = () => {
          const accessory = new api.platformAccessory(
            displayName,
            uuid,
            hap.Categories.LIGHTBULB
          )

          this.log.info(`Adding new Hatch Baby Rest+ - ${displayName}`)
          platformAccessories.push(accessory)

          return accessory
        },
        homebridgeAccessory =
          this.homebridgeAccessories[uuid] || createHomebridgeAccessory()

      new HatchBabyRestPlusAccessory(light, homebridgeAccessory)

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
