import { readFileSync, writeFileSync } from 'fs'

const hatchRestBluetoothPlatformName = 'HatchRestBluetooth',
  hatchBabyRestPlatformName = 'HatchBabyRest'

function updateHomebridgeConfig(
  homebridge: any,
  update: (config: string) => string,
) {
  const configPath = homebridge.user.configPath(),
    config = readFileSync(configPath).toString(),
    updatedConfig = update(config)

  if (config !== updatedConfig) {
    writeFileSync(configPath, updatedConfig)
  }
}

export function migrateRestBluetooth(homebridge: any) {
  updateHomebridgeConfig(homebridge, (originalConfig) => {
    try {
      const config = JSON.parse(originalConfig),
        hbrPlatform = config.platforms?.find(
          (p: { platform: string }) => p.platform === hatchBabyRestPlatformName,
        ),
        restLights = hbrPlatform?.restLights

      if (!restLights?.length) {
        // no rest accessories to migrate
        return originalConfig
      }

      // find or create the hatch rest bluetooth platform
      const hrbPlatform = config.platforms.find(
        (platform: { platform: string }) =>
          platform.platform === hatchRestBluetoothPlatformName,
      ) || { platform: hatchRestBluetoothPlatformName }

      if (!config.platforms.includes(hrbPlatform)) {
        config.platforms.push(hrbPlatform)
      }

      // add all the rest lights to the platform
      if (!hrbPlatform.restLights) {
        hrbPlatform.restLights = restLights
      }

      // remove the rest lights from the hatch baby rest platform
      delete hbrPlatform.restLights

      // save the migrated config
      return JSON.stringify(config, null, 4)
    } catch (_) {
      // return config with no changes if anything goes wrong
      return originalConfig
    }
  })
}
