import 'dotenv/config'
import { HatchBabyApi } from '../src/api'

const { env } = process

async function example() {
  const api = new HatchBabyApi({
      email: env.HBR_EMAIL!,
      password: env.HBR_PASSWORD!,
    }),
    devices = await api.getDevices(),
    riot = devices.restIots[0]

  await riot.turnOnRoutine()
  setTimeout(() => riot.turnOff(), 4000)
}

example()
