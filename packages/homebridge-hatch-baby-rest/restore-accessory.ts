import { PlatformAccessory } from 'homebridge'
import { BaseAccessory } from '../shared/base-accessory'
import { hap } from '../shared/hap'
import { RestIot } from './rest-iot'
import { Restore } from './restore'

export class RestoreAccessory extends BaseAccessory {
  constructor(restore: Restore | RestIot, accessory: PlatformAccessory) {
    super(restore, accessory)

    const { Service, Characteristic } = hap
  }
}
