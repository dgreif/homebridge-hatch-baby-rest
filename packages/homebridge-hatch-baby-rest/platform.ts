import { ApiConfig, HatchBabyApi } from './api.ts'
import { hap, isTestHomebridge } from '../shared/hap.ts'
import { useLogger } from '../shared/util.ts'
import { LightAndSoundMachineAccessory } from '../shared/light-and-sound-machine.ts'
import { SoundMachineAccessory } from '../shared/sound-machine.ts'
import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge'
import { RestoreAccessory } from './restore-accessory.ts'
import { RestIot } from './rest-iot.ts'
import { Restore } from './restore.ts'

export const pluginName = 'homebridge-hatch-baby-rest'
export const platformName = 'HatchBabyRest'

export class HatchBabyRestPlatform implements DynamicPlatformPlugin {
  public log
  public config
  public api
  private readonly homebridgeAccessories: {
    [uuid: string]: PlatformAccessory
  } = {}

  constructor(log: Logging, config: PlatformConfig & ApiConfig, api: API) {
    this.log = log
    this.config = config
    this.api = api
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
      `Configuring cached accessory ${accessory.UUID} ${accessory.displayName}`,
    )
    this.log.debug('%j', accessory)
    this.homebridgeAccessories[accessory.UUID] = accessory
  }

  async connectToApi() {
    const hatchBabyApi =
        this.config.email && this.config.password
          ? new HatchBabyApi(this.config)
          : undefined,
      {
        restPluses,
        restMinis,
        restores,
        restoreIots,
        restIots,
        restIotPluses,
        restoreV4s,
        restBabies,
      } = hatchBabyApi
        ? await hatchBabyApi.getDevices()
        : {
            restPluses: [],
            restMinis: [],
            restores: [],
            restIots: [],
            restIotPluses: [],
            restoreIots: [],
            restoreV4s: [],
            restBabies: [],
          },
      { api } = this,
      cachedAccessoryIds = Object.keys(this.homebridgeAccessories),
      platformAccessories: PlatformAccessory[] = [],
      activeAccessoryIds: string[] = [],
      debugPrefix = isTestHomebridge ? 'TEST ' : '',
      devices = [
        ...restPluses,
        ...restMinis,
        ...restIots,
        ...restIotPluses,
        ...restores,
        ...restoreIots,
        ...restoreV4s,
        ...restBabies,
      ]

    this.log.info('Configuring Hatch Devices:')

    if (devices.length) {
      const countByModel = devices.reduce(
        (acc, device) => {
          const model = device.model
          acc[model] = (acc[model] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      Object.entries(countByModel).forEach(([model, count]) => {
        this.log.info(`  ${model}: ${count}`)
      })
    } else {
      this.log.info('  No supported devices found')
    }

    devices.forEach((device) => {
      const id = device.id,
        uuid = hap.uuid.generate(debugPrefix + id),
        displayName = debugPrefix + device.name,
        createHomebridgeAccessory = () => {
          const accessory = new api.platformAccessory(
            displayName,
            uuid,
            hap.Categories.LIGHTBULB,
          )

          this.log.info(`Adding new Hatch ${device.model} - ${displayName}`)
          platformAccessories.push(accessory)

          return accessory
        },
        homebridgeAccessory =
          this.homebridgeAccessories[uuid] || createHomebridgeAccessory()

      if (device instanceof Restore || device instanceof RestIot) {
        new RestoreAccessory(device, homebridgeAccessory)
      } else if ('onBrightness' in device) {
        new LightAndSoundMachineAccessory(device, homebridgeAccessory)
      } else {
        new SoundMachineAccessory(device, homebridgeAccessory)
      }

      this.homebridgeAccessories[uuid] = homebridgeAccessory
      activeAccessoryIds.push(uuid)
    })

    if (platformAccessories.length) {
      api.registerPlatformAccessories(
        pluginName,
        platformName,
        platformAccessories,
      )
    }

    const staleAccessories = cachedAccessoryIds
      .filter((cachedId) => !activeAccessoryIds.includes(cachedId))
      .map((id) => this.homebridgeAccessories[id])

    staleAccessories.forEach((staleAccessory) => {
      this.log.info(
        `Removing stale cached accessory ${staleAccessory.UUID} ${staleAccessory.displayName}`,
      )
    })

    if (staleAccessories.length) {
      this.api.unregisterPlatformAccessories(
        pluginName,
        platformName,
        staleAccessories,
      )
    }
  }
}
