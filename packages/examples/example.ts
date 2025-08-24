import 'dotenv/config'
import { Rest } from '../homebridge-hatch-rest-bluetooth/rest.ts'
import { delay } from '../shared/util.ts'
import { RestColorAndBrightness } from '../shared/rest-commands.ts'
import { filter } from 'rxjs/operators'
import { colorsMatch } from '../homebridge-hatch-rest-bluetooth/feedback.ts'
import { AudioTrack } from '../shared/hatch-sleep-types.ts'
import { firstValueFrom } from 'rxjs'

async function example() {
  const macAddress = process.env.HBR_MAC_ADDRESS!,
    hbr = new Rest('Test Night Light', macAddress),
    waitForPower = (power: boolean) =>
      firstValueFrom(hbr.onIsPowered.pipe(filter((x) => x === power))),
    waitForVolume = (volume: number) =>
      firstValueFrom(hbr.onVolume.pipe(filter((x) => x === volume))),
    waitForAudioTrack = (audioTrack: number) =>
      firstValueFrom(hbr.onAudioTrack.pipe(filter((x) => x === audioTrack))),
    waitForColor = (color: RestColorAndBrightness) =>
      firstValueFrom(hbr.onColor.pipe(filter((x) => colorsMatch(x, color))))

  console.log('Connecting to Hatch Baby Rest with mac address', macAddress)

  await hbr.setPower(true)
  await hbr.setAudioTrack(AudioTrack.Crickets)
  await hbr.setVolume(50)
  await hbr.setColorAndBrightness({ r: 0, g: 255, b: 0, a: 200 })

  await waitForPower(true)
  await waitForAudioTrack(AudioTrack.Crickets)
  await waitForVolume(50)
  await waitForColor({ r: 0, g: 255, b: 0, a: 200 })
  await delay(1000)

  await hbr.setAudioTrack(AudioTrack.Rain)
  await hbr.setVolume(80)
  await hbr.setColorAndBrightness({ r: 0, g: 0, b: 255, a: 200 })

  await waitForAudioTrack(AudioTrack.Rain)
  await waitForVolume(80)
  await waitForColor({ r: 0, g: 0, b: 255, a: 200 })
  await delay(1000)

  await hbr.setAudioTrack(AudioTrack.PinkNoise)
  await hbr.setVolume(30)
  await hbr.setColorAndBrightness({ r: 255, g: 0, b: 0, a: 50 })

  await waitForAudioTrack(AudioTrack.PinkNoise)
  await waitForVolume(30)
  await waitForColor({ r: 255, g: 0, b: 0, a: 50 })
  await delay(1000)

  await hbr.setAudioTrack(AudioTrack.RockABye)
  await hbr.setVolume(40)
  await hbr.setColorAndBrightness({ r: 254, g: 254, b: 254, a: 150 })

  await waitForAudioTrack(AudioTrack.RockABye)
  await waitForVolume(40)
  await waitForColor({ r: 254, g: 254, b: 254, a: 150 })
  await delay(1000)

  await hbr.setPower(false)
  await waitForPower(true)
  await delay(1000)

  await hbr.disconnect()
  process.exit(0)
}

example()
