import { hap, isTestHomebridge } from './hap.ts'
import { distinctUntilChanged } from 'rxjs/operators'
import { Observable, of } from 'rxjs'
import type {
  Characteristic as CharacteristicClass,
  CharacteristicSetCallback,
  CharacteristicValue,
  PlatformAccessory,
  Service as ServiceClass,
  WithUUID,
} from 'homebridge'

export interface BaseDevice {
  name: string
  macAddress: string
  model: string
  onFirmwareVersion?: Observable<string>
}

export class BaseAccessory {
  private device
  protected accessory

  constructor(device: BaseDevice, accessory: PlatformAccessory) {
    this.device = device
    this.accessory = accessory

    const { Service, Characteristic } = hap,
      accessoryInfoService = this.getService(Service.AccessoryInformation)

    accessoryInfoService
      .getCharacteristic(Characteristic.Manufacturer)
      .updateValue('Hatch Baby')
    accessoryInfoService
      .getCharacteristic(Characteristic.Model)
      .updateValue(device.model)
    accessoryInfoService
      .getCharacteristic(Characteristic.SerialNumber)
      .updateValue(device.macAddress)

    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.FirmwareRevision),
      device.onFirmwareVersion || of(''),
    )
    this.registerCharacteristic(
      accessoryInfoService.getCharacteristic(Characteristic.Name),
      of(device.name),
    )
  }

  getService(
    serviceType: WithUUID<typeof ServiceClass>,
    nameSuffix?: string,
    subType?: string,
  ) {
    let name = nameSuffix
      ? this.device.name + ' ' + nameSuffix
      : this.device.name

    if (isTestHomebridge) {
      name = 'TEST ' + name
    }

    const existingService = this.accessory.getService(serviceType)
    return (
      existingService || this.accessory.addService(serviceType, name, subType!)
    )
  }

  registerCharacteristic(
    characteristic: CharacteristicClass,
    onValue: Observable<any>,
    setValue?: (value: any) => any,
  ) {
    if (setValue) {
      characteristic.on(
        'set',
        (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
          callback()
          setValue(value)
        },
      )
    }

    onValue.pipe(distinctUntilChanged()).subscribe((value) => {
      characteristic.updateValue(value)
    })
  }
}
