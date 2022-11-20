import 'dotenv/config'
import { HatchBabyApi } from '../homebridge-hatch-baby-rest/api'

const { env } = process

async function example() {
  const api = new HatchBabyApi({
      email: env.HBR_EMAIL!,
      password: env.HBR_PASSWORD!,
    }),
    devices = await api.getDevices(),
    restore = devices.restores[0]

  restore.turnOnRoutine()
  setTimeout(() => restore.turnOff(), 4000)
}

example()
