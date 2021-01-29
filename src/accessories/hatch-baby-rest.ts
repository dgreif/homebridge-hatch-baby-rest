import { HatchBabyRest } from '../hatch-baby-rest'
import { hap } from '../hap'
import { skip } from 'rxjs/operators'
import { Color } from '../rest-commands'
import { AudioTrack } from '../hatch-baby-types'
import {
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  Logging,
  CharacteristicValue,
} from 'homebridge'

export class HatchBabyRestAccessory {
  private hbr = new HatchBabyRest(
    this.config.name,
    this.config.macAddress,
    this.log
  )
  private service = this.config.showAsSwitch
    ? new hap.Service.Switch(this.config.name)
    : new hap.Service.Lightbulb(this.config.name)
  private accessoryInfoService = new hap.Service.AccessoryInformation()

  constructor(
    public log: Logging,
    public config: {
      name: string
      macAddress: string
      volume?: number
      audioTrack?: AudioTrack
      color?: Color
      showAsSwitch?: boolean
    }
  ) {
    const { Characteristic } = hap,
      hbr = this.hbr,
      powerCharacteristic = this.service.getCharacteristic(Characteristic.On),
      { volume, audioTrack, color } = config,
      audioSupplied = Boolean(audioTrack && volume)

    if (!audioSupplied && !color) {
      log.error('You must set color or volume and audioTrack')
      throw new Error('Incomplete Hatch Baby Rest Configuration')
    }

    powerCharacteristic.on(
      CharacteristicEventTypes.SET,
      async (
        value: CharacteristicValue,
        callback: CharacteristicSetCallback
      ) => {
        callback()

        log.info(`Turning ${value ? 'on' : 'off'}`)
        await hbr.setPower(Boolean(value))

        if (!value) {
          // no need to set other values since it's off
          return
        }

        if (volume) {
          await hbr.setVolume(volume)
        }

        if (audioTrack) {
          await hbr.setAudioTrack(audioTrack)
        }

        if (color) {
          await hbr.setColor(color)
        }
      }
    )

    hbr.onPower.subscribe((power: boolean) => {
      powerCharacteristic.updateValue(power)
    })

    hbr.onPower.pipe(skip(1)).subscribe((power: boolean) => {
      log.info(`Turned ${power ? 'on' : 'off'}`)
    })

    this.accessoryInfoService
      .getCharacteristic(Characteristic.Manufacturer)
      .updateValue('Hatch Baby')
    this.accessoryInfoService
      .getCharacteristic(Characteristic.Model)
      .updateValue('Rest')
    this.accessoryInfoService
      .getCharacteristic(Characteristic.SerialNumber)
      .updateValue(hbr.macAddress)
  }

  getServices() {
    return [this.service, this.accessoryInfoService]
  }
}
