import { platformName, pluginName, setHap } from './hap'
import { HatchBabyRestPlatform } from './platform'
import { readFileSync, writeFileSync } from 'fs'
import { stripMacAddress } from './util'

export function updateHomebridgeConfig(
  homebridge: any,
  update: (config: string) => string
) {
  const configPath = homebridge.user.configPath(),
    config = readFileSync(configPath).toString(),
    updatedConfig = update(config)

  if (config !== updatedConfig) {
    writeFileSync(configPath, updatedConfig)
  }
}

interface RestAccessory {
  name?: string
  macAddress?: string
  accessory: string
}

function migrateRestAccessoriesToPlatform(homebridge: any) {
  updateHomebridgeConfig(homebridge, (originalConfig) => {
    try {
      const config = JSON.parse(originalConfig),
        restAccessories = config.accessories?.filter(
          (accessory: RestAccessory) => accessory.accessory === platformName
        )

      if (!restAccessories?.length) {
        // no rest accessories to migrate
        return originalConfig
      }

      // ensure a platforms array exists
      if (!config.platforms) {
        config.platforms = []
      }

      // find or create the hatch baby rest platform
      const hbrPlatform = config.platforms.find(
        (platform: { platform: string }) => platform.platform === platformName
      ) || { platform: platformName }

      if (!config.platforms.includes(hbrPlatform)) {
        config.platforms.push(hbrPlatform)
      }

      // add all the rest lights to the platform
      const restLights = (hbrPlatform.restLights = hbrPlatform.restLights || [])
      restAccessories.forEach((restAccessory: RestAccessory) => {
        const { name, macAddress } = restAccessory

        if (!name || !macAddress) {
          // invalid accessory config
          return
        }

        if (
          restLights.some(
            (light: { macAddress?: string }) =>
              stripMacAddress(light.macAddress || '') ===
              stripMacAddress(macAddress)
          )
        ) {
          // dedupe by mac address for old ready-to-wake duplicate setups
          return
        }

        restLights.push({
          name,
          macAddress,
        })
      })

      // Remove the rest accessories from the config
      config.accessories = config.accessories.filter(
        (accessory: any) => !restAccessories.includes(accessory)
      )

      // save the migrated config
      return JSON.stringify(config, null, 4)
    } catch (_) {
      // return config with no changes if anything goes wrong
      return originalConfig
    }
  })
}

export default function (homebridge: any) {
  setHap(homebridge.hap)

  migrateRestAccessoriesToPlatform(homebridge)

  homebridge.registerPlatform(
    pluginName,
    platformName,
    HatchBabyRestPlatform,
    true
  )
}
