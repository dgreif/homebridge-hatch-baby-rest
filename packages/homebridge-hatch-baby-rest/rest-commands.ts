import { RgbColor } from './hatch-sleep-types'

// eslint-disable-next-line no-shadow
export const enum RestCommand {
  SetPower = 'SI',
  SetColor = 'SC',
  SetTrackNumber = 'SN',
  SetVolume = 'SV',
}

export interface RestColorAndBrightness extends RgbColor {
  a: number
}

export type RestCommandValue = number | RestColorAndBrightness

function zeroPaddedHex(value: number) {
  let hex = value.toString(16)

  while (hex.length < 2) {
    hex = '0' + hex
  }

  return hex.toUpperCase()
}

export function formatRestCommand(
  command: RestCommand,
  value: RestCommandValue
) {
  if (typeof value === 'number') {
    return Buffer.from(`${command}${zeroPaddedHex(value)}`)
  }

  return Buffer.from(
    command +
      zeroPaddedHex(value.r) +
      zeroPaddedHex(value.g) +
      zeroPaddedHex(value.b) +
      zeroPaddedHex(value.a)
  )
}
