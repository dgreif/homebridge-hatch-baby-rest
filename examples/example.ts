import 'dotenv/config'
import { Rest } from '../src/rest'
import { delay } from '../src/util'
import { RestColorAndBrightness } from '../src/rest-commands'
import { filter, take } from 'rxjs/operators'
import { colorsMatch } from '../src/feedback'
import { AudioTrack } from '../src/hatch-sleep-types'

async function example() {
  const macAddress = process.env.HBR_MAC_ADDRESS!,
    hbr = new Rest('Test Night Light', macAddress),
    waitForPower = (power: boolean) =>
      hbr.onIsPowered
        .pipe(
          filter((x) => x === power),
          take(1)
        )
        .toPromise(),
    waitForVolume = (volume: number) =>
      hbr.onVolume
        .pipe(
          filter((x) => x === volume),
          take(1)
        )
        .toPromise(),
    waitForAudioTrack = (audioTrack: number) =>
      hbr.onAudioTrack
        .pipe(
          filter((x) => x === audioTrack),
          take(1)
        )
        .toPromise(),
    waitForColor = (color: RestColorAndBrightness) =>
      hbr.onColor
        .pipe(
          filter((x) => colorsMatch(x, color)),
          take(1)
        )
        .toPromise()

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
