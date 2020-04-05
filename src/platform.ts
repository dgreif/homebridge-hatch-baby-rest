import { ApiConfig, HatchBabyApi } from './api'
import { HAP, hap, platformName, pluginName } from './hap'
import { useLogger } from './util'
import { HatchBabyRestAccessory } from './accessories/hatch-baby-rest-plus'

const debug = __filename.includes('release')

process.env.HBR_DEBUG = debug ? 'true' : ''

export class HatchBabyRestPlatform {
  private readonly homebridgeAccessories: { [uuid: string]: HAP.Accessory } = {}

  constructor(
    public log: HAP.Log,
    public config: ApiConfig & { removeAll: boolean },
    public api: HAP.Platform
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

  configureAccessory(accessory: HAP.Accessory) {
    this.log.info(
      `Configuring cached accessory ${accessory.UUID} ${accessory.displayName}`
    )
    this.log.debug('%j', accessory)
    this.homebridgeAccessories[accessory.UUID] = accessory
  }

  async connectToApi() {
    const hatchBabyApi = new HatchBabyApi(this.config),
      lights = await hatchBabyApi.getRestPlusLights(),
      { api } = this,
      cachedAccessoryIds = Object.keys(this.homebridgeAccessories),
      platformAccessories: HAP.Accessory[] = [],
      activeAccessoryIds: string[] = [],
      debugPrefix = debug ? 'TEST ' : ''

    if (this.config.removeAll) {
      this.log.info(
        'REMOVING ALL Hatch Baby Rest+ lights.  You can now stop your homebridge server and restart it without removeAll set.'
      )
      lights.length = 0
    } else {
      this.log.info(`Configuring ${lights.length} Hatch Baby Rest+ lights`)
    }

    lights.forEach((light) => {
      const uuid = hap.UUIDGen.generate(debugPrefix + light.id),
        displayName = debugPrefix + light.name,
        createHomebridgeAccessory = () => {
          const accessory = new hap.PlatformAccessory(
            displayName,
            uuid,
            hap.AccessoryCategories.LIGHTBULB
          )

          this.log.info(`Adding new Hatch Baby Rest+ - ${displayName}`)
          platformAccessories.push(accessory)

          return accessory
        },
        homebridgeAccessory =
          this.homebridgeAccessories[uuid] || createHomebridgeAccessory()

      new HatchBabyRestAccessory(light, homebridgeAccessory)

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
