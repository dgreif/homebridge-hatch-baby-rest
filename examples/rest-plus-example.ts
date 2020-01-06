import 'dotenv/config'
import { HatchBabyApi } from '../src/api'

const { env } = process

async function example() {
  const api = new HatchBabyApi({
      email: env.HBR_EMAIL!,
      password: env.HBR_PASSWORD!
    }),
    restPlusLights = await api.getRestPlusLights(),
    light = restPlusLights[0]

  light.onBrightness.subscribe(i => console.log('Brightness', i))
  light.onVolume.subscribe(i => console.log('Volume', i))
  light.onIsPowered.subscribe(i => console.log('Is Powered', i))
  light.onAudioTrack.subscribe(i => console.log('Audio Track', i))
  light.onBatteryLevel.subscribe(i => console.log('Battery', i))
}

example()
